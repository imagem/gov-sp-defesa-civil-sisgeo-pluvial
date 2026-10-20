import { create } from "zustand";
import type { Alerta } from "@/dominio/tipos";
import { CENARIOS } from "@/simulacao/cenarios";
import { Motor } from "@/simulacao/motor";
import type { Evento } from "@/simulacao/barramento";
import { CAMADAS_IDS, visibilidadePadrao, type CamadaId } from "@/mapa/visibilidade";
import { buscarRotaOsrm } from "@/mapa/roteamento";
import { alternarEstadoAtivo, estadosIniciaisAtivos } from "./gemeo";

export type Pagina = "operacional" | "agentes" | "alertas";

export type BasemapId =
  | "osm"
  | "satellite"
  | "topo-vector"
  | "gray-vector"
  | "dark-gray-vector";

export const OPERADOR_DEMO = "Renata Vasques";
export const OPERADOR_CARGO = "Coordenadora de Plantão";
export const OPERADOR_CODINOME = "SENTINELA-1";

export const VELOCIDADES = [
  { rotulo: "1x", msPorTick: 2000 },
  { rotulo: "4x", msPorTick: 500 },
  { rotulo: "12x", msPorTick: 160 },
] as const;

function motorDoCenario(cenarioId: string): Motor {
  const cenario = CENARIOS.find((c) => c.id === cenarioId) ?? CENARIOS[0];
  if (!cenario) throw new Error("nenhum cenario disponivel");
  return new Motor(cenario);
}

interface EstadoLoja {
  motor: Motor;
  cenarioId: string;
  rodando: boolean;
  velocidadeIndice: number;
  /** Contador de mudanca: o motor e mutavel, entao o React observa este numero. */
  versao: number;
  boletimAberto: string | null;
  /** Alerta aberto no modal de dossie, ou null quando o modal esta fechado. */
  dossieAlertaAberto: string | null;
  /**
   * Resultado de autenticarNoPortal() (mapa/portal.ts). `undefined` enquanto
   * a verificacao ainda nao terminou (ou o modo Enterprise esta desligado).
   * Existe aqui, e nao como estado local do componente do mapa, porque quem
   * renderiza a descricao do modo (Cabecalho.tsx) e quem chama a
   * autenticacao (MapaSalaSituacao.tsx) sao componentes irmaos.
   */
  portalAutenticado: boolean | undefined;
  /**
   * Estado operacional what-if de cada ativo (gemeo digital, RF-TWN): comporta
   * aberta/fechada, EBAP operante/desligada. E simulacao — nao afeta o motor de
   * alerta nem expede nada; alimenta apenas a visao do gemeo digital.
   */
  estadosAtivos: Record<string, string>;
  /** Pagina ativa na sala de situacao. */
  pagina: Pagina;
  /** Modo tecnico habilitado. */
  modoTecnico: boolean;
  /** Visibilidade de cada camada do mapa (controles flutuantes). */
  camadasVisiveis: Record<CamadaId, boolean>;
  /** Basemap ativo. Persiste ao trocar de cenario/reiniciar. */
  basemapId: BasemapId;
  /**
   * Ativo do gemeo digital sob o cursor no painel. O mapa realca as zonas que
   * aquele ativo afeta — e assim o operador ve ONDE a decisao bate, nao so
   * quantas pessoas ela move.
   */
  ativoDestacado: string | null;

  passo(): void;
  alternarExecucao(): void;
  definirVelocidade(indice: number): void;
  trocarCenario(id: string): void;
  reiniciar(): void;
  definirPortalAutenticado(valor: boolean): void;
  abrirBoletim(id: string | null): void;
  abrirDossieAlerta(id: string | null): void;
  validarAlerta(alertaId: string): void;
  descartarAlerta(alertaId: string, motivo: string): void;
  aprovarBoletim(boletimId: string, texto: string): void;
  alternarAtivo(ativoId: string): void;
  /** Aplica de uma vez um conjunto de estados (usado pela melhor combinacao). */
  aplicarEstadosAtivos(estados: Record<string, string>): void;
  destacarAtivo(ativoId: string | null): void;
  /**
   * Acao humana: despacha um especialista de campo para a estacao. Devolve
   * false quando o plantao de campo esta todo ocupado ou a estacao ja tem
   * equipe a caminho — a UI precisa dizer isso ao operador.
   */
  despacharEquipe(estacaoId: string): boolean;
  resetGemeo(): void;
  irPara(p: Pagina): void;
  alternarModoTecnico(): void;
  alternarCamada(id: CamadaId): void;
  /** Liga ou desliga TODAS as camadas de uma vez (atalho do seletor). */
  definirCamadas(visiveis: boolean): void;
  definirBasemap(id: BasemapId): void;
}

