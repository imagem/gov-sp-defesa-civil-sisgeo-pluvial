import { expedir } from "@/dominio/alerta";
import type { Agente, ContextoAgente } from "./tipos";

/**
 * Agente de expedicao (modulo EXP, RF-EXP-02/03) sob RNF-18.
 *
 * Este agente e o argumento central da demonstracao: ele TENTA expedir,
 * e fica BLOQUEADO enquanto nenhuma pessoa identificada tiver validado.
 * O bloqueio nao e um obstaculo a contornar — e o requisito funcionando.
 * NAO adicionar caminho de auto-validacao.
 */
export function criarAgenteExpedicao(): Agente {
  return {
    id: "agente-expedicao",
    nome: "Expedição multicanal",
    modulo: "EXP",
    descricao:
      "Encaminha o alerta validado aos destinatários por webhook, e-mail e CAP. Permanece bloqueado enquanto não houver validação humana.",
    // RF-EXP-01 (destinatarios e matriz de expedicao) e RF-EXP-03 (retentativa
    // com recuo exponencial, falha de canal nunca silenciosa) NAO estao
    // listados: o agente publica um array fixo de canais, sem destinatarios,
    // sem matriz e sem caminho de retentativa.
    requisitos: ["RF-EXP-02", "RNF-18"],
    status: "ocioso",
    ultimaAtividade: null,
    contadorTrabalho: 0,

    aoTick(ctx: ContextoAgente): void {
      const ts = ctx.relogio.iso;

      const candidatos = ctx.estado.alertas.filter((a) => a.estado === "candidato");
      const validados = ctx.estado.alertas.filter((a) => a.estado === "validado");

      for (const alerta of candidatos) {
        ctx.publicar(
          this.id,
          "expedicao.bloqueada",
          `Expedição de ${alerta.alertaId} bloqueada: aguardando validação de operador identificado (RNF-18)`,
          { alertaId: alerta.alertaId },
          alerta.alertaId,
        );
      }

      for (const alerta of validados) {
        const indice = ctx.estado.alertas.indexOf(alerta);
        // expedir() lanca se o alerta nao estiver validado. Nao capturamos
        // para transformar em sucesso — a excecao e a garantia do requisito.
        ctx.estado.alertas[indice] = expedir(alerta, ts);
        this.contadorTrabalho += 1;

        ctx.publicar(
          this.id,
          "alerta.expedido",
          `Alerta ${alerta.alertaId} expedido por ${alerta.operadorValidador} — webhook, e-mail e CAP`,
          {
            alertaId: alerta.alertaId,
            canais: ["webhook", "email", "cap"],
            operador: alerta.operadorValidador,
          },
          alerta.alertaId,
        );
      }

      this.status =
        candidatos.length > 0 ? "bloqueado" : validados.length > 0 ? "trabalhando" : "ocioso";
      this.ultimaAtividade = ts;
    },
  };
}
