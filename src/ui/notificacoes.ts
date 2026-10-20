import type { Evento, TipoEvento } from "@/simulacao/barramento";

/** Tipos de evento relevantes para o operador no popover de notificacoes da barra superior. */
export const TIPOS_NOTIFICAVEIS: readonly TipoEvento[] = [
  "alerta.criado",
  "alerta.expedido",
  "estacao.silenciosa",
  "expedicao.bloqueada",
];

export function filtrarNotificacoes(
  eventos: readonly Evento[],
  tipos: readonly TipoEvento[] = TIPOS_NOTIFICAVEIS,
): Evento[] {
  const permitidos = new Set(tipos);
  return eventos.filter((e) => permitidos.has(e.tipo));
}
