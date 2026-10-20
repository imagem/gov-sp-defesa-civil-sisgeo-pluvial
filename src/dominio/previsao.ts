import type { PrevisaoNivel } from "./tipos";

export const VERSAO_MODELO = "demo-chuva-nivel-0.1";

/** Metros de nivel por milimetro de chuva efetiva. Parametro sintetico. */
const GANHO_M_POR_MM = 0.018;
/** Recessao natural do nivel, em metros por hora, sem chuva. */
const RECESSAO_M_POR_H = 0.02;

export interface ParametrosPrevisao {
  readonly rodadaId: string;
  readonly postoId: string;
  readonly nivelAtualM: number;
  readonly chuvaAcumulada6hMm: number;
  readonly chuvaPrevista24hMm: number;
  readonly tempoConcentracaoHoras: number;
  readonly horizontes: readonly number[];
  readonly tsRodada: string;
}

/**
 * Resposta chuva-nivel parametrizada.
 *
 * ATENCAO: isto NAO e um modelo hidrologico. E uma curva de resposta com
 * atraso e recessao, suficiente para demonstrar o fluxo de previsao ->
 * mancha -> geofencing -> alerta. Nunca apresentar como capacidade preditiva.
 * O SPEC-H1 (AD-04) trata o modelo real como componente acoplavel por interface.
 */
export function preverNivel(p: ParametrosPrevisao): PrevisaoNivel[] {
  const tc = Math.max(p.tempoConcentracaoHoras, 1);

  return p.horizontes.map((h) => {
    // Fracao da chuva prevista que ainda vai cair ate o horizonte h. A chuva
    // JA caida (chuvaAcumulada6hMm) nao entra aqui: seu efeito ja esta
    // absorvido em nivelAtualM pelo motor da simulacao, que sobe o nivel a
    // cada tick a partir da mesma chuva observada. Somar os dois de novo
    // faria a previsao contar a mesma tempestade duas vezes. A previsao e um
    // INCREMENTO sobre o nivel atual, causado apenas pela chuva que falta cair.
    const chuvaAcumuladaAteH = p.chuvaPrevista24hMm * Math.min(h / 24, 1);
    const chuvaEfetiva = chuvaAcumuladaAteH;

    // Hidrograma simplificado: sobe ate o tempo de concentracao, depois decai.
    const resposta = h <= tc ? h / tc : Math.exp(-(h - tc) / tc);

    const bruto =
      p.nivelAtualM + chuvaEfetiva * GANHO_M_POR_MM * resposta - RECESSAO_M_POR_H * h;
    const nivelPrevistoM = Math.max(0, Number(bruto.toFixed(3)));

    const incerteza = Number((0.05 * h + 0.1).toFixed(3));

    return {
      previsaoId: `${p.rodadaId}-${p.postoId}-${h}`,
      rodadaId: p.rodadaId,
      postoId: p.postoId,
      horizonteHoras: h,
      nivelPrevistoM,
      limiteInf: Number(Math.max(0, nivelPrevistoM - incerteza).toFixed(3)),
      limiteSup: Number((nivelPrevistoM + incerteza).toFixed(3)),
      versaoModelo: VERSAO_MODELO,
      tsRodada: p.tsRodada,
    };
  });
}