const motorInicial = motorDoCenario("calmaria");

export const useSimulacao = create<EstadoLoja>((set, get) => ({
  motor: motorInicial,
  cenarioId: "calmaria",
  rodando: false,
  velocidadeIndice: 1,
  versao: 0,
  boletimAberto: null,
  dossieAlertaAberto: null,
  portalAutenticado: undefined,
  estadosAtivos: estadosIniciaisAtivos(motorInicial.mundo.ativos),
  pagina: "operacional",
  modoTecnico: false,
  camadasVisiveis: visibilidadePadrao(),
  // Mapa base escuro por padrao, para casar com o tema escuro padrao da
  // sala (ver estado/tema.ts) e com o plantao noturno.
  basemapId: "dark-gray-vector",
  ativoDestacado: null,

  passo() {
    get().motor.tick();
    set((s) => ({ versao: s.versao + 1 }));
  },

  alternarExecucao() {
    set((s) => ({ rodando: !s.rodando }));
  },

  definirVelocidade(indice) {
    set({ velocidadeIndice: indice });
  },

  trocarCenario(id) {
    const motor = motorDoCenario(id);
    set({
      motor,
      cenarioId: id,
      versao: 0,
      boletimAberto: null,
      dossieAlertaAberto: null,
      estadosAtivos: estadosIniciaisAtivos(motor.mundo.ativos),
      camadasVisiveis: visibilidadePadrao(),
    });
  },

  reiniciar() {
    const motor = motorDoCenario("calmaria");
    set({
      motor,
      cenarioId: "calmaria",
      rodando: false,
      velocidadeIndice: 1,
      versao: 0,
      boletimAberto: null,
      dossieAlertaAberto: null,
      estadosAtivos: estadosIniciaisAtivos(motor.mundo.ativos),
      camadasVisiveis: visibilidadePadrao(),
    });
  },

  definirPortalAutenticado(valor) {
    set({ portalAutenticado: valor });
  },

  abrirBoletim(id) {
    set({ boletimAberto: id });
  },

  abrirDossieAlerta(id) {
    set({ dossieAlertaAberto: id });
  },

  validarAlerta(alertaId) {
    get().motor.validarAlerta(alertaId, OPERADOR_DEMO);
    set((s) => ({ versao: s.versao + 1 }));
  },

  descartarAlerta(alertaId, motivo) {
    get().motor.descartarAlerta(alertaId, motivo);
    set((s) => ({ versao: s.versao + 1 }));
  },

  aprovarBoletim(boletimId, texto) {
    get().motor.aprovarBoletim(boletimId, OPERADOR_DEMO, texto);
    set((s) => ({ versao: s.versao + 1, boletimAberto: null }));
  },

  alternarAtivo(ativoId) {
    const { motor, estadosAtivos } = get();
    const ativo = motor.mundo.ativos.find((a) => a.ativoId === ativoId);
    if (!ativo) return;
    const proximo = alternarEstadoAtivo(ativo, estadosAtivos[ativoId] ?? "aberta");
    set((s) => ({
      estadosAtivos: { ...s.estadosAtivos, [ativoId]: proximo },
      versao: s.versao + 1,
    }));
  },

  despacharEquipe(estacaoId) {
    const motor = get().motor;
    const despacho = motor.despacharEquipe(estacaoId);
    set((s) => ({ versao: s.versao + 1 }));

    // Fire-and-forget: tenta trocar a rota em L por uma rota real de ruas
    // via OSRM. Falhas (sem rede, timeout, CORS) sao engolidas; a demo
    // segue com a rota ja desenhada. So aplica se o despacho ainda esta
    // em "preparando" quando a resposta chegar — ver atualizarRotaDespacho.
    if (despacho) {
      void buscarRotaOsrm(despacho.origem, despacho.destino).then((pontos) => {
        if (!pontos) return;
        if (motor !== get().motor) return; // cenario trocou, descarta
        if (motor.atualizarRotaDespacho(despacho.despachoId, pontos)) {
          set((s) => ({ versao: s.versao + 1 }));
        }
      });
    }

    return despacho !== null;
  },

  aplicarEstadosAtivos(estados) {
    set((s) => ({ estadosAtivos: { ...estados }, versao: s.versao + 1 }));
  },

  destacarAtivo(ativoId) {
    set({ ativoDestacado: ativoId });
  },

  resetGemeo() {
    set((s) => ({
      estadosAtivos: estadosIniciaisAtivos(s.motor.mundo.ativos),
      ativoDestacado: null,
      versao: s.versao + 1,
    }));
  },

  irPara(p) {
    set({ pagina: p });
  },

  alternarModoTecnico() {
    set((s) => ({ modoTecnico: !s.modoTecnico }));
  },

  alternarCamada(id) {
    set((s) => ({
      camadasVisiveis: { ...s.camadasVisiveis, [id]: !s.camadasVisiveis[id] },
      versao: s.versao + 1,
    }));
  },

  definirCamadas(visiveis) {
    const todas = Object.fromEntries(
      CAMADAS_IDS.map((id) => [id, visiveis]),
    ) as Record<CamadaId, boolean>;
    set((s) => ({ camadasVisiveis: todas, versao: s.versao + 1 }));
  },

  definirBasemap(id) {
    set({ basemapId: id });
  },
}));

