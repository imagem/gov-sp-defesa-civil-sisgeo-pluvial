import type { Coordenada } from "./geometria";

/**
 * Despacho de equipe de campo para uma estação com problema (apoio ao
 * RF-NET-01: a lacuna da rede não é só exibida, ela é endereçada).
 *
 * Funções puras. Quem avança o relógio é o motor da simulação; aqui só há
 * a regra: quanto tempo leva até a estação voltar, por onde a viatura passa
 * e onde ela está agora.
 */

export type EstadoDespacho = "preparando" | "a_caminho" | "em_atendimento" | "concluido";

/** Trajeto da viatura: vértices em sequência, do pátio até a estação. */
export interface Rota {
  readonly pontos: readonly Coordenada[];
  /** Soma dos segmentos, em graus. Maior que a distância em linha reta. */
  readonly comprimentoGraus: number;
}

export interface DespachoCampo {
  readonly despachoId: string;
  readonly estacaoId: string;
  readonly estacaoNome: string;
  readonly especialista: string;
  readonly equipe: string;
  readonly motivo: string;
  readonly origem: Coordenada;
  readonly destino: Coordenada;
  readonly rota: Rota;
  readonly tsDespacho: string;
  /** Acionamento da equipe antes de a viatura sair do pátio, em minutos. */
  readonly preparoMin: number;
  /** Tempo de percurso pela rota até a estação, em minutos. */
  readonly deslocamentoMin: number;
  /** Tempo de atendimento no local, em minutos. */
  readonly atendimentoMin: number;
  readonly decorridoMin: number;
  readonly estado: EstadoDespacho;
}

/** Plantão de campo da demonstração. Nomes fictícios. */
export const ESPECIALISTAS: readonly { readonly nome: string; readonly equipe: string }[] = [
  { nome: "Téc. Marcos Ribeiro", equipe: "REDE-1" },
  { nome: "Téc. Aline Souza", equipe: "REDE-2" },
  { nome: "Téc. Caio Nakamura", equipe: "REDE-3" },
  { nome: "Téc. Patrícia Lemos", equipe: "REDE-4" },
  { nome: "Téc. Jonas Vieira", equipe: "REDE-5" },
];

/**
 * Acionar a equipe leva tempo: localizar o técnico de sobreaviso, passar a
 * ocorrência e carregar o material de reposição. A viatura não sai no
 * instante do clique — e é isso que torna o número de "tempo até normalizar"
 * honesto.
 */
const PREPARO_MIN = 12;

/**
 * Velocidade média da viatura em deslocamento urbano, em graus de latitude
 * por hora. Equivale a cerca de 17 km/h — ritmo honesto de um deslocamento
 * de plantão em trânsito denso, com paradas em semáforos, chuva no para-brisa
 * e eventual trecho de via não pavimentada ou alagada.
 *
 * Mais baixo que a cruise speed urbana de propósito: num evento climático,
 * o tempo até normalizar e a sensação de "a viatura não voa" sao parte da
 * mensagem que a demo precisa carregar.
 */
const VELOCIDADE_GRAUS_POR_HORA = 0.10;
const DESLOCAMENTO_MIN_MINUTOS = 40;
const DESLOCAMENTO_MAX_MINUTOS = 240;

/** Tempo de atendimento no local, por motivo do despacho. */
const ATENDIMENTO_POR_MOTIVO: Record<string, number> = {
  silenciosa: 45,
  degradada: 25,
  desativada: 80,
  operante: 20,
};

/**
 * Primeiro especialista do plantão que não está em um despacho aberto.
 * Devolve null quando todo o plantão já está em campo — o operador precisa
 * saber disso em vez de receber um nome repetido.
 */
export function escolherEspecialista(
  despachosAbertos: readonly Pick<DespachoCampo, "especialista">[],
): { nome: string; equipe: string } | null {
  const ocupados = new Set(despachosAbertos.map((d) => d.especialista));
  return ESPECIALISTAS.find((e) => !ocupados.has(e.nome)) ?? null;
}

function distanciaGraus(a: Coordenada, b: Coordenada): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

