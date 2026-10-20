import { describe, expect, it } from "vitest";
import { cotaEfetivaPorZona, estaMitigando, type RedeInfluencia } from "./twin";

describe("estaMitigando", () => {
  it("comporta mitiga quando fechada", () => {
    expect(estaMitigando("comporta", "fechada")).toBe(true);
    expect(estaMitigando("comporta", "aberta")).toBe(false);
    expect(estaMitigando("comporta", "inoperante")).toBe(false);
  });

  it("ebap mitiga quando operante", () => {
    expect(estaMitigando("ebap", "operante")).toBe(true);
    expect(estaMitigando("ebap", "manutencao")).toBe(false);
  });

  it("dique mitiga quando integro", () => {
    expect(estaMitigando("dique", "integro")).toBe(true);
    expect(estaMitigando("dique", "rompido")).toBe(false);
  });
});

// Rede minima: a comporta CP-01 protege a zona a jusante (Z-JUS) e, ao fechar,
// represa agua para a zona a montante (Z-MON). E o efeito semantico central do
// gemeo digital (RF-TWN): mudar o estado de UM ativo influencia OUTRAS zonas.
const rede: RedeInfluencia = {
  nos: [{ id: "CP-01", tipo: "comporta" }],
  arestas: [
    { de: "CP-01", zonaId: "Z-JUS", efeitoCotaM: -0.3 },
    { de: "CP-01", zonaId: "Z-MON", efeitoCotaM: 0.12 },
  ],
};

const cotaBase = new Map([
  ["Z-JUS", 4.0],
  ["Z-MON", 4.0],
]);

describe("cotaEfetivaPorZona", () => {
  it("mantem a cota base quando o ativo nao esta mitigando", () => {
    const efetiva = cotaEfetivaPorZona(rede, new Map([["CP-01", "aberta"]]), cotaBase);
    expect(efetiva.get("Z-JUS")).toBe(4.0);
    expect(efetiva.get("Z-MON")).toBe(4.0);
  });

  it("propaga o efeito para as zonas quando a comporta fecha", () => {
    const efetiva = cotaEfetivaPorZona(rede, new Map([["CP-01", "fechada"]]), cotaBase);
    // jusante protegida (desce), montante represada (sobe)
    expect(efetiva.get("Z-JUS")).toBe(3.7);
    expect(efetiva.get("Z-MON")).toBe(4.12);
  });

  it("trata no ausente do mapa de estados como nao mitigando", () => {
    const efetiva = cotaEfetivaPorZona(rede, new Map(), cotaBase);
    expect(efetiva.get("Z-JUS")).toBe(4.0);
  });

  it("soma efeitos de multiplos ativos sobre a mesma zona", () => {
    const rede2: RedeInfluencia = {
      nos: [
        { id: "CP-01", tipo: "comporta" },
        { id: "EB-01", tipo: "ebap" },
      ],
      arestas: [
        { de: "CP-01", zonaId: "Z-JUS", efeitoCotaM: -0.3 },
        { de: "EB-01", zonaId: "Z-JUS", efeitoCotaM: -0.2 },
      ],
    };
    const efetiva = cotaEfetivaPorZona(
      rede2,
      new Map([
        ["CP-01", "fechada"],
        ["EB-01", "operante"],
      ]),
      new Map([["Z-JUS", 4.0]]),
    );
    expect(efetiva.get("Z-JUS")).toBe(3.5);
  });

  it("nao deixa a cota efetiva ficar negativa", () => {
    const redeForte: RedeInfluencia = {
      nos: [{ id: "CP-01", tipo: "comporta" }],
      arestas: [{ de: "CP-01", zonaId: "Z-JUS", efeitoCotaM: -10 }],
    };
    const efetiva = cotaEfetivaPorZona(
      redeForte,
      new Map([["CP-01", "fechada"]]),
      new Map([["Z-JUS", 4.0]]),
    );
    expect(efetiva.get("Z-JUS")).toBe(0);
  });
});
