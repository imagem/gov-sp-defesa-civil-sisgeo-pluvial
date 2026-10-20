import { describe, expect, it } from "vitest";
import { avaliarQualidade } from "./qc";
import type { Observacao } from "./tipos";

function leitura(parcial: Partial<Observacao> = {}): Observacao {
  return {
    observacaoId: "obs-1",
    estacaoId: "E-042",
    fonteId: "CEMADEN",
    variavel: "chuva_mm",
    valor: 12,
    unidade: "mm",
    tsOrigem: "2026-05-01T10:00:00.000Z",
    tsIngestao: "2026-05-01T10:00:30.000Z",
    qualidade: "aprovada",
    ...parcial,
  };
}

describe("avaliarQualidade", () => {
  it("aprova leitura plausivel sem historico", () => {
    expect(avaliarQualidade(leitura(), [])).toEqual({ qualidade: "aprovada" });
  });

  // Espelha CA-ING-04 do SPEC-H1.
  it("reprova leitura de chuva fora da faixa fisica", () => {
    const resultado = avaliarQualidade(leitura({ valor: 2000 }), []);
    expect(resultado.qualidade).toBe("reprovada");
    expect(resultado.motivo).toBe("fora de faixa");
  });

  it("reprova valor negativo de chuva", () => {
    expect(avaliarQualidade(leitura({ valor: -3 }), []).qualidade).toBe("reprovada");
  });

  it("reprova leitura fora de ordem temporal", () => {
    const anterior = leitura({ tsOrigem: "2026-05-01T11:00:00.000Z" });
    const resultado = avaliarQualidade(leitura({ tsOrigem: "2026-05-01T10:00:00.000Z" }), [anterior]);
    expect(resultado.qualidade).toBe("reprovada");
    expect(resultado.motivo).toBe("fora de ordem temporal");
  });

  it("marca como suspeita um salto abrupto de nivel", () => {
    const anterior = leitura({
      variavel: "nivel_m",
      valor: 2,
      unidade: "m",
      tsOrigem: "2026-05-01T09:50:00.000Z",
    });
    const resultado = avaliarQualidade(
      leitura({ variavel: "nivel_m", valor: 9, unidade: "m" }),
      [anterior],
    );
    expect(resultado.qualidade).toBe("suspeita");
    expect(resultado.motivo).toBe("salto abrupto");
  });

  it("marca como suspeita um sensor travado", () => {
    const historico = Array.from({ length: 6 }, (_, i) =>
      leitura({
        variavel: "nivel_m",
        valor: 3.2,
        unidade: "m",
        tsOrigem: `2026-05-01T0${i + 1}:00:00.000Z`,
      }),
    );
    const resultado = avaliarQualidade(
      leitura({ variavel: "nivel_m", valor: 3.2, unidade: "m" }),
      historico,
    );
    expect(resultado.qualidade).toBe("suspeita");
    expect(resultado.motivo).toBe("sensor travado");
  });

  it("nao confunde series de variaveis diferentes", () => {
    const chuva = leitura({ variavel: "chuva_mm", valor: 0 });
    const resultado = avaliarQualidade(
      leitura({ variavel: "nivel_m", valor: 3.5, unidade: "m" }),
      [chuva],
    );
    expect(resultado.qualidade).toBe("aprovada");
  });
});
