import { describe, expect, it } from "vitest";
import { impactoPorAtivo, melhorCombinacao, type ParametrosGemeo } from "./gemeo";
import type { AtivoProtecao, Limiar, ZonaRisco } from "@/dominio/tipos";
import type { RedeInfluencia } from "@/dominio/twin";

function zona(zonaId: string, nome: string, populacao: number): ZonaRisco {
  return {
    zonaId,
    nome,
    codigoSetorSgb: "SGB-1",
    subBaciaId: "SB-1",
    grauRisco: "alto",
    tipo: "inundacao",
    familiasEstimadas: Math.round(populacao / 3),
    populacaoEstimada: populacao,
    geometria: { aneis: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] },
  };
}

function limiarCota(zonaId: string, valor: number): Limiar {
  return {
    limiarId: `L-${zonaId}-COTA`,
    zonaId,
    variavel: "nivel_m",
    janelaHoras: 0,
    operador: ">=",
    valor,
    severidade: "alta",
    origem: "previsao",
    versao: 1,
    vigenciaInicio: "2026-01-01T00:00:00.000Z",
    vigenciaFim: null,
    justificativaTecnica: "teste",
    autor: "teste",
  };
}

function comporta(ativoId: string, prontidao: AtivoProtecao["situacaoProntidao"] = "pronto"): AtivoProtecao {
  return { ativoId, nome: ativoId, tipo: "comporta", posicao: [0, 0], situacaoProntidao: prontidao };
}

/**
 * Mundo mínimo: a comporta CP-1 protege JUS (cota 4,00 -> 3,20, abaixo do
 * limiar 3,80: sai da exposição) e represa MON (4,00 -> 4,35, acima do
 * limiar 4,20: entra na exposição). A troca é deliberada — é o que o painel
 * precisa mostrar ao operador.
 */
const zonas = [zona("Z-JUS", "Jusante", 1000), zona("Z-MON", "Montante", 300)];
const limiares = [limiarCota("Z-JUS", 3.8), limiarCota("Z-MON", 4.2)];
const ativos = [comporta("CP-1")];
const rede: RedeInfluencia = {
  nos: [{ id: "CP-1", tipo: "comporta" }],
  arestas: [
    { de: "CP-1", zonaId: "Z-JUS", efeitoCotaM: -0.8 },
    { de: "CP-1", zonaId: "Z-MON", efeitoCotaM: 0.35 },
  ],
};

const params: ParametrosGemeo = { rede, zonas, limiares, ativos, cotaPrevistaM: 4.0 };

describe("impactoPorAtivo", () => {
  it("nomeia quem é protegido e quem é represado pela ação", () => {
    const [impacto] = impactoPorAtivo(params, { "CP-1": "aberta" });
    expect(impacto?.protegidas.map((z) => z.nome)).toEqual(["Jusante"]);
    expect(impacto?.expostas.map((z) => z.nome)).toEqual(["Montante"]);
  });

  it("calcula o saldo entre protegidos e expostos", () => {
    const [impacto] = impactoPorAtivo(params, { "CP-1": "aberta" });
    expect(impacto?.populacaoProtegida).toBe(1000);
    expect(impacto?.populacaoExposta).toBe(300);
    expect(impacto?.saldo).toBe(700);
  });

  it("oferece a ação inversa quando o ativo já está acionado", () => {
    const [impacto] = impactoPorAtivo(params, { "CP-1": "fechada" });
    expect(impacto?.proximoEstado).toBe("aberta");
    // Reabrir desfaz a troca: protege Montante e volta a expor Jusante.
    expect(impacto?.protegidas.map((z) => z.nome)).toEqual(["Montante"]);
    expect(impacto?.expostas.map((z) => z.nome)).toEqual(["Jusante"]);
    expect(impacto?.saldo).toBe(-700);
  });

  it("marca as zonas que já estão sob alerta", () => {
    const [impacto] = impactoPorAtivo(params, { "CP-1": "aberta" }, new Set(["Z-JUS"]));
    expect(impacto?.tocaAlerta).toBe(true);
    expect(impacto?.protegidas[0]?.sobAlerta).toBe(true);
    expect(impacto?.expostas[0]?.sobAlerta).toBe(false);
  });

  it("lista o ativo em manutenção como não operável, sem efeito", () => {
    const emManutencao: ParametrosGemeo = { ...params, ativos: [comporta("CP-1", "manutencao")] };
    const [impacto] = impactoPorAtivo(emManutencao, { "CP-1": "manutencao" });
    expect(impacto?.operavel).toBe(false);
    expect(impacto?.saldo).toBe(0);
  });
});

