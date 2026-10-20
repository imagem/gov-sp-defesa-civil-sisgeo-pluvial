import type { AtivoProtecao, Limiar, ZonaRisco } from "@/dominio/tipos";
import { atingeLimiar } from "@/dominio/limiar";
import {
  cotaEfetivaPorZona,
  populacaoExpostaSobCota,
  type RedeInfluencia,
} from "@/dominio/twin";

/**
 * Visao do gemeo digital para o painel what-if (RF-TWN). Deriva o efeito
 * sistemico de operar os ativos (fechar comportas, ligar EBAPs) sobre a
 * populacao exposta. E simulacao — nao expede nada. Numeros SINTETICOS.
 */

export interface AtivoGemeo {
  readonly ativoId: string;
  readonly nome: string;
  readonly tipo: "comporta" | "ebap";
  readonly estado: string;
  /** false quando o ativo esta em manutencao/inoperante e nao pode ser operado. */
  readonly operavel: boolean;
}

export interface CotaZona {
  readonly zonaId: string;
  readonly nome: string;
  readonly cotaBase: number;
  readonly cotaEfetiva: number;
}

export interface GemeoDigital {
  readonly ativos: AtivoGemeo[];
  /** Populacao exposta na configuracao inicial dos ativos. */
  readonly populacaoBase: number;
  /** Populacao exposta com as acoes what-if do operador. */
  readonly populacaoWhatIf: number;
  /** Reducao de populacao exposta obtida pelas acoes (nunca negativa). */
  readonly populacaoProtegida: number;
  readonly cotas: CotaZona[];
}

function operavel(ativo: AtivoProtecao): boolean {
  return ativo.situacaoProntidao === "pronto";
}

/** Estado operacional inicial de cada ativo: comporta aberta, EBAP operante se pronta. */
export function estadosIniciaisAtivos(ativos: readonly AtivoProtecao[]): Record<string, string> {
  const estados: Record<string, string> = {};
  for (const ativo of ativos) {
    if (!operavel(ativo)) {
      estados[ativo.ativoId] = "manutencao";
    } else if (ativo.tipo === "comporta") {
      estados[ativo.ativoId] = "aberta";
    } else {
      estados[ativo.ativoId] = "operante";
    }
  }
  return estados;
}

/** Proximo estado ao alternar um ativo. Ativo em manutencao nao muda. */
export function alternarEstadoAtivo(ativo: AtivoProtecao, estadoAtual: string): string {
  if (!operavel(ativo)) return estadoAtual;
  if (ativo.tipo === "comporta") return estadoAtual === "fechada" ? "aberta" : "fechada";
  return estadoAtual === "operante" ? "desligada" : "operante";
}

export interface ParametrosGemeo {
  readonly rede: RedeInfluencia;
  readonly zonas: readonly ZonaRisco[];
  readonly limiares: readonly Limiar[];
  readonly ativos: readonly AtivoProtecao[];
  readonly cotaPrevistaM: number;
}

export function calcularGemeoDigital(
  params: ParametrosGemeo,
  estadosAtivos: Record<string, string>,
): GemeoDigital {
  const { rede, zonas, limiares, ativos, cotaPrevistaM } = params;

  const cotaBasePorZona = new Map(zonas.map((z) => [z.zonaId, cotaPrevistaM]));
  const estadosBase = estadosIniciaisAtivos(ativos);

  const efetivaBase = cotaEfetivaPorZona(rede, new Map(Object.entries(estadosBase)), cotaBasePorZona);
  const efetivaWhatIf = cotaEfetivaPorZona(
    rede,
    new Map(Object.entries(estadosAtivos)),
    cotaBasePorZona,
  );

  const populacaoBase = populacaoExpostaSobCota(zonas, limiares, efetivaBase);
  const populacaoWhatIf = populacaoExpostaSobCota(zonas, limiares, efetivaWhatIf);

  return {
    ativos: ativos
      .filter((a) => a.tipo === "comporta" || a.tipo === "ebap")
      .map((a) => ({
        ativoId: a.ativoId,
        nome: a.nome,
        tipo: a.tipo,
        estado: estadosAtivos[a.ativoId] ?? estadosBase[a.ativoId] ?? "aberta",
        operavel: operavel(a),
      })),
    populacaoBase,
    populacaoWhatIf,
    populacaoProtegida: Math.max(0, populacaoBase - populacaoWhatIf),
    cotas: zonas.map((z) => ({
      zonaId: z.zonaId,
      nome: z.nome,
      cotaBase: efetivaBase.get(z.zonaId) ?? cotaPrevistaM,
      cotaEfetiva: efetivaWhatIf.get(z.zonaId) ?? cotaPrevistaM,
    })),
  };
}

