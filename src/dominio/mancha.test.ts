import { describe, expect, it } from "vitest";
import { areaAproxKm2, type Anel, type Poligono } from "./geometria";
import { exposicaoPorMancha, mancharPorCota } from "./mancha";
import type { ZonaRisco } from "./tipos";

const corredorAnel: Anel = [
  [-51.25, -30.05],
  [-51.25, -30.0],
  [-51.2, -30.0],
  [-51.2, -30.05],
  [-51.25, -30.05],
];
const corredor: Poligono = { aneis: [corredorAnel] };

function zona(id: string, anel: Anel, populacao = 1000): ZonaRisco {
  return {
    zonaId: id,
    nome: `Zona ${id}`,
    codigoSetorSgb: `SGB-${id}`,
    subBaciaId: "SB-1",
    grauRisco: "muito_alto",
    tipo: "inundacao",
    familiasEstimadas: Math.round(populacao / 3.2),
    populacaoEstimada: populacao,
    geometria: { aneis: [anel] },
  };
}

describe("mancharPorCota", () => {
  it("mantem a geometria do corredor na cota base", () => {
    const m = mancharPorCota(corredor, 2, 2);
    expect(m.aneis[0]).toEqual(corredorAnel);
  });

  it("expande a mancha quando a cota sobe", () => {
    const base = areaAproxKm2(corredorAnel);
    const cheia = mancharPorCota(corredor, 5, 2);
    const anelCheia = cheia.aneis[0];
    if (!anelCheia) throw new Error("anel ausente");
    expect(areaAproxKm2(anelCheia)).toBeGreaterThan(base);
  });

  it("nao encolhe abaixo do corredor quando a cota fica abaixo da base", () => {
    const seca = mancharPorCota(corredor, 0.5, 2);
    const anelSeca = seca.aneis[0];
    if (!anelSeca) throw new Error("anel ausente");
    expect(areaAproxKm2(anelSeca)).toBeCloseTo(areaAproxKm2(corredorAnel), 5);
  });

  it("cresce monotonicamente com a cota", () => {
    const areaNaCota = (cota: number) => {
      const anel = mancharPorCota(corredor, cota, 2).aneis[0];
      if (!anel) throw new Error("anel ausente");
      return areaAproxKm2(anel);
    };
    expect(areaNaCota(4)).toBeGreaterThan(areaNaCota(3));
    expect(areaNaCota(6)).toBeGreaterThan(areaNaCota(4));
  });
});

describe("exposicaoPorMancha", () => {
  const dentro = zona("Z-1", [
    [-51.24, -30.04],
    [-51.24, -30.03],
    [-51.23, -30.03],
    [-51.23, -30.04],
    [-51.24, -30.04],
  ], 2400);

  const fora = zona("Z-2", [
    [-50.0, -29.0],
    [-50.0, -28.99],
    [-49.99, -28.99],
    [-49.99, -29.0],
    [-50.0, -29.0],
  ], 900);

  it("retorna somente as zonas interceptadas — CA-MOD-04", () => {
    const exposicao = exposicaoPorMancha(corredor, [dentro, fora]);
    expect(exposicao.map((e) => e.zonaId)).toEqual(["Z-1"]);
  });

  it("informa populacao, familias e metodo", () => {
    const e = exposicaoPorMancha(corredor, [dentro])[0];
    if (!e) throw new Error("exposicao ausente");
    expect(e.populacaoEstimada).toBe(2400);
    expect(e.familiasEstimadas).toBe(750);
    expect(e.metodoEstimativa).toContain("sintético");
    expect(e.areaInterceptadaKm2).toBeGreaterThan(0);
  });

  it("devolve lista vazia quando nada e interceptado", () => {
    expect(exposicaoPorMancha(corredor, [fora])).toEqual([]);
  });
});