/** Embaralhador determinístico simples, derivado de um texto (o id da estação). */
function semeteDoTexto(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/**
 * Traça o percurso da viatura do pátio até a estação.
 *
 * Em vez da reta entre os dois pontos, a rota desce primeiro por um eixo e
 * depois pelo outro, com um desvio lateral determinístico no meio — o
 * suficiente para parecer uma sequência de vias em vez de um voo de pássaro.
 * É geometria sintética, não roteamento real: no produto, este traçado vem
 * de um serviço de rotas (ArcGIS Network Analyst).
 *
 * Determinística: a mesma estação sempre recebe a mesma rota, então a
 * demonstração é reproduzível.
 */
export function tracarRota(origem: Coordenada, destino: Coordenada, semente: string): Rota {
  const [ox, oy] = origem;
  const [dx, dy] = destino;
  const r = semeteDoTexto(semente);

  // Desvio lateral de até 18% da distância, para um lado ou para o outro.
  const desvio = (r - 0.5) * 0.36 * distanciaGraus(origem, destino);
  const horizontalPrimeiro = r >= 0.5;

  const meio: Coordenada = horizontalPrimeiro
    ? [ox + (dx - ox) * 0.62, oy + desvio]
    : [ox + desvio, oy + (dy - oy) * 0.62];
  const curva: Coordenada = horizontalPrimeiro
    ? [meio[0], oy + (dy - oy) * 0.78]
    : [ox + (dx - ox) * 0.78, meio[1]];

  const pontos: Coordenada[] = [origem, meio, curva, destino];

  let comprimentoGraus = 0;
  for (let i = 1; i < pontos.length; i++) {
    comprimentoGraus += distanciaGraus(pontos[i - 1]!, pontos[i]!);
  }

  return { pontos, comprimentoGraus };
}

/** Tempo de percurso estimado a partir do COMPRIMENTO DA ROTA, não da reta. */
export function estimarDeslocamentoMin(rota: Rota): number {
  const minutos = Math.round((rota.comprimentoGraus / VELOCIDADE_GRAUS_POR_HORA) * 60);
  return Math.min(Math.max(minutos, DESLOCAMENTO_MIN_MINUTOS), DESLOCAMENTO_MAX_MINUTOS);
}

export interface ParametrosDespacho {
  readonly despachoId: string;
  readonly estacaoId: string;
  readonly estacaoNome: string;
  readonly especialista: string;
  readonly equipe: string;
  readonly motivo: string;
  readonly origem: Coordenada;
  readonly destino: Coordenada;
  readonly tsDespacho: string;
}

/**
 * Substitui apenas a GEOMETRIA da rota de um despacho, preservando os
 * tempos ja estimados. Util quando um servico de rota real (OSRM) devolve
 * um tracado melhor que a rota em L semeada, sem alterar o deslocamentoMin
 * que o operador ja esta vendo.
 *
 * Caller e responsavel por so chamar quando o despacho ainda esta em
 * `preparando` — caso contrario a viatura "teleporta" para o novo tracado.
 */
export function substituirRota(
  despacho: DespachoCampo,
  pontos: readonly Coordenada[],
): DespachoCampo {
  if (pontos.length < 2) return despacho;
  let comprimentoGraus = 0;
  for (let i = 1; i < pontos.length; i++) {
    comprimentoGraus += distanciaGraus(pontos[i - 1]!, pontos[i]!);
  }
  return {
    ...despacho,
    rota: { pontos: [...pontos], comprimentoGraus },
  };
}

export function criarDespacho(p: ParametrosDespacho): DespachoCampo {
  const rota = tracarRota(p.origem, p.destino, p.estacaoId);
  return {
    ...p,
    rota,
    preparoMin: PREPARO_MIN,
    deslocamentoMin: estimarDeslocamentoMin(rota),
    atendimentoMin: ATENDIMENTO_POR_MOTIVO[p.motivo] ?? 30,
    decorridoMin: 0,
    estado: "preparando",
  };
}

function etapaDe(d: DespachoCampo, decorridoMin: number): EstadoDespacho {
  if (decorridoMin >= d.preparoMin + d.deslocamentoMin + d.atendimentoMin) return "concluido";
  if (decorridoMin >= d.preparoMin + d.deslocamentoMin) return "em_atendimento";
  if (decorridoMin >= d.preparoMin) return "a_caminho";
  return "preparando";
}

/** Avança o despacho em `minutos` de relógio simulado. */
export function avancarDespacho(d: DespachoCampo, minutos: number): DespachoCampo {
  if (d.estado === "concluido") return d;
  const decorridoMin = d.decorridoMin + minutos;
  return { ...d, decorridoMin, estado: etapaDe(d, decorridoMin) };
}

/** Fração do percurso já vencida, de 0 a 1. Zero enquanto a equipe se prepara. */
export function progressoTrajeto(d: DespachoCampo): number {
  if (d.deslocamentoMin <= 0) return 1;
  const emRota = d.decorridoMin - d.preparoMin;
  return Math.min(Math.max(emRota / d.deslocamentoMin, 0), 1);
}

/** Posição e rumo em um ponto `t` (0 a 1) do percurso. */
export function pontoNaRota(rota: Rota, t: number): { posicao: Coordenada; anguloGraus: number } {
  const pontos = rota.pontos;
  const primeiro = pontos[0] ?? ([0, 0] as Coordenada);
  const ultimo = pontos[pontos.length - 1] ?? primeiro;

  if (rota.comprimentoGraus <= 0) return { posicao: primeiro, anguloGraus: 0 };

  const alvo = Math.min(Math.max(t, 0), 1) * rota.comprimentoGraus;
  let percorrido = 0;

  for (let i = 1; i < pontos.length; i++) {
    const a = pontos[i - 1]!;
    const b = pontos[i]!;
    const seg = distanciaGraus(a, b);
    if (seg <= 0) continue;

    if (percorrido + seg >= alvo) {
      const f = (alvo - percorrido) / seg;
      return {
        posicao: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f],
        // Rumo em graus, no sentido horario a partir do norte — a convencao
        // do `angle` dos marcadores do ArcGIS.
        anguloGraus: (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180) / Math.PI,
      };
    }
    percorrido += seg;
  }

  return { posicao: ultimo, anguloGraus: 0 };
}

/** Posição atual da viatura no mapa, com o rumo do segmento em que está. */
export function posicaoDoDespacho(d: DespachoCampo): { posicao: Coordenada; anguloGraus: number } {
  return pontoNaRota(d.rota, progressoTrajeto(d));
}

/**
 * Minutos que ainda faltam para a estação voltar a transmitir — é este o
 * número que o operador acompanha, e ele inclui o acionamento da equipe.
 */
export function minutosRestantes(d: DespachoCampo): number {
  const total = d.preparoMin + d.deslocamentoMin + d.atendimentoMin;
  return Math.max(0, total - d.decorridoMin);
}

const ACAO_DA_ETAPA: Record<EstadoDespacho, string> = {
  preparando: "acionando equipe",
  a_caminho: "a caminho",
  em_atendimento: "em atendimento",
  concluido: "concluído",
};

/** Rótulo curto que acompanha o ícone da equipe no mapa. */
export function rotuloDespacho(d: DespachoCampo): string {
  if (d.estado === "concluido") return `${d.especialista} · concluído`;
  return `${d.especialista} · ${ACAO_DA_ETAPA[d.estado]} · ${minutosRestantes(d)} min`;
}
