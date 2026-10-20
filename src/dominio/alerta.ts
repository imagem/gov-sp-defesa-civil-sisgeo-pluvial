import type {
  Alerta,
  AtualizacaoAlerta,
  EvidenciaAlerta,
  OrigemAlerta,
  Severidade,
} from "./tipos";

export const ORDEM_SEVERIDADE: Record<Severidade, number> = {
  baixa: 1,
  media: 2,
  alta: 3,
  muito_alta: 4,
};

export interface ParametrosAlerta {
  readonly alertaId: string;
  readonly zonaId: string;
  readonly limiarId: string;
  readonly severidade: Severidade;
  readonly origem: OrigemAlerta;
  readonly valorDisparo: number;
  readonly tsDeteccao: string;
  readonly leadTimeHoras: number | null;
  readonly evidencias: readonly EvidenciaAlerta[];
}

export function criarAlertaCandidato(p: ParametrosAlerta): Alerta {
  return {
    alertaId: p.alertaId,
    zonaId: p.zonaId,
    limiarId: p.limiarId,
    severidade: p.severidade,
    origem: p.origem,
    estado: "candidato",
    valorDisparo: p.valorDisparo,
    tsDeteccao: p.tsDeteccao,
    tsValidacao: null,
    tsExpedicao: null,
    tsEncerramento: null,
    leadTimeHoras: p.leadTimeHoras,
    operadorValidador: null,
    motivoDescarte: null,
    evidencias: p.evidencias,
    atualizacoes: [],
  };
}

export function validar(alerta: Alerta, operador: string, tsIso: string): Alerta {
  if (alerta.estado !== "candidato") {
    throw new Error("só um alerta candidato pode ser validado");
  }
  if (operador.trim() === "") {
    throw new Error("operador obrigatório");
  }
  return { ...alerta, estado: "validado", operadorValidador: operador, tsValidacao: tsIso };
}

export function descartar(alerta: Alerta, motivo: string, tsIso: string): Alerta {
  if (alerta.estado !== "candidato") {
    throw new Error("só um alerta candidato pode ser descartado");
  }
  if (motivo.trim() === "") {
    throw new Error("motivo obrigatório");
  }
  return { ...alerta, estado: "descartado", motivoDescarte: motivo, tsEncerramento: tsIso };
}

/**
 * RNF-18 do SPEC-H1, materializado em codigo.
 *
 * Nao existe caminho que leve um alerta a "expedido" sem passar por validar().
 * Se algum agente tentar, esta funcao lanca — e a demo mostra o bloqueio em cena.
 * NAO AFROUXAR.
 */
export function expedir(alerta: Alerta, tsIso: string): Alerta {
  if (alerta.estado !== "validado" || alerta.operadorValidador === null) {
    throw new Error("expedição exige alerta validado por operador identificado");
  }
  return { ...alerta, estado: "expedido", tsExpedicao: tsIso };
}

export function encerrar(alerta: Alerta, tsIso: string): Alerta {
  if (alerta.estado !== "expedido" && alerta.estado !== "atualizado") {
    throw new Error("só alerta expedido ou atualizado pode ser encerrado");
  }
  return { ...alerta, estado: "encerrado", tsEncerramento: tsIso };
}

/**
 * Antifadiga (RF-ALT-05): reincidencia de severidade igual ou menor,
 * dentro da janela, vira atualizacao do alerta ativo — nao um alerta novo.
 */
export function deveAgrupar(
  ativo: Alerta,
  severidadeNova: Severidade,
  tsNovoIso: string,
  janelaMinutos: number,
): boolean {
  const estadosAtivos: Alerta["estado"][] = ["candidato", "validado", "expedido", "atualizado"];
  if (!estadosAtivos.includes(ativo.estado)) return false;
  if (ORDEM_SEVERIDADE[severidadeNova] > ORDEM_SEVERIDADE[ativo.severidade]) return false;
  const decorridoMin =
    (new Date(tsNovoIso).getTime() - new Date(ativo.tsDeteccao).getTime()) / 60_000;
  return decorridoMin >= 0 && decorridoMin <= janelaMinutos;
}

export function aplicarAtualizacao(
  alerta: Alerta,
  tipo: AtualizacaoAlerta["tipo"],
  texto: string,
  tsIso: string,
): Alerta {
  return {
    ...alerta,
    atualizacoes: [...alerta.atualizacoes, { tipo, texto, ts: tsIso }],
  };
}
