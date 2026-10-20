import { describe, expect, it } from "vitest";
import { montarContingencia, resolverPrevisoes, type PrevisaoPendente } from "./desempenho";

describe("resolverPrevisoes", () => {
  const pendentes: PrevisaoPendente[] = [
    { alvoIso: "2026-05-01T09:00:00.000Z", nivelPrevistoM: 3.0 },
    { alvoIso: "2026-05-01T15:00:00.000Z", nivelPrevistoM: 4.0 },
  ];

  it("pareia com o nivel realizado as previsoes cujo alvo ja chegou", () => {
    const { pares, pendentesRestantes } = resolverPrevisoes(
      pendentes,
      "2026-05-01T09:00:00.000Z",
      3.2,
    );
    expect(pares).toEqual([{ previsto: 3.0, realizado: 3.2 }]);
    expect(pendentesRestantes).toHaveLength(1);
    expect(pendentesRestantes[0]!.nivelPrevistoM).toBe(4.0);
  });

  it("nao resolve nada quando nenhum alvo chegou", () => {
    const { pares, pendentesRestantes } = resolverPrevisoes(
      pendentes,
      "2026-05-01T06:00:00.000Z",
      2.5,
    );
    expect(pares).toEqual([]);
    expect(pendentesRestantes).toHaveLength(2);
  });

  it("resolve todas quando o tempo passou de todos os alvos", () => {
    const { pares, pendentesRestantes } = resolverPrevisoes(
      pendentes,
      "2026-05-01T18:00:00.000Z",
      5.0,
    );
    expect(pares).toHaveLength(2);
    expect(pendentesRestantes).toHaveLength(0);
  });
});

describe("montarContingencia", () => {
  it("classifica acertos, perdas e falsos alarmes", () => {
    // alertadas: Z1, Z2, Z3 ; verdadeiras (de fato inundadas): Z2, Z3, Z4
    // acerto = Z2, Z3 ; falso alarme = Z1 ; perda = Z4
    const c = montarContingencia(["Z1", "Z2", "Z3"], ["Z2", "Z3", "Z4"]);
    expect(c.acertos).toBe(2);
    expect(c.falsosAlarmes).toBe(1);
    expect(c.perdas).toBe(1);
  });

  it("zera tudo quando nao houve alerta nem inundacao", () => {
    const c = montarContingencia([], []);
    expect(c).toEqual({ acertos: 0, perdas: 0, falsosAlarmes: 0 });
  });

  it("ignora zonas repetidas", () => {
    const c = montarContingencia(["Z1", "Z1"], ["Z1"]);
    expect(c.acertos).toBe(1);
    expect(c.falsosAlarmes).toBe(0);
  });
});
