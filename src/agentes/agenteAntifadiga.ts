import { encerrar } from "@/dominio/alerta";
import type { Agente, ContextoAgente } from "./tipos";

const HORAS_SEM_REFORCO_PARA_ENCERRAR = 6;

/**
 * Agente antifadiga (RF-ALT-05, complemento).
 * Encerra alertas expedidos que nao recebem reforco ha horas —
 * fila limpa e o que mantem o operador confiando no sistema.
 */
export function criarAgenteAntifadiga(): Agente {
  return {
    id: "agente-antifadiga",
    nome: "Antifadiga de alerta",
    modulo: "ALT",
    descricao:
      "Encerra alertas sem reforço recente para evitar acúmulo de avisos vencidos na fila do plantão.",
    // RF-ALT-06 (metricas de qualidade do alerta — POD/FAR/CSI) NAO esta
    // listado: nada aqui calcula essas metricas, e o plano do projeto ja
    // declarou isso fora de escopo no proprio Self-Review.
    requisitos: ["RF-ALT-05"],
    status: "ocioso",
    ultimaAtividade: null,
    contadorTrabalho: 0,

    aoTick(ctx: ContextoAgente): void {
      const ts = ctx.relogio.iso;
      let encerrados = 0;

      for (let i = 0; i < ctx.estado.alertas.length; i++) {
        const alerta = ctx.estado.alertas[i];
        if (!alerta) continue;
        if (alerta.estado !== "expedido" && alerta.estado !== "atualizado") continue;

        const ultima = alerta.atualizacoes[alerta.atualizacoes.length - 1];
        const referencia = ultima?.ts ?? alerta.tsExpedicao ?? alerta.tsDeteccao;
        const horas = ctx.relogio.minutosDesde(referencia) / 60;

        if (horas >= HORAS_SEM_REFORCO_PARA_ENCERRAR) {
          ctx.estado.alertas[i] = encerrar(alerta, ts);
          encerrados++;
          ctx.publicar(
            this.id,
            "alerta.encerrado",
            `Alerta ${alerta.alertaId} encerrado após ${horas.toFixed(1)} h sem reforço`,
            { alertaId: alerta.alertaId },
            alerta.alertaId,
          );
        }
      }

      this.status = encerrados > 0 ? "trabalhando" : "ocioso";
      this.ultimaAtividade = ts;
      this.contadorTrabalho += encerrados;
    },
  };
}
