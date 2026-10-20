import { describe, expect, it, vi } from "vitest";
import { alternarTema, aplicarTemaNoElemento, lerTemaSalvo, salvarTema } from "./tema";

describe("alternarTema", () => {
  it("alterna de escuro para claro e volta", () => {
    expect(alternarTema("escuro")).toBe("claro");
    expect(alternarTema("claro")).toBe("escuro");
  });
});

describe("lerTemaSalvo", () => {
  it("retorna escuro quando nao ha nada salvo", () => {
    expect(lerTemaSalvo({ getItem: () => null })).toBe("escuro");
  });

  it("retorna claro quando salvo assim", () => {
    expect(lerTemaSalvo({ getItem: () => "claro" })).toBe("claro");
  });

  it("ignora valor invalido salvo e usa escuro", () => {
    expect(lerTemaSalvo({ getItem: () => "sepia" })).toBe("escuro");
  });

  it("retorna escuro quando nao ha armazenamento disponivel", () => {
    expect(lerTemaSalvo(undefined)).toBe("escuro");
  });
});

describe("salvarTema", () => {
  it("grava o tema informado sob a chave demo.tema", () => {
    const setItem = vi.fn();
    salvarTema({ setItem }, "claro");
    expect(setItem).toHaveBeenCalledWith("demo.tema", "claro");
  });
});

describe("aplicarTemaNoElemento", () => {
  it("define data-tema=claro no elemento", () => {
    const setAttribute = vi.fn();
    const removeAttribute = vi.fn();
    aplicarTemaNoElemento({ setAttribute, removeAttribute }, "claro");
    expect(setAttribute).toHaveBeenCalledWith("data-tema", "claro");
    expect(removeAttribute).not.toHaveBeenCalled();
  });

  it("remove data-tema quando volta para escuro", () => {
    const setAttribute = vi.fn();
    const removeAttribute = vi.fn();
    aplicarTemaNoElemento({ setAttribute, removeAttribute }, "escuro");
    expect(removeAttribute).toHaveBeenCalledWith("data-tema");
    expect(setAttribute).not.toHaveBeenCalled();
  });
});