describe("melhorCombinacao", () => {
  it("aciona o ativo cujo saldo é positivo", () => {
    expect(melhorCombinacao(params)["CP-1"]).toBe("fechada");
  });

  it("não aciona nada quando a ação piora o saldo", () => {
    // Inverte a troca: proteger 300 custa expor 1000.
    const ruim: ParametrosGemeo = {
      ...params,
      zonas: [zona("Z-JUS", "Jusante", 300), zona("Z-MON", "Montante", 1000)],
    };
    expect(melhorCombinacao(ruim)["CP-1"]).toBe("aberta");
  });

  it("é determinística", () => {
    expect(melhorCombinacao(params)).toEqual(melhorCombinacao(params));
  });

  it("não aciona ativo em manutenção", () => {
    const emManutencao: ParametrosGemeo = { ...params, ativos: [comporta("CP-1", "manutencao")] };
    expect(melhorCombinacao(emManutencao)["CP-1"]).toBe("manutencao");
  });
});

describe("melhorCombinacao encadeia ativos", () => {
  /**
   * Nenhuma comporta sozinha cruza o limiar (4,80 -> 4,00, ainda acima de
   * 3,60), mas as duas juntas sim (4,80 -> 3,20). Uma busca guiada apenas
   * pela populacao pararia no primeiro passo de saldo zero; a folga ate o
   * limiar e o que permite encadear.
   */
  const duasComportas: ParametrosGemeo = {
    rede: {
      nos: [
        { id: "CP-1", tipo: "comporta" },
        { id: "CP-2", tipo: "comporta" },
      ],
      arestas: [
        { de: "CP-1", zonaId: "Z-A", efeitoCotaM: -0.8 },
        { de: "CP-2", zonaId: "Z-A", efeitoCotaM: -0.8 },
      ],
    },
    zonas: [zona("Z-A", "Alvo", 5000)],
    limiares: [limiarCota("Z-A", 3.6)],
    ativos: [comporta("CP-1"), comporta("CP-2")],
    cotaPrevistaM: 4.8,
  };

  it("nenhuma comporta sozinha tira a zona da exposicao", () => {
    for (const i of impactoPorAtivo(duasComportas, { "CP-1": "aberta", "CP-2": "aberta" })) {
      expect(i.saldo).toBe(0);
    }
  });

  it("mesmo com saldo zero, cada ativo mostra o deslocamento de cota", () => {
    const [i] = impactoPorAtivo(duasComportas, { "CP-1": "aberta", "CP-2": "aberta" });
    expect(i?.deslocamentos).toHaveLength(1);
    expect(i?.deslocamentos[0]?.cotaAntes).toBeCloseTo(4.8, 3);
    expect(i?.deslocamentos[0]?.cotaDepois).toBeCloseTo(4.0, 3);
    expect(i?.deslocamentos[0]?.limiar).toBe(3.6);
  });

  it("a melhor combinacao fecha as duas e protege a zona", () => {
    const estados = melhorCombinacao(duasComportas);
    expect(estados["CP-1"]).toBe("fechada");
    expect(estados["CP-2"]).toBe("fechada");
  });
});
