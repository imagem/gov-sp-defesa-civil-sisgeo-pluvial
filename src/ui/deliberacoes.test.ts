import { describe, expect, it } from "vitest";
import { criarEstadoInicial, type Boletim } from "@/agentes/tipos";
import type { Alerta, ZonaRisco } from "@/dominio/tipos";
import type { Mundo } from "@/simulacao/mundo";
import { montarDeliberacoes } from "./deliberacoes";

function alerta(parcial: Partial<Alerta> & { alertaId: string }): Alerta {
  return {
    zonaId: "z1",
    limiarId: "l1",
    severidade: "alta",
    origem: "previsao",
    estado: "candidato",
    valorDisparo: 1,
    tsDeteccao: "2026-01-01T10:00:00.000Z",
    tsValidacao: null,
    tsExpedicao: null,
    tsEncerramento: null,
    leadTimeHoras: null,
    operadorValidador: null,
    motivoDescarte: null,
    evidencias: [],
    atualizacoes: [],
    ...parcial,
  };
}

const mundo = {
  zonas: [{ zonaId: "z1", nome: "Partenon" } as ZonaRisco],
} as unknown as Mundo;

function estadoCom(alertas: Alerta[], boletins: Boletim[] = []) {
  const estado = criarEstadoInicial(2);
  estado.alertas = alertas;
  estado.boletins = boletins;
  return estado;
}

describe("montarDeliberacoes", () => {
  it("resolve o nome da zona a partir do mundo (fallback: zonaId)", () => {
    const linhas = montarDeliberacoes(
      estadoCom([alerta({ alertaId: "a1" }), alerta({ alertaId: "a2", zonaId: "zx" })]),
      mundo
    );
    const porId = new Map(linhas.map((l) => [l.alertaId, l]));
    expect(porId.get("a1")?.zonaNome).toBe("Partenon");
    expect(porId.get("a2")?.zonaNome).toBe("zx");
  });

  it("marca temBoletim quando existe boletim para o alerta", () => {
    const boletim = { boletimId: "b1", alertaId: "a1" } as Boletim;
    const linhas = montarDeliberacoes(
      estadoCom([alerta({ alertaId: "a1" }), alerta({ alertaId: "a2" })], [boletim]),
      mundo
    );
    expect(linhas.find((l) => l.alertaId === "a1")?.temBoletim).toBe(true);
    expect(linhas.find((l) => l.alertaId === "a2")?.temBoletim).toBe(false);
  });

  it("inclui alertas descartados (com motivo) e encerrados", () => {
    const linhas = montarDeliberacoes(
      estadoCom([
        alerta({
          alertaId: "a1",
          estado: "descartado",
          motivoDescarte: "chuva local sem risco",
          operadorValidador: "Renata",
        }),
        alerta({ alertaId: "a2", estado: "encerrado" }),
      ]),
      mundo
    );
    expect(linhas).toHaveLength(2);
    const d = linhas.find((l) => l.alertaId === "a1");
    expect(d?.estado).toBe("descartado");
    expect(d?.motivoDescarte).toBe("chuva local sem risco");
    expect(d?.operador).toBe("Renata");
    expect(linhas.find((l) => l.alertaId === "a2")?.estado).toBe("encerrado");
  });

  it("ordena por tsDeteccao decrescente", () => {
    const linhas = montarDeliberacoes(
      estadoCom([
        alerta({ alertaId: "antigo", tsDeteccao: "2026-01-01T08:00:00.000Z" }),
        alerta({ alertaId: "novo", tsDeteccao: "2026-01-01T12:00:00.000Z" }),
        alerta({ alertaId: "meio", tsDeteccao: "2026-01-01T10:00:00.000Z" }),
      ]),
      mundo
    );
    expect(linhas.map((l) => l.alertaId)).toEqual(["novo", "meio", "antigo"]);
  });
});
