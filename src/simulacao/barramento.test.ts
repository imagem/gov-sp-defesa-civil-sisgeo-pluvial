import { describe, expect, it, vi } from "vitest";
import { Barramento, type Evento } from "./barramento";

function evento(parcial: Partial<Evento> = {}): Evento {
  return {
    eventoId: "ev-1",
    tipo: "leitura.ingerida",
    agenteId: "agente-ingestao-cemaden",
    ts: "2026-05-01T12:00:00.000Z",
    titulo: "Leitura ingerida",
    carga: {},
    ...parcial,
  };
}

describe("Barramento", () => {
  it("entrega o evento ao assinante do tipo", () => {
    const barramento = new Barramento();
    const ouvinte = vi.fn();
    barramento.assinar("leitura.ingerida", ouvinte);
    barramento.publicar(evento());
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it("nao entrega evento de outro tipo", () => {
    const barramento = new Barramento();
    const ouvinte = vi.fn();
    barramento.assinar("alerta.criado", ouvinte);
    barramento.publicar(evento());
    expect(ouvinte).not.toHaveBeenCalled();
  });

  it("entrega todos os eventos ao assinante global", () => {
    const barramento = new Barramento();
    const ouvinte = vi.fn();
    barramento.assinarTudo(ouvinte);
    barramento.publicar(evento());
    barramento.publicar(evento({ eventoId: "ev-2", tipo: "alerta.criado" }));
    expect(ouvinte).toHaveBeenCalledTimes(2);
  });

  it("permite cancelar a assinatura", () => {
    const barramento = new Barramento();
    const ouvinte = vi.fn();
    const cancelar = barramento.assinar("leitura.ingerida", ouvinte);
    cancelar();
    barramento.publicar(evento());
    expect(ouvinte).not.toHaveBeenCalled();
  });

  // RF-GOV-02: a trilha e imutavel do ponto de vista de quem consome.
  it("acumula o historico na ordem de publicacao", () => {
    const barramento = new Barramento();
    barramento.publicar(evento({ eventoId: "a" }));
    barramento.publicar(evento({ eventoId: "b" }));
    expect(barramento.historico().map((e) => e.eventoId)).toEqual(["a", "b"]);
  });

  it("nao permite que o consumidor altere o historico", () => {
    const barramento = new Barramento();
    barramento.publicar(evento({ eventoId: "a" }));
    const copia = barramento.historico() as Evento[];
    expect(() => copia.push(evento({ eventoId: "intruso" }))).toThrow();
    expect(barramento.historico()).toHaveLength(1);
  });

  // CA-GOV-02: reconstituir um alerta ponta a ponta.
  it("reconstitui a cadeia completa por correlacao", () => {
    const barramento = new Barramento();
    barramento.publicar(evento({ eventoId: "1", correlacaoId: "A-1", tipo: "limiar.atingido" }));
    barramento.publicar(evento({ eventoId: "2", correlacaoId: "A-1", tipo: "alerta.criado" }));
    barramento.publicar(evento({ eventoId: "3", correlacaoId: "A-2", tipo: "alerta.criado" }));
    barramento.publicar(evento({ eventoId: "4", correlacaoId: "A-1", tipo: "alerta.expedido" }));

    const cadeia = barramento.porCorrelacao("A-1");
    expect(cadeia.map((e) => e.tipo)).toEqual([
      "limiar.atingido",
      "alerta.criado",
      "alerta.expedido",
    ]);
  });

  it("isola falha de um ouvinte para nao derrubar os demais", () => {
    const barramento = new Barramento();
    const quebrado = vi.fn(() => {
      throw new Error("falha do ouvinte");
    });
    const saudavel = vi.fn();
    barramento.assinar("leitura.ingerida", quebrado);
    barramento.assinar("leitura.ingerida", saudavel);

    expect(() => barramento.publicar(evento())).not.toThrow();
    expect(saudavel).toHaveBeenCalledTimes(1);
  });
});
