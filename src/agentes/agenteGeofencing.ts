import { criarAlertaCandidato } from "@/dominio/alerta";
import { atingeLimiar, limiaresVigentes } from "@/dominio/limiar";
import type { Agente, ContextoAgente } from "./tipos";

const HORIZONTE_ALERTA_HORAS = 12;

/**
 * Agente de geofencing preditivo (RF-ALT-03).
 * Esta e a acao espacial da demo: cruza a mancha projetada com as zonas
 * de risco e antecipa o alerta em relacao ao limiar observado.
 */
export function criarAgenteGeofencing(): Agente {
  let sequencia = 0;

  return {
    id: "agente-geofencing",
    nome: "Geofencing preditivo",
    modulo: "ALT",
    descricao:
      "Cruza a mancha de inundação projetada com as zonas de risco e dispara alerta antecipado, com a antecedência registrada.",
    requisitos: ["RF-ALT-03"],
    status: "ocioso",
    ultimaAtividade: null,
    contadorTrabalho: 0,

    aoTick(ctx: ContextoAgente): void {
      const ts = ctx.relogio.iso;

      if (ctx.estado.exposicao.length === 0) {
        this.status = "trabalhando";
        this.ultimaAtividade = ts;
        return;
      }

      const vigentes = limiaresVigentes(ctx.mundo.limiares, ts).filter(
        (l) => l.origem === "previsao",
      );

      let criados = 0;

      for (const exposicao of ctx.estado.exposicao) {
        const limiar = vigentes.find((l) => l.zonaId === exposicao.zonaId);
        if (!limiar) continue;
        if (!atingeLimiar(limiar, ctx.estado.cotaPrevistaM)) continue;

        const jaExiste = ctx.estado.alertas.some(
          (a) =>
            a.zonaId === exposicao.zonaId &&
            a.origem === "previsao" &&
            a.estado !== "encerrado" &&
            a.estado !== "descartado",
        );
        if (jaExiste) continue;

        const zona = ctx.mundo.zonas.find((z) => z.zonaId === exposicao.zonaId);
        if (!zona) continue;

        const alertaId = `A-PRE-${String(++sequencia).padStart(3, "0")}`;
        ctx.estado.alertas.push(
          criarAlertaCandidato({
            alertaId,
            zonaId: zona.zonaId,
            limiarId: limiar.limiarId,
            severidade: limiar.severidade,
            origem: "previsao",
            valorDisparo: ctx.estado.cotaPrevistaM,
            tsDeteccao: ts,
            leadTimeHoras: HORIZONTE_ALERTA_HORAS,
            evidencias: [
              {
                tipo: "mancha",
                referenciaId: limiar.limiarId,
                descricao: `Mancha na cota ${ctx.estado.cotaPrevistaM.toFixed(2)} m intercepta ${zona.nome} — ${exposicao.populacaoEstimada} pessoas expostas`,
                valor: ctx.estado.cotaPrevistaM,
                ts,
              },
            ],
          }),
        );
        criados++;

        ctx.publicar(
          this.id,
          "alerta.criado",
          `Alerta preditivo ${alertaId} para ${zona.nome} com ${HORIZONTE_ALERTA_HORAS} h de antecedência`,
          {
            alertaId,
            zonaId: zona.zonaId,
            leadTimeHoras: HORIZONTE_ALERTA_HORAS,
            populacaoExposta: exposicao.populacaoEstimada,
          },
          alertaId,
        );
      }

      this.status = criados > 0 ? "alerta" : "trabalhando";
      this.ultimaAtividade = ts;
      this.contadorTrabalho += ctx.estado.exposicao.length;
    },
  };
}
