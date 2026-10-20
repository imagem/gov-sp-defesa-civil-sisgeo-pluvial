import { describe, expect, it } from "vitest";
import { pontoEmPoligono } from "@/dominio/geometria";
import { criarMundo, FONTES } from "./mundo";
import {
  REGIAO_GUAIBA_RS,
  REGIAO_SERRA_MAR_SP,
  REGIAO_VARZEA_TIETE_SP,
} from "./regioes";

describe("criarMundo", () => {
  it("e reproduzivel: mesma semente e mesma regiao geram mundo identico", () => {
    expect(criarMundo(2024, REGIAO_VARZEA_TIETE_SP)).toEqual(
      criarMundo(2024, REGIAO_VARZEA_TIETE_SP),
    );
  });

  it("gera mundos diferentes para sementes diferentes", () => {
    const a = criarMundo(1, REGIAO_VARZEA_TIETE_SP).zonas[0]?.geometria;
    const b = criarMundo(2, REGIAO_VARZEA_TIETE_SP).zonas[0]?.geometria;
    expect(a).not.toEqual(b);
  });

  it("gera 4 sub-bacias", () => {
    expect(criarMundo(2024, REGIAO_VARZEA_TIETE_SP).subBacias).toHaveLength(4);
  });

  it("gera entre 8 e 14 zonas de risco", () => {
    const zonas = criarMundo(2024, REGIAO_VARZEA_TIETE_SP).zonas;
    expect(zonas.length).toBeGreaterThanOrEqual(8);
    expect(zonas.length).toBeLessThanOrEqual(14);
  });

  it("gera zonas com multipoligono — mais de um anel em pelo menos uma zona", () => {
    const zonas = criarMundo(2024, REGIAO_VARZEA_TIETE_SP).zonas;
    expect(zonas.some((z) => z.geometria.aneis.length > 1)).toBe(true);
  });

  it("gera 24 estacoes distribuidas nas tres fontes", () => {
    const estacoes = criarMundo(2024, REGIAO_VARZEA_TIETE_SP).estacoes;
    expect(estacoes).toHaveLength(24);
    for (const fonte of FONTES) {
      expect(estacoes.some((e) => e.fonteId === fonte)).toBe(true);
    }
  });

  it("posiciona cada estacao dentro da sua sub-bacia", () => {
    const mundo = criarMundo(2024, REGIAO_VARZEA_TIETE_SP);
    for (const estacao of mundo.estacoes) {
      const subBacia = mundo.subBacias.find((s) => s.subBaciaId === estacao.subBaciaId);
      expect(subBacia).toBeDefined();
      if (!subBacia) continue;
      expect(pontoEmPoligono(estacao.posicao, subBacia.geometria)).toBe(true);
    }
  });

  it("inicia todas as estacoes operantes e sem leitura", () => {
    for (const estacao of criarMundo(2024, REGIAO_VARZEA_TIETE_SP).estacoes) {
      expect(estacao.situacao).toBe("operante");
      expect(estacao.ultimaLeituraTs).toBeNull();
    }
  });

  it("cria um limiar de chuva e um de nivel previsto por zona", () => {
    const mundo = criarMundo(2024, REGIAO_VARZEA_TIETE_SP);
    for (const zona of mundo.zonas) {
      const daZona = mundo.limiares.filter((l) => l.zonaId === zona.zonaId);
      expect(daZona.some((l) => l.origem === "observacao")).toBe(true);
      expect(daZona.some((l) => l.origem === "previsao")).toBe(true);
    }
  });

  it("da a todo limiar uma justificativa tecnica e um autor — RF-ALT-01", () => {
    for (const limiar of criarMundo(2024, REGIAO_VARZEA_TIETE_SP).limiares) {
      expect(limiar.justificativaTecnica.length).toBeGreaterThan(10);
      expect(limiar.autor).not.toBe("");
      expect(limiar.versao).toBe(1);
    }
  });

  it("gera 14 comportas e 23 EBAPs, espelhando o numero real do spec", () => {
    const ativos = criarMundo(2024, REGIAO_VARZEA_TIETE_SP).ativos;
    expect(ativos.filter((a) => a.tipo === "comporta")).toHaveLength(14);
    expect(ativos.filter((a) => a.tipo === "ebap")).toHaveLength(23);
  });

  it("centro, postoId e codigo setorial honram a regiao escolhida", () => {
    const sp = criarMundo(2024, REGIAO_VARZEA_TIETE_SP);
    expect(sp.centro).toEqual(REGIAO_VARZEA_TIETE_SP.centro);
    expect(sp.postoId).toBe(REGIAO_VARZEA_TIETE_SP.postoId);
    expect(sp.zonas[0]?.codigoSetorSgb.startsWith(REGIAO_VARZEA_TIETE_SP.prefixoSgb)).toBe(true);

    const serra = criarMundo(2024, REGIAO_SERRA_MAR_SP);
    expect(serra.centro).toEqual(REGIAO_SERRA_MAR_SP.centro);
    expect(serra.postoId).toBe(REGIAO_SERRA_MAR_SP.postoId);
    expect(serra.zonas[0]?.codigoSetorSgb.startsWith(REGIAO_SERRA_MAR_SP.prefixoSgb)).toBe(true);

    const rs = criarMundo(2024, REGIAO_GUAIBA_RS);
    expect(rs.centro).toEqual(REGIAO_GUAIBA_RS.centro);
    expect(rs.postoId).toBe(REGIAO_GUAIBA_RS.postoId);
    expect(rs.zonas[0]?.codigoSetorSgb.startsWith(REGIAO_GUAIBA_RS.prefixoSgb)).toBe(true);
  });

  it("usa a carteira de bairros da regiao como nome das zonas", () => {
    const sp = criarMundo(2024, REGIAO_VARZEA_TIETE_SP);
    for (const zona of sp.zonas) {
      expect(REGIAO_VARZEA_TIETE_SP.bairros).toContain(zona.nome);
    }
  });
});
