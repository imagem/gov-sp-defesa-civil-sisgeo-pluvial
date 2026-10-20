import { describe, expect, it } from "vitest";
import { acumular, atingeLimiar, limiaresVigentes } from "./limiar";
import type { Limiar, Observacao } from "./tipos";

function obs(parcial: Partial<Observacao>): Observacao {
  return {
    observacaoId: "o",
    estacaoId: "E-1",
    fonteId: "CEMADEN",
    variavel: "chuva_mm",
    valor: 10,
    unidade: "mm",
    tsOrigem: "2026-05-01T09:00:00.000Z",
    tsIngestao: "2026-05-01T09:00:10.000Z",
    qualidade: "aprovada",
    ...parcial,
  };
}

const limiarBase: Limiar = {
  limiarId: "L-1",
  zonaId: "Z-27",
  variavel: "chuva_mm",
  janelaHoras: 6,
  operador: ">=",
  valor: 60,
  severidade: "alta",
  origem: "observacao",
  versao: 1,
  vigenciaInicio: "2026-01-01T00:00:00.000Z",
  vigenciaFim: null,
  justificativaTecnica: "Limiar de referencia da zona",
  autor: "analista.demo",
};

describe("acumular", () => {
  it("soma apenas leituras aprovadas dentro da janela", () => {
    const leituras = [
      obs({ valor: 20, tsOrigem: "2026-05-01T09:00:00.000Z" }),
      obs({ valor: 25, tsOrigem: "2026-05-01T11:00:00.000Z" }),
      obs({ valor: 30, tsOrigem: "2026-05-01T11:30:00.000Z", qualidade: "reprovada" }),
      obs({ valor: 40, tsOrigem: "2026-05-01T02:00:00.000Z" }),
    ];
    const total = acumular(leituras, "chuva_mm", ["E-1"], 6, "2026-05-01T12:00:00.000Z");
    expect(total).toBe(45);
  });

  it("ignora estacoes fora da lista", () => {
    const leituras = [
      obs({ valor: 20, estacaoId: "E-1" }),
      obs({ valor: 99, estacaoId: "E-2" }),
    ];
    expect(acumular(leituras, "chuva_mm", ["E-1"], 6, "2026-05-01T12:00:00.000Z")).toBe(20);
  });

  it("retorna zero quando nao ha leitura na janela", () => {
    expect(acumular([], "chuva_mm", ["E-1"], 6, "2026-05-01T12:00:00.000Z")).toBe(0);
  });

  // Regra de integridade 8.5 do SPEC-H1.
  it("nunca soma leitura suspeita ou reprovada", () => {
    const leituras = [
      obs({ valor: 100, qualidade: "suspeita" }),
      obs({ valor: 100, qualidade: "reprovada" }),
    ];
    expect(acumular(leituras, "chuva_mm", ["E-1"], 6, "2026-05-01T12:00:00.000Z")).toBe(0);
  });
});

describe("limiaresVigentes", () => {
  it("mantem limiar sem data de fim", () => {
    expect(limiaresVigentes([limiarBase], "2026-05-01T00:00:00.000Z")).toHaveLength(1);
  });

  it("descarta limiar cuja vigencia terminou", () => {
    const encerrado = { ...limiarBase, vigenciaFim: "2026-04-01T00:00:00.000Z" };
    expect(limiaresVigentes([encerrado], "2026-05-01T00:00:00.000Z")).toHaveLength(0);
  });

  it("descarta limiar que ainda nao entrou em vigor", () => {
    const futuro = { ...limiarBase, vigenciaInicio: "2026-06-01T00:00:00.000Z" };
    expect(limiaresVigentes([futuro], "2026-05-01T00:00:00.000Z")).toHaveLength(0);
  });
});

describe("atingeLimiar", () => {
  it("aceita igualdade quando o operador e >=", () => {
    expect(atingeLimiar(limiarBase, 60)).toBe(true);
  });

  it("rejeita igualdade quando o operador e >", () => {
    expect(atingeLimiar({ ...limiarBase, operador: ">" }, 60)).toBe(false);
  });

  it("aceita valor acima do limiar", () => {
    expect(atingeLimiar(limiarBase, 62)).toBe(true);
  });

  it("rejeita valor abaixo do limiar", () => {
    expect(atingeLimiar(limiarBase, 59.9)).toBe(false);
  });
});
