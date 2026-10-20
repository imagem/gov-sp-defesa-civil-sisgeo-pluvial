import type { EstadoAlerta, Severidade } from "@/dominio/tipos";

export const COR_SEVERIDADE: Record<Severidade, string> = {
  baixa: "var(--sev-baixa)",
  media: "var(--sev-media)",
  alta: "var(--sev-alta)",
  muito_alta: "var(--sev-muito-alta)",
};

export const ROTULO_ESTADO: Record<EstadoAlerta, string> = {
  candidato: "Aguardando validação",
  validado: "Validado — expedindo",
  expedido: "Expedido",
  atualizado: "Atualizado",
  encerrado: "Encerrado",
  descartado: "Descartado",
};
