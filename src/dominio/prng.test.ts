import { describe, expect, it } from "vitest";
import { criarAleatorio, entre, inteiroEntre } from "./prng";

describe("criarAleatorio", () => {
  it("produz a mesma sequencia para a mesma semente", () => {
    const a = criarAleatorio(42);
    const b = criarAleatorio(42);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("produz sequencias diferentes para sementes diferentes", () => {
    const a = criarAleatorio(1);
    const b = criarAleatorio(2);
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()]);
  });

  it("gera valores no intervalo [0, 1)", () => {
    const r = criarAleatorio(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("entre", () => {
  it("mantem os valores dentro dos limites", () => {
    const r = criarAleatorio(3);
    for (let i = 0; i < 500; i++) {
      const v = entre(r, -5, 5);
      expect(v).toBeGreaterThanOrEqual(-5);
      expect(v).toBeLessThan(5);
    }
  });
});

describe("inteiroEntre", () => {
  it("inclui ambos os extremos e nunca os ultrapassa", () => {
    const r = criarAleatorio(11);
    const vistos = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = inteiroEntre(r, 1, 3);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(3);
      vistos.add(v);
    }
    expect(vistos).toEqual(new Set([1, 2, 3]));
  });
});
