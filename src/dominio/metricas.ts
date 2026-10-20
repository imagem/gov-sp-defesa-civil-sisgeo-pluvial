/**
 * Metricas de desempenho de H1, calculadas sobre series da propria simulacao.
 *
 * - Acuracia do modelo (RF-MOD-03): NSE, RMSE, MAE, vies entre a serie prevista
 *   e a serie realizada de nivel.
 * - Eficacia do alerta (RF-ALT-06): POD, FAR, CSI a partir da tabela de
 *   contingencia (acertos / perdas / falsos alarmes).
 *
 * Sao funcoes puras. No contexto da demo os numeros sao SINTETICOS — derivados
 * do mundo simulado, nao de observacao real — e a interface deve rotula-los
 * como tal. Ainda assim a formula e a de verdade, para suportar conversa tecnica.
 */

function validarSeries(observado: readonly number[], previsto: readonly number[]): void {
  if (observado.length !== previsto.length) {
    throw new Error("series de tamanhos diferentes");
  }
  if (observado.length === 0) {
    throw new Error("serie vazia");
  }
}

/** Raiz do erro quadratico medio entre previsto e observado. */
export function rmse(observado: readonly number[], previsto: readonly number[]): number {
  validarSeries(observado, previsto);
  const soma = observado.reduce((t, o, i) => t + (previsto[i]! - o) ** 2, 0);
  return Math.sqrt(soma / observado.length);
}

/** Erro absoluto medio entre previsto e observado. */
export function mae(observado: readonly number[], previsto: readonly number[]): number {
  validarSeries(observado, previsto);
  const soma = observado.reduce((t, o, i) => t + Math.abs(previsto[i]! - o), 0);
  return soma / observado.length;
}

/** Vies medio: positivo quando o modelo superestima, negativo quando subestima. */
export function vies(observado: readonly number[], previsto: readonly number[]): number {
  validarSeries(observado, previsto);
  const soma = observado.reduce((t, o, i) => t + (previsto[i]! - o), 0);
  return soma / observado.length;
}

/**
 * Nash-Sutcliffe Efficiency. 1 = ajuste perfeito; 0 = tao bom quanto usar a
 * media do observado; < 0 = pior que a media. Indefinido se o observado nao tem
 * variancia (denominador zero).
 */
export function nse(observado: readonly number[], previsto: readonly number[]): number {
  validarSeries(observado, previsto);
  const media = observado.reduce((t, o) => t + o, 0) / observado.length;
  const denominador = observado.reduce((t, o) => t + (o - media) ** 2, 0);
  if (denominador === 0) {
    throw new Error("serie observada sem variancia; NSE indefinido");
  }
  const numerador = observado.reduce((t, o, i) => t + (o - previsto[i]!) ** 2, 0);
  return 1 - numerador / denominador;
}

export interface Contingencia {
  /** Alertou e o evento ocorreu. */
  readonly acertos: number;
  /** Evento ocorreu sem alerta (misses). */
  readonly perdas: number;
  /** Alertou e o evento nao ocorreu (false alarms). */
  readonly falsosAlarmes: number;
}

export interface DesempenhoAlerta {
  /** Probability of Detection = acertos / (acertos + perdas). */
  readonly pod: number;
  /** False Alarm Ratio = falsos alarmes / (acertos + falsos alarmes). */
  readonly far: number;
  /** Critical Success Index = acertos / (acertos + perdas + falsos alarmes). */
  readonly csi: number;
}

/** POD, FAR e CSI a partir da tabela de contingencia. Sem eventos -> zero. */
export function desempenhoAlerta(c: Contingencia): DesempenhoAlerta {
  if (c.acertos < 0 || c.perdas < 0 || c.falsosAlarmes < 0) {
    throw new Error("contagens de contingencia nao podem ser negativas");
  }
  const divisaoSegura = (num: number, den: number): number => (den === 0 ? 0 : num / den);
  return {
    pod: divisaoSegura(c.acertos, c.acertos + c.perdas),
    far: divisaoSegura(c.falsosAlarmes, c.acertos + c.falsosAlarmes),
    csi: divisaoSegura(c.acertos, c.acertos + c.perdas + c.falsosAlarmes),
  };
}
