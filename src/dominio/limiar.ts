import type { Limiar, Observacao, Variavel } from "./tipos";

/**
 * Acumula o valor de uma variavel em uma janela movel.
 * So entram leituras APROVADAS — regra de integridade 8.5 do SPEC-H1.
 *
 * Passagem unica em vez de quatro filtros encadeados (cada um alocando um
 * array intermediario): esta funcao roda ~12x por tick (uma por limiar
 * vigente, mais uma do agente hidrologico), entao o custo de alocacao se
 * acumulava rapido conforme observacoes crescia.
 */
export function acumular(
  observacoes: readonly Observacao[],
  variavel: Variavel,
  estacaoIds: readonly string[],
  janelaHoras: number,
  agoraIso: string,
): number {
  const fim = new Date(agoraIso).getTime();
  const inicio = fim - janelaHoras * 3_600_000;
  const idsPermitidos = new Set(estacaoIds);

  let soma = 0;
  for (const o of observacoes) {
    if (o.variavel !== variavel) continue;
    if (o.qualidade !== "aprovada") continue;
    if (!idsPermitidos.has(o.estacaoId)) continue;
    const t = new Date(o.tsOrigem).getTime();
    if (t <= inicio || t > fim) continue;
    soma += o.valor;
  }
  return soma;
}

export function limiaresVigentes(limiares: readonly Limiar[], agoraIso: string): Limiar[] {
  const agora = new Date(agoraIso).getTime();
  return limiares.filter((l) => {
    const inicio = new Date(l.vigenciaInicio).getTime();
    const fim = l.vigenciaFim ? new Date(l.vigenciaFim).getTime() : Number.POSITIVE_INFINITY;
    return agora >= inicio && agora < fim;
  });
}

export function atingeLimiar(limiar: Limiar, valor: number): boolean {
  return limiar.operador === ">=" ? valor >= limiar.valor : valor > limiar.valor;
}
