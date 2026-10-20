import { criarEnxame } from "@/agentes/registro";
import {
  criarEstadoInicial,
  type Agente,
  type ContextoAgente,
  type EstadoSimulacao,
} from "@/agentes/tipos";
import { descartar, validar } from "@/dominio/alerta";
import {
  avancarDespacho,
  criarDespacho,
  escolherEspecialista,
  estimarDeslocamentoMin,
  minutosRestantes,
  substituirRota,
} from "@/dominio/despacho";
import type { Coordenada } from "@/dominio/geometria";
import { resolverPrevisoes } from "@/dominio/desempenho";
import { exposicaoPorMancha, mancharPorCota } from "@/dominio/mancha";
import { criarAleatorio, type Aleatorio } from "@/dominio/prng";
import { RelogioSimulado } from "@/dominio/relogio";
import { construirRedeInfluencia, type RedeInfluencia } from "@/dominio/twin";
import { Barramento, type TipoEvento } from "./barramento";
import { criarMundo, type Mundo } from "./mundo";
import type { Cenario } from "./cenarios";

const MINUTOS_POR_TICK = 10;

/**
 * Retencao de observacoes. A maior janela usada por qualquer limiar ou pelo
 * agente hidrologico e de 6 h (ver mundo.ts e agenteHidrologico.ts) — 8 h da
 * uma margem de seguranca de 2 h sem custar memoria relevante.
 */
const RETENCAO_OBSERVACOES_HORAS = 8;

/** Ganho de nivel por mm/h de chuva, por minuto de tick. Parametro sintetico. */
const COEFICIENTE_CHUVA = 0.00032;
/** Fracao do nivel atual escoada a cada tick — impede divergencia sem chuva. */
const COEFICIENTE_ESCOAMENTO = 0.025;

/** Horizonte (h) da previsao usada para medir a acuracia do modelo. */
const HORIZONTE_DESEMPENHO_H = 6;

export class Motor {
  readonly cenario: Cenario;
  readonly mundo: Mundo;
  readonly relogio: RelogioSimulado;
  readonly barramento = new Barramento();
  readonly agentes: Agente[] = criarEnxame();
  readonly estado: EstadoSimulacao;
  /** Rede de influencia do gemeo digital (RF-TWN), derivada do mundo. */
  readonly rede: RedeInfluencia;

  private readonly aleatorio: Aleatorio;
  private readonly ctx: ContextoAgente;
  private minutosDecorridos = 0;
  private sequenciaEvento = 0;

  constructor(cenario: Cenario) {
    this.cenario = cenario;
    this.mundo = criarMundo(cenario.semente, cenario.regiao);
    this.rede = construirRedeInfluencia(this.mundo.zonas, this.mundo.ativos);
    this.relogio = new RelogioSimulado(new Date(cenario.inicioIso));
    this.aleatorio = criarAleatorio(cenario.semente);
    this.estado = criarEstadoInicial(cenario.nivelInicialM);
    this.estado.estacoes = this.mundo.estacoes.map((e) => ({ ...e }));

    this.ctx = {
      relogio: this.relogio,
      barramento: this.barramento,
      mundo: this.mundo,
      estado: this.estado,
      aleatorio: this.aleatorio,
      publicar: (agenteId, tipo, titulo, carga, correlacaoId) => this.publicar(agenteId, tipo, titulo, carga, correlacaoId),
    };

    this.publicar("motor", "cenario.iniciado", `Cenário "${cenario.nome}" iniciado`, {
      cenarioId: cenario.id,
      semente: cenario.semente,
    });
  }

  private publicar(
    agenteId: string,
    tipo: TipoEvento,
    titulo: string,
    carga: unknown,
    correlacaoId?: string,
  ): void {
    this.barramento.publicar({
      eventoId: `ev-${++this.sequenciaEvento}`,
      tipo,
      agenteId,
      ts: this.relogio.iso,
      titulo,
      carga,
      ...(correlacaoId ? { correlacaoId } : {}),
    });
  }