export interface Kpis {
  readonly leadTimeMedioH: number | null;
  readonly estacoesOperantes: number;
  readonly estacoesTotal: number;
  readonly percentualOperante: number;
  readonly alertasAtivos: number;
  readonly alertasAguardandoValidacao: number;
  readonly cotaPrevistaM: number;
  readonly populacaoExposta: number;
  /**
   * Como populacaoExposta foi calculada — vem de ExposicaoCalculada.metodoEstimativa
   * (dominio/mancha.ts). A demo soma a populacao TOTAL de cada zona que a
   * mancha apenas toca, nao a populacao dentro da area de fato interceptada;
   * a tela precisa dizer isso, nao so o numero.
   */
  readonly metodoPopulacaoExposta: string | null;
  readonly leiturasReprovadas: number;
}

export function selecionarKpis(s: EstadoLoja): Kpis {
  const e = s.motor.estado;
  const operantes = e.estacoes.filter((x) => x.situacao === "operante").length;
  const preditivos = e.alertas.filter((a) => a.leadTimeHoras !== null);
  const somaLead = preditivos.reduce((t, a) => t + (a.leadTimeHoras ?? 0), 0);

  return {
    leadTimeMedioH: preditivos.length > 0 ? somaLead / preditivos.length : null,
    estacoesOperantes: operantes,
    estacoesTotal: e.estacoes.length,
    percentualOperante:
      e.estacoes.length === 0 ? 0 : Math.round((operantes / e.estacoes.length) * 100),
    alertasAtivos: e.alertas.filter((a) => a.estado === "expedido" || a.estado === "atualizado")
      .length,
    alertasAguardandoValidacao: e.alertas.filter((a) => a.estado === "candidato").length,
    cotaPrevistaM: e.cotaPrevistaM,
    populacaoExposta: e.exposicao.reduce((t, x) => t + x.populacaoEstimada, 0),
    metodoPopulacaoExposta: e.exposicao[0]?.metodoEstimativa ?? null,
    // Contador cumulativo, nao filtro sobre o array: observacoes e podado
    // periodicamente pelo motor (ver Motor.podarObservacoes), entao filtrar
    // o array atual subestimaria o total assim que a poda comecasse a agir.
    leiturasReprovadas: e.leiturasReprovadasTotal,
  };
}

export function selecionarAlertasAtivos(s: EstadoLoja): Alerta[] {
  const ordem: Record<Alerta["estado"], number> = {
    candidato: 0,
    validado: 1,
    expedido: 2,
    atualizado: 3,
    encerrado: 4,
    descartado: 5,
  };
  return [...s.motor.estado.alertas].sort((a, b) => ordem[a.estado] - ordem[b.estado]);
}

export function selecionarEventosRecentes(s: EstadoLoja, quantidade: number): Evento[] {
  const historico = s.motor.barramento.historico();
  return historico.slice(Math.max(0, historico.length - quantidade)).reverse();
}
