import { describe, expect, it } from "vitest";
import { filtrarNotificacoes, TIPOS_NOTIFICAVEIS } from "./notificacoes";
import type { Evento } from "@/simulacao/barramento";

function evento(tipo: Evento["tipo"], eventoId: string): Evento {
  return { eventoId, tipo, agenteId: "agente-x", ts: "2026-01-01T00:00:00Z", titulo: tipo, carga: null };
}

describe("filtrarNotificacoes", () => {
  it("mantem apenas os tipos notificaveis por padrao", () => {
    const eventos = [
      evento("alerta.criado", "1"),
      evento("leitura.ingerida", "2"),
      evento("estacao.silenciosa", "3"),
    ];
    const resultado = filtrarNotificacoes(eventos);
    expect(resultado.map((e) => e.eventoId)).toEqual(["1", "3"]);
  });

  it("aceita uma lista customizada de tipos", () => {
    const eventos = [evento("boletim.aprovado", "1"), evento("alerta.criado", "2")];
    const resultado = filtrarNotificacoes(eventos, ["boletim.aprovado"]);
    expect(resultado.map((e) => e.eventoId)).toEqual(["1"]);
  });

  it("retorna lista vazia quando nada corresponde", () => {
    expect(filtrarNotificacoes([evento("leitura.ingerida", "1")])).toEqual([]);
  });

  it("TIPOS_NOTIFICAVEIS inclui os tipos criticos para o operador", () => {
    expect(TIPOS_NOTIFICAVEIS).toContain("alerta.expedido");
    expect(TIPOS_NOTIFICAVEIS).toContain("expedicao.bloqueada");
  });
});