  /** Um passo da simulacao: avanca o relogio, atualiza o tempo e roda o enxame. */
  tick(): void {
    this.relogio.avancarMinutos(MINUTOS_POR_TICK);
    this.minutosDecorridos += MINUTOS_POR_TICK;

    const horaDecorrida = this.minutosDecorridos / 60;
    this.estado.intensidadeChuvaMmH = this.cenario.perfilChuva(horaDecorrida);

    // Resposta simplificada do nivel a chuva corrente, para alimentar a ingestao.
    // O escoamento e proporcional ao nivel, entao a serie sobe rapido sob chuva
    // e converge para um patamar plausivel em vez de divergir sem limite.
    const ganho = this.estado.intensidadeChuvaMmH * COEFICIENTE_CHUVA * MINUTOS_POR_TICK;
    const escoamento = this.estado.nivelAtualM * COEFICIENTE_ESCOAMENTO;
    this.estado.nivelAtualM = Math.max(0.5, this.estado.nivelAtualM + ganho - escoamento);

    this.aplicarPerturbacoesDoCenario();

    for (const agente of this.agentes) {
      try {
        agente.aoTick(this.ctx);
      } catch (erro) {
        // RNF-06: um agente com defeito nao derruba a simulacao.
        agente.status = "falha";
        console.error(`[motor] agente ${agente.id} falhou:`, erro);
      }
    }

    this.avancarDespachos();
    this.acumularDesempenho();
    this.podarObservacoes();
  }

  /**
   * Avanca os despachos de campo abertos. Roda DEPOIS do enxame: quando uma
   * equipe conclui o atendimento, a estacao volta a transmitir neste mesmo
   * tick, e o agente de rede so reavalia no tick seguinte — sem isso ele
   * marcaria a estacao como silenciosa de novo no instante do conserto.
   */
  private avancarDespachos(): void {
    const ts = this.relogio.iso;

    this.estado.despachos = this.estado.despachos.map((anterior) => {
      if (anterior.estado === "concluido") return anterior;

      const atual = avancarDespacho(anterior, MINUTOS_POR_TICK);

      if (anterior.estado === "a_caminho" && atual.estado !== "a_caminho") {
        this.publicar(
          "operador",
          "equipe.chegou",
          `${atual.especialista} (${atual.equipe}) chegou à estação ${atual.estacaoId} — ${minutosRestantes(atual)} min estimados de atendimento`,
          { despachoId: atual.despachoId, estacaoId: atual.estacaoId },
          atual.despachoId,
        );
      }

      if (atual.estado === "concluido") {
        this.restabelecerEstacao(atual.estacaoId, ts);
        this.publicar(
          "operador",
          "equipe.concluiu",
          `${atual.especialista} (${atual.equipe}) concluiu o atendimento: estação ${atual.estacaoId} voltou a transmitir`,
          { despachoId: atual.despachoId, estacaoId: atual.estacaoId },
          atual.despachoId,
        );
      }

      return atual;
    });
  }

  /**
   * Devolve a estacao a operacao apos o atendimento em campo. Alem da
   * situacao, zera o atraso (ultimaLeituraTs) e tira a estacao da lista de
   * incomunicaveis do cenario — senao a ingestao continuaria pulando a
   * estacao e o agente de rede a re-silenciaria no proximo tick.
   */
  private restabelecerEstacao(estacaoId: string, ts: string): void {
    const estacao = this.estado.estacoes.find((e) => e.estacaoId === estacaoId);
    if (!estacao) return;
    estacao.situacao = "operante";
    estacao.ultimaLeituraTs = ts;
    this.estado.estacoesSemComunicacao = this.estado.estacoesSemComunicacao.filter(
      (id) => id !== estacaoId,
    );
  }

  /**
   * Acao humana: despacha um especialista de campo para uma estacao com
   * problema. Devolve o despacho criado, ou null quando todo o plantao de
   * campo ja esta em atendimento ou a estacao ja tem equipe a caminho.
   */
  despacharEquipe(estacaoId: string) {
    const estacao = this.estado.estacoes.find((e) => e.estacaoId === estacaoId);
    if (!estacao) throw new Error(`estação ${estacaoId} não encontrada`);

    const abertos = this.estado.despachos.filter((d) => d.estado !== "concluido");
    if (abertos.some((d) => d.estacaoId === estacaoId)) return null;

    const especialista = escolherEspecialista(abertos);
    if (!especialista) return null;

    const despacho = criarDespacho({
      despachoId: `D-${String(this.estado.despachos.length + 1).padStart(3, "0")}`,
      estacaoId,
      estacaoNome: estacao.nome,
      especialista: especialista.nome,
      equipe: especialista.equipe,
      motivo: estacao.situacao,
      origem: this.mundo.centro,
      destino: estacao.posicao,
      tsDespacho: this.relogio.iso,
    });

    this.estado.despachos.push(despacho);
    this.publicar(
      "operador",
      "equipe.despachada",
      `${despacho.especialista} (${despacho.equipe}) despachado para a estação ${estacaoId} (${estacao.nome}) — previsão de ${minutosRestantes(despacho)} min`,
      {
        despachoId: despacho.despachoId,
        estacaoId,
        especialista: despacho.especialista,
        etaMinutos: minutosRestantes(despacho),
      },
      despacho.despachoId,
    );

    return despacho;
  }

