import { describe, expect, it } from "vitest";
import { preverNivel, VERSAO_MODELO, type ParametrosPrevisao } from "./previsao";

function params(parcial: Partial<ParametrosPrevisao> = {}): ParametrosPrevisao {
  return {
    rodadaId: "R-1",
    postoId: "P-1",
    nivelAtualM: 2,
    chuvaAcumulada6hMm: 0,
    chuvaPrevista24hMm: 0,
    tempoConcentracaoHoras: 8,
    horizontes: [6, 12, 24],
    tsRodada: "2026-05-01T12:00:00.000Z",
    ...parcial,
  };
}

describe("preverNivel", () => {
  it("gera uma previsao por horizonte pedido", () => {
    const p = preverNivel(params());
    expect(p).toHaveLength(3);
    expect(p.map((x) => x.horizonteHoras)).toEqual([6, 12, 24]);
  });

  it("identifica a versao do modelo e a rodada — CA-MOD-02", () => {
    const p = preverNivel(params());
    expect(p[0]?.versaoModelo).toBe(VERSAO_MODELO);
    expect(p[0]?.rodadaId).toBe("R-1");
    expect(p[0]?.tsRodada).toBe("2026-05-01T12:00:00.000Z");
  });

  it("entrega limite inferior e superior em toda previsao", () => {
    for (const previsao of preverNivel(params())) {
      // No leito seco (nivel previsto 0) o limite inferior tambem satura em 0 —
      // nao ha como ficar abaixo de um nivel fisicamente impossivel so para
      // manter a desigualdade estrita.
      if (previsao.nivelPrevistoM === 0) {
        expect(previsao.limiteInf).toBeLessThanOrEqual(previsao.nivelPrevistoM);
      } else {
        expect(previsao.limiteInf).toBeLessThan(previsao.nivelPrevistoM);
      }
      expect(previsao.limiteSup).toBeGreaterThan(previsao.nivelPrevistoM);
    }
  });

  it("alarga a incerteza conforme o horizonte cresce", () => {
    const p = preverNivel(params());
    const faixa = (i: number) => {
      const x = p[i];
      if (!x) throw new Error("previsao ausente");
      return x.limiteSup - x.limiteInf;
    };
    expect(faixa(2)).toBeGreaterThan(faixa(0));
  });

  it("sobe o nivel quando ha chuva significativa", () => {
    const seco = preverNivel(params());
    const chuvoso = preverNivel(params({ chuvaAcumulada6hMm: 80, chuvaPrevista24hMm: 120 }));
    const nivelSeco = seco[1]?.nivelPrevistoM ?? 0;
    const nivelChuvoso = chuvoso[1]?.nivelPrevistoM ?? 0;
    expect(nivelChuvoso).toBeGreaterThan(nivelSeco);
  });

  it("recede lentamente quando nao ha chuva", () => {
    const p = preverNivel(params({ nivelAtualM: 5 }));
    expect(p[2]?.nivelPrevistoM).toBeLessThan(5);
  });

  it("nunca devolve nivel abaixo do leito seco", () => {
    const p = preverNivel(params({ nivelAtualM: 0.05, horizontes: [6, 12, 24, 48] }));
    for (const previsao of p) {
      expect(previsao.nivelPrevistoM).toBeGreaterThanOrEqual(0);
    }
  });

  it("e deterministico: mesma entrada, mesma saida", () => {
    expect(preverNivel(params({ chuvaAcumulada6hMm: 45 }))).toEqual(
      preverNivel(params({ chuvaAcumulada6hMm: 45 })),
    );
  });
});
