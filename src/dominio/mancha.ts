import { areaAproxKm2, centroide, dilatar, poligonosSeIntersectam, type Poligono } from "./geometria";
import type { ExposicaoCalculada, ZonaRisco } from "./tipos";

/** Quanto a mancha se expande por metro de cota acima da base. */
const EXPANSAO_POR_METRO = 0.22;

/**
 * Gera a mancha de inundacao dilatando o corredor fluvial em funcao da cota.
 * Aproximacao geometrica — o SPEC-H1 preve modelagem hidraulica real (RF-MOD-04).
 */
export function mancharPorCota(corredor: Poligono, cotaM: number, cotaBaseM: number): Poligono {
  const excedente = Math.max(0, cotaM - cotaBaseM);
  const fator = 1 + excedente * EXPANSAO_POR_METRO;
  if (fator === 1) return corredor;

  const primeiroAnel = corredor.aneis[0];
  if (!primeiroAnel) return corredor;
  return dilatar(corredor, centroide(primeiroAnel), fator);
}

/**
 * Cruza a mancha com as zonas de risco e devolve a exposicao por zona.
 * A area interceptada e aproximada pela area da zona (a demo nao calcula
 * a interseccao poligonal exata) — o metodo fica declarado no resultado.
 */
export function exposicaoPorMancha(
  mancha: Poligono,
  zonas: readonly ZonaRisco[],
): ExposicaoCalculada[] {
  return zonas
    .filter((zona) => poligonosSeIntersectam(mancha, zona.geometria))
    .map((zona) => {
      const area = zona.geometria.aneis.reduce((soma, anel) => soma + areaAproxKm2(anel), 0);
      return {
        zonaId: zona.zonaId,
        areaInterceptadaKm2: Number(area.toFixed(3)),
        populacaoEstimada: zona.populacaoEstimada,
        familiasEstimadas: zona.familiasEstimadas,
        metodoEstimativa: "área total da zona interceptada (dado sintético de demonstração)",
      };
    });
}