/**
 * Zonas expostas sob uma configuração de cota, não só o total. O painel
 * precisa NOMEAR quem é protegido e quem é represado — "1.840 pessoas" sem
 * dizer em qual bairro não sustenta uma decisão de operação.
 */
function zonasExpostas(
  zonas: readonly ZonaRisco[],
  limiares: readonly Limiar[],
  cotaPorZona: ReadonlyMap<string, number>,
): Set<string> {
  const expostas = new Set<string>();
  for (const zona of zonas) {
    const cota = cotaPorZona.get(zona.zonaId);
    if (cota === undefined) continue;
    const limiar = limiarDeCota(limiares, zona.zonaId);
    if (!limiar) continue;
    if (atingeLimiar(limiar, cota)) expostas.add(zona.zonaId);
  }
  return expostas;
}

function limiarDeCota(limiares: readonly Limiar[], zonaId: string): Limiar | undefined {
  return limiares.find((l) => l.zonaId === zonaId && l.variavel === "nivel_m");
}

/**
 * A que distancia do limiar uma zona ainda merece aparecer no painel.
 *
 * Mover a cota de uma zona que esta 2 m abaixo do limiar dela nao e
 * informacao util para o plantao — e ruido que esconde as zonas que de fato
 * estao perto de virar. Um metro e a folga que uma acao encadeada (dois
 * ativos sobre a mesma zona) consegue vencer.
 */
const PROXIMIDADE_RELEVANTE_M = 1;

function zonaMereceAtencao(
  limiares: readonly Limiar[],
  zonaId: string,
  cota: number,
): boolean {
  const limiar = limiarDeCota(limiares, zonaId);
  if (!limiar) return false;
  return cota >= limiar.valor - PROXIMIDADE_RELEVANTE_M;
}

/**
 * Quanto, somando todas as zonas expostas, a cota ainda está ACIMA do limiar.
 *
 * É a medida de progresso que a população exposta sozinha não dá: baixar a
 * cota de uma zona de 4,81 m para 4,01 m não tira ninguém da exposição se o
 * limiar dela é 3,20 m, mas aproxima — e dois ativos sobre a mesma zona
 * somam efeito. Sem olhar para esta folga, uma busca gulosa pára no primeiro
 * passo de saldo zero e nunca descobre a combinação que de fato protege.
 */
function folgaAcimaDoLimiar(
  zonas: readonly ZonaRisco[],
  limiares: readonly Limiar[],
  cotaPorZona: ReadonlyMap<string, number>,
): number {
  let total = 0;
  for (const zona of zonas) {
    const cota = cotaPorZona.get(zona.zonaId);
    const limiar = limiarDeCota(limiares, zona.zonaId);
    if (cota === undefined || !limiar) continue;
    if (cota >= limiar.valor) total += cota - limiar.valor;
  }
  return total;
}

export interface ZonaAfetada {
  readonly zonaId: string;
  readonly nome: string;
  readonly populacao: number;
  /** true quando a zona já tem alerta aberto — prioridade do plantão. */
  readonly sobAlerta: boolean;
}

/** Deslocamento de cota que a ação provoca numa zona, com e sem o limiar dela. */
export interface DeslocamentoCota {
  readonly zonaId: string;
  readonly nome: string;
  readonly cotaAntes: number;
  readonly cotaDepois: number;
  readonly limiar: number | null;
  readonly sobAlerta: boolean;
}

/**
 * O que acontece se o operador acionar ESTE ativo agora: quem sai da
 * exposição, quem entra nela por represamento, e o saldo entre os dois.
 */
