import { describe, expect, it } from "vitest";
import { criarEnxame } from "@/agentes/registro";
import type { Evento } from "@/simulacao/barramento";
import { arestasAtivas, LIGACOES, posicaoDoAgente } from "./grafo";

describe("LIGACOES", () => {
  it("referencia apenas agentes existentes no enxame", () => {
    const ids = new Set(criarEnxame().map((a) => a.id));
    for (const ligacao of LIGACOES) {
      expect(ids.has(ligacao.origem)).toBe(true);
      expect(ids.has(ligacao.destino)).toBe(true);
    }
  });

  it("nao tem ligacao duplicada", () => {
    const chaves = LIGACOES.map((l) => `${l.origem}->${l.destino}`);
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it("liga o motor de limiar a expedicao, o caminho critico do RNF-18", () => {
    const chaves = LIGACOES.map((l) => `${l.origem}->${l.destino}`);
    expect(chaves).toContain("agente-limiar->agente-expedicao");
  });

  it("nenhum agente se liga a si mesmo", () => {
    for (const l of LIGACOES) expect(l.origem).not.toBe(l.destino);
  });
});

describe("posicaoDoAgente", () => {
  it("agrupa agentes do mesmo modulo na mesma coluna", () => {
    const enxame = criarEnxame();
    const ingestao = enxame.filter((a) => a.modulo === "ING");
    const xs = ingestao.map((a, i) => posicaoDoAgente(a, i).x);
    expect(new Set(xs).size).toBe(1);
  });

  it("separa agentes do mesmo modulo verticalmente", () => {
    const enxame = criarEnxame();
    const ingestao = enxame.filter((a) => a.modulo === "ING");
    const ys = ingestao.map((a, i) => posicaoDoAgente(a, i).y);
    expect(new Set(ys).size).toBe(ingestao.length);
  });

  it("posiciona modulos diferentes em colunas diferentes", () => {
    const enxame = criarEnxame();
    const ing = enxame.find((a) => a.modulo === "ING");
    const exp = enxame.find((a) => a.modulo === "EXP");
    if (!ing || !exp) throw new Error("agentes ausentes");
    expect(posicaoDoAgente(ing, 0).x).not.toBe(posicaoDoAgente(exp, 0).x);
  });
});

describe("arestasAtivas", () => {
  function evento(agenteId: string): Evento {
    return {
      eventoId: "e",
      tipo: "leitura.ingerida",
      agenteId,
      ts: "2026-05-01T12:00:00.000Z",
      titulo: "t",
      carga: {},
    };
  }

  it("ativa as arestas que saem dos agentes que acabaram de publicar", () => {
    const ativas = arestasAtivas([evento("agente-limiar")]);
    expect(ativas.has("agente-limiar->agente-expedicao")).toBe(true);
  });

  it("nao ativa aresta de agente silencioso", () => {
    const ativas = arestasAtivas([evento("agente-limiar")]);
    expect(ativas.has("agente-rede->agente-hidrologico")).toBe(false);
  });

  it("retorna conjunto vazio sem eventos", () => {
    expect(arestasAtivas([]).size).toBe(0);
  });
});