  /**
   * Acumula as amostras de desempenho do tick (RF-MOD-03 e RF-ALT-06). Roda
   * depois dos agentes, com previsoes, exposicao e alertas ja atualizados.
   * Todos os numeros sao sinteticos, derivados da propria simulacao.
   */
  private acumularDesempenho(): void {
    const e = this.estado;
    const ts = this.relogio.iso;

    // Modelo: resolve as previsoes cujo instante-alvo chegou, pareando com o
    // nivel realizado agora, e agenda a previsao de HORIZONTE_DESEMPENHO_H desta
    // rodada para pareamento futuro.
    const { pares, pendentesRestantes } = resolverPrevisoes(e.previsoesPendentes, ts, e.nivelAtualM);
    e.previsoesPendentes = pendentesRestantes;
    for (const par of pares) {
      e.serieNivelPrevisto.push(par.previsto);
      e.serieNivelRealizado.push(par.realizado);
    }
    const previsao = e.previsoes.find((p) => p.horizonteHoras === HORIZONTE_DESEMPENHO_H);
    if (previsao) {
      const alvoIso = new Date(
        new Date(ts).getTime() + HORIZONTE_DESEMPENHO_H * 3_600_000,
      ).toISOString();
      e.previsoesPendentes.push({ alvoIso, nivelPrevistoM: previsao.nivelPrevistoM });
    }

    // Alerta: zonas que o sistema alertou (previsao) x zonas que a mancha
    // REALIZADA (do nivel observado) de fato interceptou.
    for (const alerta of e.alertas) {
      if (alerta.estado !== "descartado" && !e.zonasAlertadasHist.includes(alerta.zonaId)) {
        e.zonasAlertadasHist.push(alerta.zonaId);
      }
    }
    const manchaReal = mancharPorCota(this.mundo.corredor, e.nivelAtualM, this.mundo.cotaBaseM);
    for (const exp of exposicaoPorMancha(manchaReal, this.mundo.zonas)) {
      if (!e.zonasInundadasHist.includes(exp.zonaId)) e.zonasInundadasHist.push(exp.zonaId);
    }
  }

  /**
   * Remove observacoes mais velhas que a janela de retencao. `observacoes`
   * cresce indefinidamente (append-only) e varios agentes varrem o array
   * inteiro por tick (acumular, avaliarQualidade, o KPI de leituras
   * reprovadas) — sem poda, o custo por tick cresce sem limite e degrada a
   * apresentacao em poucos minutos em velocidade alta.
   *
   * Roda no FIM do tick, depois de todo agente ja ter lido o array com os
   * dados do tick atual — nenhum agente perde dado que ainda precisa.
   * As observacoes ficam em ordem nao decrescente de tsOrigem (sempre
   * anexadas com o relogio atual), entao um corte de prefixo basta.
   *
   * O cursor do agente de qualidade e um indice local nesse mesmo array;
   * ao remover `k` do inicio, decrescemos o cursor em `k` para que continue
   * apontando para a mesma posicao logica.
   */
  private podarObservacoes(): void {
    const corte = new Date(this.relogio.iso).getTime() - RETENCAO_OBSERVACOES_HORAS * 3_600_000;
    const obs = this.estado.observacoes;

    let removidas = 0;
    while (removidas < obs.length) {
      const leitura = obs[removidas];
      if (!leitura || new Date(leitura.tsOrigem).getTime() >= corte) break;
      removidas++;
    }
    if (removidas === 0) return;

    obs.splice(0, removidas);
    this.estado.qualidadeCursor = Math.max(0, this.estado.qualidadeCursor - removidas);
  }

