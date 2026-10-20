import { describe, expect, it } from "vitest";
import {
  REGIAO_GUAIBA_RS,
  REGIAO_SERRA_MAR_SP,
  REGIAO_VARZEA_TIETE_SP,
  REGIOES,
  acharRegiao,
} from "./regioes";

describe("regioes", () => {
  it("expoe as tres regioes do catalogo", () => {
    expect(REGIOES).toEqual([
      REGIAO_VARZEA_TIETE_SP,
      REGIAO_SERRA_MAR_SP,
      REGIAO_GUAIBA_RS,
    ]);
  });

  it("cada regiao traz pelo menos quatro sub-bacias e quatro bairros", () => {
    for (const r of REGIOES) {
      expect(r.subBacias.length).toBeGreaterThanOrEqual(4);
      expect(r.bairros.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("ids sao unicos e podem ser achados por acharRegiao", () => {
    const ids = REGIOES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of REGIOES) {
      expect(acharRegiao(r.id)).toBe(r);
    }
  });

  it("acharRegiao devolve undefined para id desconhecido", () => {
    expect(acharRegiao("inexistente")).toBeUndefined();
  });

  it("prefixo SGB da regiao casa com a UF", () => {
    for (const r of REGIOES) {
      expect(r.prefixoSgb).toContain(r.uf);
    }
  });
});