export interface ImpactoAtivo {
  readonly ativoId: string;
  readonly nome: string;
  readonly tipo: "comporta" | "ebap";
  readonly estado: string;
  readonly operavel: boolean;
  /** Estado que a ação aplicaria (o rótulo do botão sai daqui). */
  readonly proximoEstado: string;
  readonly protegidas: readonly ZonaAfetada[];
  readonly expostas: readonly ZonaAfetada[];
  readonly populacaoProtegida: number;
  readonly populacaoExposta: number;
  /** Protegidos menos expostos. Negativo = a ação piora o quadro. */
  readonly saldo: number;
  /** true quando a ação mexe em alguma zona que já está sob alerta. */
  readonly tocaAlerta: boolean;
  /**
   * Cotas que a ação desloca, mesmo quando ninguém cruza o limiar. É o que
   * explica ao operador por que o saldo deu zero — e que insistir, somando
   * ativos sobre a mesma zona, ainda pode valer.
   */
  readonly deslocamentos: readonly DeslocamentoCota[];
}

function mapaZonas(zonas: readonly ZonaRisco[]): Map<string, ZonaRisco> {
  return new Map(zonas.map((z) => [z.zonaId, z]));
}

function descreverZonas(
  ids: Iterable<string>,
  porId: ReadonlyMap<string, ZonaRisco>,
  zonasAlertadas: ReadonlySet<string>,
): ZonaAfetada[] {
  const saida: ZonaAfetada[] = [];
  for (const zonaId of ids) {
    const zona = porId.get(zonaId);
    if (!zona) continue;
    saida.push({
      zonaId,
      nome: zona.nome,
      populacao: zona.populacaoEstimada,
      sobAlerta: zonasAlertadas.has(zonaId),
    });
  }
  return saida.sort((a, b) => b.populacao - a.populacao);
}

function somar(zonas: readonly ZonaAfetada[]): number {
  return zonas.reduce((t, z) => t + z.populacao, 0);
}

/** Cota por zona resultante de uma configuração de estados. */
function cotasDe(
  params: ParametrosGemeo,
  estados: Record<string, string>,
): Map<string, number> {
  const base = new Map(params.zonas.map((z) => [z.zonaId, params.cotaPrevistaM]));
  return cotaEfetivaPorZona(params.rede, new Map(Object.entries(estados)), base);
}

/**
 * Impacto de acionar cada ativo, um de cada vez, a partir do estado atual.
 * Ativo em manutenção entra na lista com saldo zero e `operavel: false` —
 * o operador precisa ver que ele existe e por que não pode ser usado.
 */
export function impactoPorAtivo(
  params: ParametrosGemeo,
  estadosAtivos: Record<string, string>,
  zonasAlertadas: ReadonlySet<string> = new Set(),
): ImpactoAtivo[] {
  const { zonas, limiares, ativos } = params;
  const porId = mapaZonas(zonas);

  const cotasAntes = cotasDe(params, estadosAtivos);
  const atual = zonasExpostas(zonas, limiares, cotasAntes);

  return ativos
    .filter((a) => a.tipo === "comporta" || a.tipo === "ebap")
    .map((ativo) => {
      const estado = estadosAtivos[ativo.ativoId] ?? "aberta";
      const proximoEstado = alternarEstadoAtivo(ativo, estado);

      const cotasDepois = cotasDe(params, {
        ...estadosAtivos,
        [ativo.ativoId]: proximoEstado,
      });
      const depois = zonasExpostas(zonas, limiares, cotasDepois);

      const protegidas = descreverZonas(
        [...atual].filter((z) => !depois.has(z)),
        porId,
        zonasAlertadas,
      );
      const expostas = descreverZonas(
        [...depois].filter((z) => !atual.has(z)),
        porId,
        zonasAlertadas,
      );

      const deslocamentos: DeslocamentoCota[] = [];
      for (const zona of zonas) {
        const antes = cotasAntes.get(zona.zonaId);
        const depoisCota = cotasDepois.get(zona.zonaId);
        if (antes === undefined || depoisCota === undefined) continue;
        if (Math.abs(antes - depoisCota) < 0.001) continue;
        // So zonas expostas ou a um metro de virar: o resto e ruido.
        if (
          !zonaMereceAtencao(limiares, zona.zonaId, antes) &&
          !zonaMereceAtencao(limiares, zona.zonaId, depoisCota)
        ) {
          continue;
        }
        deslocamentos.push({
          zonaId: zona.zonaId,
          nome: zona.nome,
          cotaAntes: antes,
          cotaDepois: depoisCota,
          limiar: limiarDeCota(limiares, zona.zonaId)?.valor ?? null,
          sobAlerta: zonasAlertadas.has(zona.zonaId),
        });
      }

      const populacaoProtegida = somar(protegidas);
      const populacaoExposta = somar(expostas);

      return {
        ativoId: ativo.ativoId,
        nome: ativo.nome,
        tipo: ativo.tipo,
        estado,
        operavel: operavel(ativo),
        proximoEstado,
        protegidas,
        expostas,
        populacaoProtegida,
        populacaoExposta,
        saldo: populacaoProtegida - populacaoExposta,
        // So marca a acao que MUDA o quadro de uma zona sob alerta. Incluir
        // tambem os deslocamentos sem travessia punha o selo em quase toda
        // linha durante um evento extremo — e um selo onipresente nao
        // distingue nada.
        tocaAlerta: [...protegidas, ...expostas].some((z) => z.sobAlerta),
        deslocamentos,
      };
    });
}

