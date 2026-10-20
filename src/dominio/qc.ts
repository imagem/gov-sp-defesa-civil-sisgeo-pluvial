import type { Observacao, Qualidade, Variavel } from "./tipos";

/** Faixas fisicamente plausiveis por variavel. Materializa RF-ING-04. */
export const FAIXAS_FISICAS: Record<Variavel, { min: number; max: number }> = {
  chuva_mm: { min: 0, max: 500 },
  nivel_m: { min: -2, max: 40 },
  vazao_m3s: { min: 0, max: 50_000 },
};

/** Variacao maxima aceitavel entre leituras consecutivas da mesma variavel. */
const SALTO_MAXIMO: Record<Variavel, number> = {
  chuva_mm: 200,
  nivel_m: 3,
  vazao_m3s: 10_000,
};

const LEITURAS_IGUAIS_PARA_TRAVADO = 6;

export interface ResultadoQC {
  readonly qualidade: Qualidade;
  readonly motivo?: string;
}

/**
 * Avalia a qualidade de uma leitura contra faixa fisica, ordem temporal,
 * salto abrupto e sensor travado.
 *
 * Regra do SPEC-H1: leitura reprovada NUNCA e descartada em silencio —
 * ela e persistida com o sinalizador e simplesmente nao alimenta o alerta.
 */
export function avaliarQualidade(
  leitura: Observacao,
  anteriores: readonly Observacao[],
): ResultadoQC {
  const faixa = FAIXAS_FISICAS[leitura.variavel];
  if (leitura.valor < faixa.min || leitura.valor > faixa.max) {
    return { qualidade: "reprovada", motivo: "fora de faixa" };
  }

  const mesmaSerie = anteriores.filter(
    (o) => o.variavel === leitura.variavel && o.estacaoId === leitura.estacaoId,
  );

  const ultima = mesmaSerie[mesmaSerie.length - 1];
  if (ultima && new Date(leitura.tsOrigem) <= new Date(ultima.tsOrigem)) {
    return { qualidade: "reprovada", motivo: "fora de ordem temporal" };
  }

  if (ultima && Math.abs(leitura.valor - ultima.valor) > SALTO_MAXIMO[leitura.variavel]) {
    return { qualidade: "suspeita", motivo: "salto abrupto" };
  }

  const recentes = mesmaSerie.slice(-(LEITURAS_IGUAIS_PARA_TRAVADO - 1));
  if (
    recentes.length === LEITURAS_IGUAIS_PARA_TRAVADO - 1 &&
    recentes.every((o) => o.valor === leitura.valor)
  ) {
    return { qualidade: "suspeita", motivo: "sensor travado" };
  }

  return { qualidade: "aprovada" };
}
