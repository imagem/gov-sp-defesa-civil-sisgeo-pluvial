import { describe, expect, it } from "vitest";
import { CAMADAS_IDS, visibilidadePadrao } from "./visibilidade";

describe("visibilidadePadrao", () => {
  it("liga todas as camadas", () => {
    const v = visibilidadePadrao();
    expect(Object.keys(v).sort()).toEqual([...CAMADAS_IDS].sort());
    expect(Object.values(v).every((x) => x === true)).toBe(true);
  });

  it("devolve um objeto novo a cada chamada", () => {
    expect(visibilidadePadrao()).not.toBe(visibilidadePadrao());
  });
});
