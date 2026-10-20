import type { Aleatorio } from "@/dominio/prng";
import type { RelogioSimulado } from "@/dominio/relogio";
import type {
  Alerta,
  EstacaoMonitoramento,
  ExposicaoCalculada,
  Observacao,
  PrevisaoNivel,
} from "@/dominio/tipos";
import type { Poligono } from "@/dominio/geometria";
import type { PrevisaoPendente } from "@/dominio/desempenho";
import type { DespachoCampo } from "@/dominio/despacho";
import type { Barramento, TipoEvento } from "@/simulacao/barramento";
import type { Mundo } from "@/simulacao/mundo";

export type ModuloAgente = "ING" | "NET" | "MOD" | "ALT" | "EXP" | "LLM" | "GOV";
export type StatusAgente = "ocioso" | "trabalhando" | "alerta" | "bloqueado" | "falha";

/** Estado mutavel compartilhado por todos os agentes no mesmo tick. */
export interface EstadoSimulacao {
  observacoes: Observacao[];
  estacoes: EstacaoMonitoramento[];
  estacoesSemComunicacao: string[];
  previsoes: PrevisaoNivel[];
  mancha: Poligono | null;
  cotaPrevistaM: number;
  nivelAtualM: number;
  intensidadeChuvaMmH: number;
  exposicao: ExposicaoCalculada[];
  alertas: Alerta[];
  boletins: Boletim[];
  contador: number;
  /**
   * Indice LOCAL (dentro do array observacoes atual, ja podado) ate onde o
   * agente de qualidade ja inspecionou. Fica em `estado` em vez de uma
   * variavel privada do agente porque o motor precisa ajusta-lo sempre que
   * poda o array pela frente — ver Motor.podarObservacoes().
   */
  qualidadeCursor: number;
  /**
   * Contagem cumulativa de leituras nao aprovadas, mantida a parte porque
   * `observacoes` e podado periodicamente (nao da mais para recontar do zero
   * a cada leitura do KPI).
   */
  leiturasReprovadasTotal: number;
  /**
   * Desempenho do modelo (RF-MOD-03): serie pareada previsto x realizado de
   * nivel, mais o buffer de previsoes ainda aguardando o instante-alvo.
   * Numeros SINTETICOS derivados da simulacao.
   */
  serieNivelPrevisto: number[];
  serieNivelRealizado: number[];
  previsoesPendentes: PrevisaoPendente[];
  /**
   * Eficacia do alerta (RF-ALT-06): conjuntos cumulativos ao longo do evento —
   * zonas que o sistema alertou e zonas que a mancha REALIZADA (do nivel
   * observado, nao do previsto) de fato interceptou. A contingencia deriva daqui.
   */
  zonasAlertadasHist: string[];
  zonasInundadasHist: string[];
  /**
   * Despachos de equipe de campo abertos pelo operador sobre estacoes com
   * problema (apoio ao RF-NET-01). O motor avanca cada despacho a cada tick;
   * ao concluir, a estacao volta a transmitir.
   */
  despachos: DespachoCampo[];
}

export interface Boletim {
  readonly boletimId: string;
  readonly alertaId: string;
  readonly publico: "defesa_civil" | "prefeitura" | "cidadao";
  readonly textoRascunho: string;
  textoAprovado: string | null;
  readonly fontesConsultadas: readonly string[];
  readonly tsGeracao: string;
  tsAprovacao: string | null;
  autorAprovacao: string | null;
}

export interface ContextoAgente {
  readonly relogio: RelogioSimulado;
  readonly barramento: Barramento;
  readonly mundo: Mundo;
  readonly estado: EstadoSimulacao;
  readonly aleatorio: Aleatorio;
  publicar(
    agenteId: string,
    tipo: TipoEvento,
    titulo: string,
    carga: unknown,
    correlacaoId?: string,
  ): void;
}

export interface Agente {
  readonly id: string;
  readonly nome: string;
  readonly modulo: ModuloAgente;
  readonly descricao: string;
  readonly requisitos: readonly string[];
  status: StatusAgente;
  ultimaAtividade: string | null;
  contadorTrabalho: number;
  aoTick(ctx: ContextoAgente): void;
}

export function criarEstadoInicial(nivelInicialM: number): EstadoSimulacao {
  return {
    observacoes: [],
    estacoes: [],
    estacoesSemComunicacao: [],
    previsoes: [],
    mancha: null,
    cotaPrevistaM: nivelInicialM,
    nivelAtualM: nivelInicialM,
    intensidadeChuvaMmH: 0,
    exposicao: [],
    alertas: [],
    boletins: [],
    contador: 0,
    qualidadeCursor: 0,
    leiturasReprovadasTotal: 0,
    serieNivelPrevisto: [],
    serieNivelRealizado: [],
    previsoesPendentes: [],
    zonasAlertadasHist: [],
    zonasInundadasHist: [],
    despachos: [],
  };
}
