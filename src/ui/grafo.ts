import type { Agente, ModuloAgente } from "@/agentes/tipos";
import type { Evento } from "@/simulacao/barramento";

/** Fluxo de trabalho do enxame, na ordem em que o dado atravessa o sistema. */
export const LIGACOES = [
  { origem: "agente-ingestao-cemaden", destino: "agente-qualidade" },
  { origem: "agente-ingestao-ana", destino: "agente-qualidade" },
  { origem: "agente-ingestao-inmet", destino: "agente-qualidade" },
  { origem: "agente-ingestao-cemaden", destino: "agente-rede" },
  { origem: "agente-qualidade", destino: "agente-hidrologico" },
  { origem: "agente-qualidade", destino: "agente-limiar" },
  { origem: "agente-rede", destino: "agente-hidrologico" },
  { origem: "agente-hidrologico", destino: "agente-geofencing" },
  { origem: "agente-limiar", destino: "agente-antifadiga" },
  { origem: "agente-geofencing", destino: "agente-antifadiga" },
  { origem: "agente-limiar", destino: "agente-expedicao" },
  { origem: "agente-geofencing", destino: "agente-expedicao" },
  { origem: "agente-antifadiga", destino: "agente-redator" },
  { origem: "agente-redator", destino: "agente-expedicao" },
  { origem: "agente-expedicao", destino: "agente-auditoria" },
] as const;

const COLUNA: Record<ModuloAgente, number> = {
  ING: 0,
  NET: 1,
  MOD: 2,
  ALT: 3,
  LLM: 4,
  EXP: 5,
  GOV: 6,
};

const LARGURA_COLUNA = 210;
const ALTURA_LINHA = 108;

export function posicaoDoAgente(agente: Agente, indiceNoModulo: number): { x: number; y: number } {
  return {
    x: COLUNA[agente.modulo] * LARGURA_COLUNA,
    y: indiceNoModulo * ALTURA_LINHA,
  };
}

export function chaveAresta(origem: string, destino: string): string {
  return `${origem}->${destino}`;
}

/** Arestas que saem de agentes que publicaram evento na janela recente. */
export function arestasAtivas(eventosRecentes: readonly Evento[]): Set<string> {
  const publicaram = new Set(eventosRecentes.map((e) => e.agenteId));
  const ativas = new Set<string>();
  for (const ligacao of LIGACOES) {
    if (publicaram.has(ligacao.origem)) {
      ativas.add(chaveAresta(ligacao.origem, ligacao.destino));
    }
  }
  return ativas;
}
