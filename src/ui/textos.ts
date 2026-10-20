export type ChaveTexto =
  | "auditoria"
  | "confiabilidade"
  | "filaAlertas"
  | "saudeRede"
  | "gemeoDigital"
  | "fluxoDado"
  | "agentes"
  | "operacional"
  | "alertas";

export interface Texto {
  readonly rotulo: string;
  readonly codigo?: string;
}

export const TEXTOS: Record<ChaveTexto, Texto> = {
  auditoria: {
    rotulo: "Rastreabilidade da decisão",
    codigo: "RF-GOV-02",
  },
  confiabilidade: {
    rotulo: "Confiabilidade do sistema",
    codigo: "RF-MOD-03 · RF-ALT-06",
  },
  filaAlertas: {
    rotulo: "Fila de alertas",
  },
  saudeRede: {
    rotulo: "Saúde da rede",
  },
  gemeoDigital: {
    rotulo: "Gêmeo digital",
  },
  fluxoDado: {
    rotulo: "Fluxo do dado",
  },
  agentes: {
    rotulo: "Agentes",
  },
  operacional: {
    rotulo: "Situação operacional",
  },
  alertas: {
    rotulo: "Alertas",
  },
};

export function rotulo(
  chave: ChaveTexto,
  modoTecnico: boolean
): string {
  const t = TEXTOS[chave];
  return t.codigo && modoTecnico
    ? `${t.rotulo} · ${t.codigo}`
    : t.rotulo;
}
