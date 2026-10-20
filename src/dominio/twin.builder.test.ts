import { describe, expect, it } from "vitest";
import { construirRedeInfluencia, populacaoExpostaSobCota } from "./twin";
import type { AtivoProtecao, Limiar, ZonaRisco } from "./tipos";

function zona(parcial: Partial<ZonaRisco> & Pick<ZonaRisco, "zonaId">): ZonaRisco {
  return {
    nome: parcial.zonaId,
    codigoSetorSgb: "SGB-1",
    subBaciaId: "SB-1",
    grauRisco: "alto",
    tipo: "inundacao",
    familiasEstimadas: 100,
    populacaoEstimada: 320,
    geometria: { aneis: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] },
    ...parcial,
  };
}

function ativo(parcial: Partial<AtivoProtecao> & Pick<AtivoProtecao, "ativoId" | "posicao">): AtivoProtecao {
  return {
    nome: parcial.ativoId,
    tipo: "comporta",
    situacaoProntidao: "pronto",
    ...parcial,
  };
}

describe("construirRedeInfluencia", () => {
  it("da a cada zona os ativos mais proximos dela como protetores", () => {
    const zonas = [
      zona({ zonaId: "Z-PERTO", geometria: { aneis: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] } }),
      zona({ zonaId: "Z-LONGE", geometria: { aneis: [[[10, 10], [10, 11], [11, 11], [11, 10], [10, 10]]] } }),
    ];
    const ativos = [
      ativo({ ativoId: "CP-PERTO", posicao: [0.5, 0.5], tipo: "comporta" }),
      ativo({ ativoId: "CP-LONGE", posicao: [10.5, 10.5], tipo: "comporta" }),
      ativo({ ativoId: "CP-MEIO", posicao: [5, 5], tipo: "comporta" }),
    ];

    const rede = construirRedeInfluencia(zonas, ativos);

    function protetoresDe(zonaId: string) {
      return rede.arestas.filter((a) => a.zonaId === zonaId && a.efeitoCotaM < 0).map((a) => a.de);
    }

    // Cada zona recebe os 2 ativos mais proximos: o vizinho imediato e o do meio.
    expect(protetoresDe("Z-PERTO").sort()).toEqual(["CP-MEIO", "CP-PERTO"]);
    expect(protetoresDe("Z-LONGE").sort()).toEqual(["CP-LONGE", "CP-MEIO"]);
    // O ativo do canto oposto nunca protege a zona distante dele.
    expect(protetoresDe("Z-PERTO")).not.toContain("CP-LONGE");
    expect(protetoresDe("Z-LONGE")).not.toContain("CP-PERTO");
  });

  it("nenhuma zona fica sem ativo capaz de agir sobre ela", () => {
    const zonas = [
      zona({ zonaId: "Z-1", geometria: { aneis: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] } }),
      zona({ zonaId: "Z-2", geometria: { aneis: [[[8, 8], [8, 9], [9, 9], [9, 8], [8, 8]]] } }),
      zona({ zonaId: "Z-3", geometria: { aneis: [[[20, 20], [20, 21], [21, 21], [21, 20], [20, 20]]] } }),
    ];
    // Todos os ativos amontoados perto de Z-1: antes, Z-2 e Z-3 ficavam orfas.
    const ativos = [
      ativo({ ativoId: "CP-01", posicao: [0.4, 0.4] }),
      ativo({ ativoId: "CP-02", posicao: [0.5, 0.5] }),
      ativo({ ativoId: "CP-03", posicao: [0.6, 0.6] }),
    ];

    const rede = construirRedeInfluencia(zonas, ativos);

    for (const zonaId of ["Z-1", "Z-2", "Z-3"]) {
      expect(rede.arestas.some((a) => a.zonaId === zonaId && a.efeitoCotaM < 0)).toBe(true);
    }
  });

  it("registra o tipo de cada ativo como no da rede", () => {
    const zonas = [zona({ zonaId: "Z-1" })];
    const ativos = [
      ativo({ ativoId: "CP-01", posicao: [0.5, 0.5], tipo: "comporta" }),
      ativo({ ativoId: "EB-01", posicao: [0.5, 0.5], tipo: "ebap" }),
    ];
    const rede = construirRedeInfluencia(zonas, ativos);
    expect(rede.nos.find((n) => n.id === "CP-01")!.tipo).toBe("comporta");
    expect(rede.nos.find((n) => n.id === "EB-01")!.tipo).toBe("ebap");
  });

  it("nao cria arestas quando nao ha zonas", () => {
    const rede = construirRedeInfluencia([], [ativo({ ativoId: "CP-01", posicao: [0, 0] })]);
    expect(rede.arestas).toHaveLength(0);
  });
});

describe("populacaoExpostaSobCota", () => {
  const zonas = [
    zona({ zonaId: "Z-1", populacaoEstimada: 1000 }),
    zona({ zonaId: "Z-2", populacaoEstimada: 500 }),
  ];
  const limiaresCota: Limiar[] = [
    limiarCota("Z-1", 4.0),
    limiarCota("Z-2", 4.0),
  ];

  it("conta a populacao das zonas cuja cota efetiva atinge o limiar", () => {
    const cota = new Map([
      ["Z-1", 4.2], // acima do limiar -> exposta
      ["Z-2", 3.5], // abaixo -> protegida
    ]);
    expect(populacaoExpostaSobCota(zonas, limiaresCota, cota)).toBe(1000);
  });

  it("e zero quando nenhuma zona atinge o limiar", () => {
    const cota = new Map([
      ["Z-1", 1.0],
      ["Z-2", 1.0],
    ]);
    expect(populacaoExpostaSobCota(zonas, limiaresCota, cota)).toBe(0);
  });
});

function limiarCota(zonaId: string, valor: number): Limiar {
  return {
    limiarId: `L-${zonaId}-COTA`,
    zonaId,
    variavel: "nivel_m",
    janelaHoras: 0,
    operador: ">=",
    valor,
    severidade: "alta",
    origem: "previsao",
    versao: 1,
    vigenciaInicio: "2026-01-01T00:00:00.000Z",
    vigenciaFim: null,
    justificativaTecnica: "teste",
    autor: "teste",
  };
}
