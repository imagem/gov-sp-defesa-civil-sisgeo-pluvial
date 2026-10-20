import { describe, expect, it } from "vitest";
import { pontoEmPoligono } from "@/dominio/geometria";
import { criarMundo, FONTES } from "./mundo";

describe("criarMundo", () => {
  it("e reproduzivel: mesma semente gera mundo identico", () => {
    expect(criarMundo(2024)).toEqual(criarMundo(2024));
  });

  it("gera mundos diferentes para sementes diferentes", () => {
    expect(criarMundo(1).zonas[0]?.geometria).not.toEqual(criarMundo(2).zonas[0]?.geometria);
  });

  it("gera 4 sub-bacias", () => {
    expect(criarMundo(2024).subBacias).toHaveLength(4);
  });

  it("gera entre 8 e 14 zonas de risco", () => {
    const zonas = criarMundo(2024).zonas;
    expect(zonas.length).toBeGreaterThanOrEqual(8);
    expect(zonas.length).toBeLessThanOrEqual(14);
  });

  it("gera zonas com multipoligono — mais de um anel em pelo menos uma zona", () => {
    const zonas = criarMundo(2024).zonas;
    expect(zonas.some((z) => z.geometria.aneis.length > 1)).toBe(true);
  });

  it("gera 24 estacoes distribuidas nas tres fontes", () => {
    const estacoes = criarMundo(2024).estacoes;
    expect(estacoes).toHaveLength(24);
    for (const fonte of FONTES) {
      expect(estacoes.some((e) => e.fonteId === fonte)).toBe(true);
    }
  });

  it("posiciona cada estacao dentro da sua sub-bacia", () => {
    const mundo = criarMundo(2024);
    for (const estacao of mundo.estacoes) {
      const subBacia = mundo.subBacias.find((s) => s.subBaciaId === estacao.subBaciaId);
      expect(subBacia).toBeDefined();
      if (!subBacia) continue;
      expect(pontoEmPoligono(estacao.posicao, subBacia.geometria)).toBe(true);
    }
  });

  it("inicia todas as estacoes operantes e sem leitura", () => {
    for (const estacao of criarMundo(2024).estacoes) {
      expect(estacao.situacao).toBe("operante");
      expect(estacao.ultimaLeituraTs).toBeNull();
    }
  });

  it("cria um limiar de chuva e um de nivel previsto por zona", () => {
    const mundo = criarMundo(2024);
    for (const zona of mundo.zonas) {
      const daZona = mundo.limiares.filter((l) => l.zonaId === zona.zonaId);
      expect(daZona.some((l) => l.origem === "observacao")).toBe(true);
      expect(daZona.some((l) => l.origem === "previsao")).toBe(true);
    }
  });

  it("da a todo limiar uma justificativa tecnica e um autor — RF-ALT-01", () => {
    for (const limiar of criarMundo(2024).limiares) {
      expect(limiar.justificativaTecnica.length).toBeGreaterThan(10);
      expect(limiar.autor).not.toBe("");
      expect(limiar.versao).toBe(1);
    }
  });

  it("gera 14 comportas e 23 EBAPs, espelhando o numero real do spec", () => {
    const ativos = criarMundo(2024).ativos;
    expect(ativos.filter((a) => a.tipo === "comporta")).toHaveLength(14);
    expect(ativos.filter((a) => a.tipo === "ebap")).toHaveLength(23);
  });
});
