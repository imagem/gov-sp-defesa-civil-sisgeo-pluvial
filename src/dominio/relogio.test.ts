import { describe, expect, it } from "vitest";
import { RelogioSimulado } from "./relogio";

describe("RelogioSimulado", () => {
  it("inicia no instante informado", () => {
    const relogio = new RelogioSimulado(new Date("2026-05-01T00:00:00.000Z"));
    expect(relogio.iso).toBe("2026-05-01T00:00:00.000Z");
  });

  it("avanca em minutos", () => {
    const relogio = new RelogioSimulado(new Date("2026-05-01T00:00:00.000Z"));
    relogio.avancarMinutos(90);
    expect(relogio.iso).toBe("2026-05-01T01:30:00.000Z");
  });

  it("calcula minutos decorridos desde um instante ISO", () => {
    const relogio = new RelogioSimulado(new Date("2026-05-01T06:00:00.000Z"));
    expect(relogio.minutosDesde("2026-05-01T05:30:00.000Z")).toBe(30);
  });

  it("retorna valor negativo para instante futuro", () => {
    const relogio = new RelogioSimulado(new Date("2026-05-01T06:00:00.000Z"));
    expect(relogio.minutosDesde("2026-05-01T07:00:00.000Z")).toBe(-60);
  });

  it("nao depende do relogio do sistema", () => {
    const relogio = new RelogioSimulado(new Date("2026-05-01T00:00:00.000Z"));
    const antes = relogio.iso;
    // qualquer tempo real que passe aqui nao pode afetar o relogio simulado
    expect(relogio.iso).toBe(antes);
  });
});
