import type { Agente, ContextoAgente } from "./tipos";

/**
 * Agente de auditoria (modulo GOV, RF-GOV-02).
 * Nao produz dado novo: observa o barramento e mantem o indicador de
 * rastreabilidade — quantos alertas tem cadeia reconstituivel completa.
 */
export function criarAgenteAuditoria(): Agente {
  return {
    id: "agente-auditoria",
    nome: "Trilha de auditoria",
    modulo: "GOV",
    descricao:
      "Verifica que cada alerta possui cadeia completa: dado de origem, limiar, decisão humana e expedição.",
    requisitos: ["RF-GOV-02"],
    status: "ocioso",
    ultimaAtividade: null,
    contadorTrabalho: 0,

    aoTick(ctx: ContextoAgente): void {
      const ts = ctx.relogio.iso;
      const expedidos = ctx.estado.alertas.filter((a) => a.estado === "expedido");
      let completos = 0;

      for (const alerta of expedidos) {
        const cadeia = ctx.barramento.porCorrelacao(alerta.alertaId).map((e) => e.tipo);
        const temOrigem = cadeia.includes("limiar.atingido") || cadeia.includes("alerta.criado");
        const temDecisao = cadeia.includes("alerta.validado");
        const temExpedicao = cadeia.includes("alerta.expedido");
        if (temOrigem && temDecisao && temExpedicao) completos++;
      }

      this.contadorTrabalho = completos;
      this.status = expedidos.length > 0 && completos < expedidos.length ? "alerta" : "trabalhando";
      this.ultimaAtividade = ts;
    },
  };
}
