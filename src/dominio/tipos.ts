import type { Coordenada, Poligono } from "./geometria";

export type Variavel = "chuva_mm" | "nivel_m" | "vazao_m3s";
export type Qualidade = "aprovada" | "suspeita" | "reprovada";
export type Severidade = "baixa" | "media" | "alta" | "muito_alta";
export type OrigemAlerta = "observacao" | "previsao";
export type SituacaoEstacao = "operante" | "degradada" | "silenciosa" | "desativada";

export type EstadoAlerta =
  | "candidato"
  | "validado"
  | "expedido"
  | "atualizado"
  | "encerrado"
  | "descartado";

export interface Observacao {
  readonly observacaoId: string;
  readonly estacaoId: string;
  readonly fonteId: string;
  readonly variavel: Variavel;
  readonly valor: number;
  readonly unidade: string;
  readonly tsOrigem: string;
  readonly tsIngestao: string;
  readonly qualidade: Qualidade;
  readonly motivoQualidade?: string;
}

export interface EstacaoMonitoramento {
  readonly estacaoId: string;
  readonly codigoExterno: string;
  readonly fonteId: string;
  readonly nome: string;
  readonly tipo: "pluviometrica" | "fluviometrica" | "regua";
  readonly subBaciaId: string;
  readonly posicao: Coordenada;
  readonly periodicidadeEsperadaMin: number;
  situacao: SituacaoEstacao;
  ultimaLeituraTs: string | null;
}

export interface SubBacia {
  readonly subBaciaId: string;
  readonly nome: string;
  readonly geometria: Poligono;
  readonly areaKm2: number;
  readonly tempoConcentracaoHoras: number;
}

export interface ZonaRisco {
  readonly zonaId: string;
  readonly nome: string;
  readonly codigoSetorSgb: string;
  readonly subBaciaId: string;
  readonly grauRisco: "alto" | "muito_alto";
  readonly tipo: "inundacao" | "deslizamento";
  readonly familiasEstimadas: number;
  readonly populacaoEstimada: number;
  readonly geometria: Poligono;
}

export interface AtivoProtecao {
  readonly ativoId: string;
  readonly nome: string;
  readonly tipo: "comporta" | "ebap";
  readonly posicao: Coordenada;
  situacaoProntidao: "pronto" | "manutencao" | "inoperante";
}

export interface Limiar {
  readonly limiarId: string;
  readonly zonaId: string;
  readonly variavel: Variavel;
  readonly janelaHoras: number;
  readonly operador: ">=" | ">";
  readonly valor: number;
  readonly severidade: Severidade;
  readonly origem: OrigemAlerta;
  readonly versao: number;
  readonly vigenciaInicio: string;
  readonly vigenciaFim: string | null;
  readonly justificativaTecnica: string;
  readonly autor: string;
}

export interface EvidenciaAlerta {
  readonly tipo: "observacao" | "previsao" | "mancha";
  readonly referenciaId: string;
  readonly descricao: string;
  readonly valor: number;
  readonly ts: string;
}

export interface AtualizacaoAlerta {
  readonly tipo: "escalada" | "reducao" | "reforco" | "encerramento";
  readonly texto: string;
  readonly ts: string;
}

export interface Alerta {
  readonly alertaId: string;
  readonly zonaId: string;
  readonly limiarId: string;
  readonly severidade: Severidade;
  readonly origem: OrigemAlerta;
  readonly estado: EstadoAlerta;
  readonly valorDisparo: number;
  readonly tsDeteccao: string;
  readonly tsValidacao: string | null;
  readonly tsExpedicao: string | null;
  readonly tsEncerramento: string | null;
  readonly leadTimeHoras: number | null;
  readonly operadorValidador: string | null;
  readonly motivoDescarte: string | null;
  readonly evidencias: readonly EvidenciaAlerta[];
  readonly atualizacoes: readonly AtualizacaoAlerta[];
}

export interface PrevisaoNivel {
  readonly previsaoId: string;
  readonly rodadaId: string;
  readonly postoId: string;
  readonly horizonteHoras: number;
  readonly nivelPrevistoM: number;
  readonly limiteInf: number;
  readonly limiteSup: number;
  readonly versaoModelo: string;
  readonly tsRodada: string;
}

export interface ExposicaoCalculada {
  readonly zonaId: string;
  readonly areaInterceptadaKm2: number;
  readonly populacaoEstimada: number;
  readonly familiasEstimadas: number;
  readonly metodoEstimativa: string;
}
