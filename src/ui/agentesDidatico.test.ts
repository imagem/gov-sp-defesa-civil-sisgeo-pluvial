import { describe, expect, it } from "vitest";
import { criarEnxame } from "@/agentes/registro";
import { criarEstadoInicial, type Agente } from "@/agentes/tipos";
import type { EstacaoMonitoramento } from "@/dominio/tipos";
import { descreverAtividade } from "./agentesDidatico";

function obter(id: string): Agente {
  const agente = criarEnxame().find((a) => a.id === id);
  if (!agente) throw new Error(`agente ${id} nao encontrado`);
  return agente;
}

function estacao(id: string, situacao: EstacaoMonitoramento["situacao"]): EstacaoMonitoramento {
  return { estacaoId: id, situacao } as EstacaoMonitoramento;
}

describe("descreverAtividade", () => {
  it("agente de ingestao cita o numero de estacoes operantes", () => {
    const estado = criarEstadoInicial(2);
    estado.estacoes = [estacao("a", "operante"), estacao("b", "operante"), estacao("c", "silenciosa")];
    const ingestao = criarEnxame().find((a) => a.modulo === "ING" && a.id.startsWith("agente-ingestao"));
    expect(ingestao).toBeDefined();
    expect(descreverAtividade(ingestao!, estado)).toContain("2 estações operantes");
  });

  it("agente hidrologico menciona a cota prevista", () => {
    const estado = criarEstadoInicial(2);
    estado.cotaPrevistaM = 3.456;
    const frase = descreverAtividade(obter("agente-hidrologico"), estado);
    expect(frase.toLowerCase()).toContain("cota");
    expect(frase).toContain("3.46");
  });

  it("agente sem caso especifico devolve a descricao", () => {
    const desconhecido: Agente = { ...obter("agente-rede"), id: "agente-desconhecido" };
    expect(descreverAtividade(desconhecido, criarEstadoInicial(2))).toBe(desconhecido.descricao);
  });
});