  private aplicarPerturbacoesDoCenario(): void {
    const { falhaEstacaoNoMinuto, leituraAbsurdaNoMinuto } = this.cenario;

    if (falhaEstacaoNoMinuto !== undefined && this.minutosDecorridos === falhaEstacaoNoMinuto) {
      const afetadas = this.estado.estacoes.slice(0, 5).map((e) => e.estacaoId);
      this.estado.estacoesSemComunicacao.push(...afetadas);
      this.publicar(
        "motor",
        "estacao.silenciosa",
        "Falha de comunicação derrubou 5 estações do cenário",
        { quantidade: afetadas.length },
      );
    }

    if (leituraAbsurdaNoMinuto !== undefined && this.minutosDecorridos === leituraAbsurdaNoMinuto) {
      const estacao = this.estado.estacoes[0];
      if (estacao) {
        this.estado.observacoes.push({
          observacaoId: `obs-${this.estado.contador++}`,
          estacaoId: estacao.estacaoId,
          fonteId: estacao.fonteId,
          variavel: "chuva_mm",
          valor: 2000,
          unidade: "mm",
          tsOrigem: this.relogio.iso,
          tsIngestao: this.relogio.iso,
          qualidade: "aprovada",
        });
      }
    }
  }

  /**
   * Troca a geometria da rota de um despacho (ex.: resposta assincrona de um
   * servico de rota real). So aceita quando o despacho ainda esta em
   * `preparando` — depois disso a viatura ja saiu, e substituir a rota faria
   * a animacao teleportar.
   *
   * Alem da geometria, recalcula o `deslocamentoMin` pela nova rota (uma rota
   * de ruas reais costuma ser mais longa que a rota em L semeada, e manter o
   * tempo faria a viatura aparentar velocidade de helicoptero). Como o
   * despacho ainda esta em `preparando`, o cronometro do operador nao foi
   * iniciado — a troca e segura.
   *
   * Devolve true se trocou, false se ignorou.
   */
  atualizarRotaDespacho(despachoId: string, pontos: readonly Coordenada[]): boolean {
    const indice = this.estado.despachos.findIndex((d) => d.despachoId === despachoId);
    const despacho = this.estado.despachos[indice];
    if (!despacho) return false;
    if (despacho.estado !== "preparando") return false;
    const comRota = substituirRota(despacho, pontos);
    this.estado.despachos[indice] = {
      ...comRota,
      deslocamentoMin: estimarDeslocamentoMin(comRota.rota),
    };
    return true;
  }

  /** Acao humana: valida um alerta candidato. Sem isso nada e expedido. */
  validarAlerta(alertaId: string, operador: string): void {
    const indice = this.estado.alertas.findIndex((a) => a.alertaId === alertaId);
    const alerta = this.estado.alertas[indice];
    if (!alerta) throw new Error(`alerta ${alertaId} não encontrado`);

    this.estado.alertas[indice] = validar(alerta, operador, this.relogio.iso);
    this.publicar(
      "operador",
      "alerta.validado",
      `Alerta ${alertaId} validado por ${operador}`,
      { alertaId, operador },
      alertaId,
    );
  }

  /** Acao humana: descarta um alerta candidato, com motivo obrigatorio. */
  descartarAlerta(alertaId: string, motivo: string): void {
    const indice = this.estado.alertas.findIndex((a) => a.alertaId === alertaId);
    const alerta = this.estado.alertas[indice];
    if (!alerta) throw new Error(`alerta ${alertaId} não encontrado`);

    this.estado.alertas[indice] = descartar(alerta, motivo, this.relogio.iso);
    this.publicar(
      "operador",
      "alerta.descartado",
      `Alerta ${alertaId} descartado: ${motivo}`,
      { alertaId, motivo },
      alertaId,
    );
  }

  /** Acao humana: aprova o boletim rascunhado pelo agente redator. */
  aprovarBoletim(boletimId: string, autor: string, textoFinal: string): void {
    const boletim = this.estado.boletins.find((b) => b.boletimId === boletimId);
    if (!boletim) throw new Error(`boletim ${boletimId} não encontrado`);

    boletim.textoAprovado = textoFinal;
    boletim.autorAprovacao = autor;
    boletim.tsAprovacao = this.relogio.iso;

    this.publicar(
      "operador",
      "boletim.aprovado",
      `Boletim ${boletimId} aprovado por ${autor}`,
      { boletimId, autor },
      boletim.alertaId,
    );
  }
}
