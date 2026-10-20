import { describe, expect, it } from "vitest";
import { alternarEstadoAtivo, calcularGemeoDigital, estadosIniciaisAtivos } from "./gemeo";
import type { AtivoProtecao, Limiar, ZonaRisco } from "@/dominio/tipos";
import type { RedeInfluencia } from "@/dominio/twin";

function zona(zonaId: string, populacao: number): ZonaRisco {
  return {
    zonaId,
    nome: zonaId,
    codigoSetorSgb: "SGB-1",
    subBaciaId: "SB-1",
    grauRisco: "alto",
    tipo: "inundacao",
    familiasEstimadas: Math.round(populacao / 3),
    populacaoEstimada: populacao,
    geometria: { aneis: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] },
  };
}

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

const comporta: AtivoProtecao = {
  ativoId: "CP-01",
  nome: "Comporta 1",
  tipo: "comporta",
  posicao: [0.5, 0.5],
  situacaoProntidao: "pronto",
};

const rede: RedeInfluencia = {
  nos: [{ id: "CP-01", tipo: "comporta" }],
  arestas: [
    { de: "CP-01", zonaId: "Z-1", efeitoCotaM: -0.35 },
    { de: "CP-01", zonaId: "Z-2", efeitoCotaM: 0.12 },
  ],
};

const params = {
  rede,
  zonas: [zona("Z-1", 1000), zona("Z-2", 500)],
  limiares: [limiarCota("Z-1", 4.0), limiarCota("Z-2", 4.0)],
  ativos: [comporta],
  cotaPrevistaM: 4.1,
};

describe("estadosIniciaisAtivos", () => {
  it("comporta comeca aberta e ebap operante quando pronta", () => {
    const est = estadosIniciaisAtivos([
      comporta,
      { ...comporta, ativoId: "EB-01", tipo: "ebap" },
    ]);
    expect(est["CP-01"]).toBe("aberta");
    expect(est["EB-01"]).toBe("operante");
  });

  it("ativo em manutencao comeca em manutencao", () => {
    const est = estadosIniciaisAtivos([{ ...comporta, situacaoProntidao: "manutencao" }]);
    expect(est["CP-01"]).toBe("manutencao");
  });
});

describe("alternarEstadoAtivo", () => {
  it("alterna comporta entre aberta e fechada", () => {
    expect(alternarEstadoAtivo(comporta, "aberta")).toBe("fechada");
    expect(alternarEstadoAtivo(comporta, "fechada")).toBe("aberta");
  });

  it("nao altera um ativo em manutencao", () => {
    const emManutencao: AtivoProtecao = { ...comporta, situacaoProntidao: "manutencao" };
    expect(alternarEstadoAtivo(emManutencao, "manutencao")).toBe("manutencao");
  });

  it("alterna ebap entre operante e desligada", () => {
    const ebap: AtivoProtecao = { ...comporta, tipo: "ebap" };
    expect(alternarEstadoAtivo(ebap, "operante")).toBe("desligada");
    expect(alternarEstadoAtivo(ebap, "desligada")).toBe("operante");
  });
});

describe("calcularGemeoDigital", () => {
  it("fechar a comporta protege a zona a jusante e represa a montante", () => {
    // baseline: comporta aberta -> ambas as zonas expostas (cota 4.1 >= 4.0)
    // what-if: comporta fechada -> Z-1 cai para 3.75 (protegida), Z-2 sobe para 4.22 (segue exposta)
    const g = calcularGemeoDigital(params, { "CP-01": "fechada" });
    expect(g.populacaoBase).toBe(1500);
    expect(g.populacaoWhatIf).toBe(500);
    expect(g.populacaoProtegida).toBe(1000);
  });

  it("sem acao do operador, nada muda em relacao a base", () => {
    const g = calcularGemeoDigital(params, { "CP-01": "aberta" });
    expect(g.populacaoProtegida).toBe(0);
  });

  it("marca como operavel apenas ativos fora de manutencao", () => {
    const g = calcularGemeoDigital(
      { ...params, ativos: [{ ...comporta, situacaoProntidao: "manutencao" }] },
      { "CP-01": "manutencao" },
    );
    expect(g.ativos[0]!.operavel).toBe(false);
  });
});
