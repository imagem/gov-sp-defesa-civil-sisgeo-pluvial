import type { Agente, ModuloAgente, StatusAgente } from "@/agentes/tipos";
import type { EstadoAlerta, SituacaoEstacao } from "@/dominio/tipos";
import type { Evento } from "@/simulacao/barramento";

export interface ResumoEstacoes {
  readonly operantes: number;
  readonly silenciosas: number;
}

export function resumirEstacoes(
  estacoes: readonly { situacao: SituacaoEstacao }[],
): ResumoEstacoes {
  return {
    operantes: estacoes.filter((e) => e.situacao === "operante").length,
    silenciosas: estacoes.filter((e) => e.situacao === "silenciosa").length,
  };
}

export interface ResumoAgentes {
  readonly trabalhando: number;
  readonly bloqueado: number;
  readonly ociosos: number;
}

export function resumirAgentes(agentes: readonly { status: StatusAgente }[]): ResumoAgentes {
  return {
    trabalhando: agentes.filter((a) => a.status === "trabalhando" || a.status === "alerta").length,
    bloqueado: agentes.filter((a) => a.status === "bloqueado" || a.status === "falha").length,
    ociosos: agentes.filter((a) => a.status === "ocioso").length,
  };
}

export interface ResumoAlertas {
  readonly aguardandoValidacao: number;
  readonly expedidos: number;
}

export function resumirAlertas(alertas: readonly { estado: EstadoAlerta }[]): ResumoAlertas {
  return {
    aguardandoValidacao: alertas.filter((a) => a.estado === "candidato").length,
    expedidos: alertas.filter((a) => a.estado === "expedido" || a.estado === "atualizado").length,
  };
}

export function contarBloqueados(agentes: readonly { status: StatusAgente }[]): number {
  return agentes.filter((a) => a.status === "bloqueado").length;
}

/** Modulo do agente que publicou o evento mais recente, ou null se nao houver nenhum. */
export function moduloAtivoRecente(
  eventosRecentes: readonly Pick<Evento, "agenteId">[],
  agentes: readonly Pick<Agente, "id" | "modulo">[],
): ModuloAgente | null {
  const ultimo = eventosRecentes[0];
  if (!ultimo) return null;
  return agentes.find((a) => a.id === ultimo.agenteId)?.modulo ?? null;
}
