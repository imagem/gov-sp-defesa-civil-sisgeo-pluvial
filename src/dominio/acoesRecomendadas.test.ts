import { describe, expect, it } from "vitest";
import { acoesParaAlerta } from "./acoesRecomendadas";

describe("acoesParaAlerta", () => {
  it("sugere protocolo de deslizamento para zona de encosta", () => {
    const acoes = acoesParaAlerta({ tipo: "deslizamento" }, "alta");
    expect(acoes.length).toBeGreaterThan(0);
    expect(acoes.some((a) => a.titulo.toLowerCase().includes("encosta"))).toBe(true);
  });

  it("sugere protocolo de inundacao para zona ribeirinha", () => {
    const acoes = acoesParaAlerta({ tipo: "inundacao" }, "alta");
    expect(acoes.some((a) => /abrigos|resgate|evacua/i.test(a.titulo))).toBe(true);
  });

  it("severidades altas devolvem mais acoes que severidades menores", () => {
    const grave = acoesParaAlerta({ tipo: "inundacao" }, "muito_alta");
    const leve = acoesParaAlerta({ tipo: "inundacao" }, "media");
    expect(grave.length).toBeGreaterThan(leve.length);
  });

  it("sempre devolve pelo menos uma acao", () => {
    for (const sev of ["baixa", "media", "alta", "muito_alta"] as const) {
      for (const tipo of ["inundacao", "deslizamento"] as const) {
        expect(acoesParaAlerta({ tipo }, sev).length).toBeGreaterThan(0);
      }
    }
  });

  it("responsavel nunca vem vazio", () => {
    for (const acao of acoesParaAlerta({ tipo: "deslizamento" }, "muito_alta")) {
      expect(acao.responsavel.trim().length).toBeGreaterThan(0);
    }
  });
});
