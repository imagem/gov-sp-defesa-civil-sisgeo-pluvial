import { describe, expect, it } from "vitest";
import { desempenhoAlerta, mae, nse, rmse, vies } from "./metricas";

describe("rmse", () => {
  it("e zero quando previsto reproduz o observado", () => {
    expect(rmse([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it("e a raiz do erro quadratico medio", () => {
    // erros constantes de +1 -> rmse = 1
    expect(rmse([1, 2, 3], [2, 3, 4])).toBe(1);
  });

  it("recusa series de tamanhos diferentes", () => {
    expect(() => rmse([1, 2], [1])).toThrow();
  });

  it("recusa serie vazia", () => {
    expect(() => rmse([], [])).toThrow();
  });
});

describe("mae", () => {
  it("e a media do erro absoluto, ignorando o sinal", () => {
    // erros +2 e -2 -> media absoluta = 2
    expect(mae([10, 10], [12, 8])).toBe(2);
  });
});

describe("vies", () => {
  it("e positivo quando o modelo superestima", () => {
    expect(vies([1, 2, 3], [2, 3, 4])).toBe(1);
  });

  it("e negativo quando o modelo subestima", () => {
    expect(vies([2, 3, 4], [1, 2, 3])).toBe(-1);
  });
});

describe("nse", () => {
  it("e 1 quando previsto reproduz o observado", () => {
    expect(nse([1, 2, 3], [1, 2, 3])).toBe(1);
  });

  it("cai abaixo de zero quando o modelo erra mais que a media", () => {
    // obs media = 2; sum((obs-prev)^2)=2 ; sum((obs-media)^2)=2 -> 1 - 2/2 ...
    // erros de +1 constante: sum((obs-prev)^2)=3, denom=2 -> nse = 1 - 1.5 = -0.5
    expect(nse([1, 2, 3], [2, 3, 4])).toBe(-0.5);
  });

  it("recusa serie observada sem variancia (NSE indefinido)", () => {
    expect(() => nse([2, 2, 2], [1, 2, 3])).toThrow();
  });
});

describe("desempenhoAlerta", () => {
  it("calcula POD, FAR e CSI a partir da tabela de contingencia", () => {
    // 8 acertos, 2 perdas, 2 falsos alarmes
    const d = desempenhoAlerta({ acertos: 8, perdas: 2, falsosAlarmes: 2 });
    expect(d.pod).toBeCloseTo(0.8, 5); // 8/(8+2)
    expect(d.far).toBeCloseTo(0.2, 5); // 2/(8+2)
    expect(d.csi).toBeCloseTo(0.6667, 3); // 8/(8+2+2)
  });

  it("retorna zero em vez de divisao por zero quando nao ha eventos", () => {
    const d = desempenhoAlerta({ acertos: 0, perdas: 0, falsosAlarmes: 0 });
    expect(d.pod).toBe(0);
    expect(d.far).toBe(0);
    expect(d.csi).toBe(0);
  });

  it("recusa contagens negativas", () => {
    expect(() => desempenhoAlerta({ acertos: -1, perdas: 0, falsosAlarmes: 0 })).toThrow();
  });
});
