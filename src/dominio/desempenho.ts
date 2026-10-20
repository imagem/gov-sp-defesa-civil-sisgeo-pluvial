import type { Contingencia } from "./metricas";

/**
 * Acumulacao de amostras de desempenho ao longo da simulacao, para alimentar as
 * metricas de H1 (ver metricas.ts). Funcoes puras.
 *
 * - Modelo (RF-MOD-03): cada previsao de nivel e agendada com seu instante-alvo
 *   e, quando o relogio simulado alcanca esse instante, e pareada com o nivel de
 *   fato realizado — gerando a serie previsto x realizado.
 * - Alerta (RF-ALT-06): a tabela de contingencia compara as zonas que o sistema
 *   alertou com as zonas que a mancha realizada de fato interceptou.
 */

export interface PrevisaoPendente {
  /** Instante simulado para o qual esta previsao vale. */
  readonly alvoIso: string;
  readonly nivelPrevistoM: number;
}

export interface ParPrevisto {
  readonly previsto: number;
  readonly realizado: number;
}

/**
 * Resolve as previsoes cujo instante-alvo ja foi alcancado, pareando-as com o
 * nivel realizado agora. Devolve os pares resolvidos e as previsoes que ainda
 * aguardam seu alvo.
 */
export function resolverPrevisoes(
  pendentes: readonly PrevisaoPendente[],
  agoraIso: string,
  nivelRealizadoM: number,
): { pares: ParPrevisto[]; pendentesRestantes: PrevisaoPendente[] } {
  const agora = new Date(agoraIso).getTime();
  const pares: ParPrevisto[] = [];
  const pendentesRestantes: PrevisaoPendente[] = [];

  for (const p of pendentes) {
    if (new Date(p.alvoIso).getTime() <= agora) {
      pares.push({ previsto: p.nivelPrevistoM, realizado: nivelRealizadoM });
    } else {
      pendentesRestantes.push(p);
    }
  }
  return { pares, pendentesRestantes };
}

/**
 * Monta a tabela de contingencia a partir do conjunto de zonas que o sistema
 * alertou e do conjunto de zonas de fato inundadas (verdade de terreno da
 * simulacao). Zonas repetidas sao contadas uma vez.
 */
export function montarContingencia(
  zonasComAlerta: Iterable<string>,
  zonasVerdadeiras: Iterable<string>,
): Contingencia {
  const alertadas = new Set(zonasComAlerta);
  const verdadeiras = new Set(zonasVerdadeiras);

  let acertos = 0;
  let falsosAlarmes = 0;
  for (const z of alertadas) {
    if (verdadeiras.has(z)) acertos++;
    else falsosAlarmes++;
  }

  let perdas = 0;
  for (const z of verdadeiras) {
    if (!alertadas.has(z)) perdas++;
  }

  return { acertos, perdas, falsosAlarmes };
}