/**
 * Melhor combinação de acionamentos, por busca gulosa com duas chaves.
 *
 * A primeira chave é a população exposta; a segunda, a folga acumulada acima
 * dos limiares. A segunda chave é o que permite ENCADEAR ativos: isolado, um
 * ativo costuma não tirar ninguém da exposição (saldo zero), mas aproxima a
 * cota do limiar, e o próximo ativo sobre a mesma zona completa a travessia.
 * Uma busca guiada só pela população pararia no primeiro passo de saldo zero.
 *
 * Gulosa e não ótima de propósito: a escolha ótima exigiria varrer 2^n
 * combinações. É determinística — a mesma situação produz sempre a mesma
 * recomendação — e nunca aciona um ativo que piore a população exposta.
 */
export function melhorCombinacao(
  params: ParametrosGemeo,
  _zonasAlertadas: ReadonlySet<string> = new Set(),
): Record<string, string> {
  const operaveis = params.ativos.filter(
    (a) => (a.tipo === "comporta" || a.tipo === "ebap") && operavel(a),
  );

  let estados = estadosIniciaisAtivos(params.ativos);
  const jaMexidos = new Set<string>();

  function pontuar(e: Record<string, string>): [number, number] {
    const cotas = cotasDe(params, e);
    return [
      -populacaoExpostaSobCota(params.zonas, params.limiares, cotas),
      -folgaAcimaDoLimiar(params.zonas, params.limiares, cotas),
    ];
  }

  let melhorPontuacao = pontuar(estados);

  for (let passo = 0; passo < operaveis.length; passo++) {
    let escolhido: { ativoId: string; estado: string; pontuacao: [number, number] } | null = null;

    for (const ativo of operaveis) {
      if (jaMexidos.has(ativo.ativoId)) continue;
      const candidato = {
        ...estados,
        [ativo.ativoId]: alternarEstadoAtivo(ativo, estados[ativo.ativoId] ?? "aberta"),
      };
      const pontuacao = pontuar(candidato);

      const melhora =
        pontuacao[0] > melhorPontuacao[0] ||
        (pontuacao[0] === melhorPontuacao[0] && pontuacao[1] > melhorPontuacao[1]);
      if (!melhora) continue;

      const melhorQueOutro =
        escolhido === null ||
        pontuacao[0] > escolhido.pontuacao[0] ||
        (pontuacao[0] === escolhido.pontuacao[0] && pontuacao[1] > escolhido.pontuacao[1]);
      if (melhorQueOutro) {
        escolhido = { ativoId: ativo.ativoId, estado: candidato[ativo.ativoId]!, pontuacao };
      }
    }

    if (!escolhido) break;
    estados = { ...estados, [escolhido.ativoId]: escolhido.estado };
    jaMexidos.add(escolhido.ativoId);
    melhorPontuacao = escolhido.pontuacao;
  }

  return estados;
}
