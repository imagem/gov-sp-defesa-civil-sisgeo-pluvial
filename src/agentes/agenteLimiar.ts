import { aplicarAtualizacao, criarAlertaCandidato, deveAgrupar } from "@/dominio/alerta";
import { acumular, atingeLimiar, limiaresVigentes } from "@/dominio/limiar";
import type { Agente, ContextoAgente } from "./tipos";

const JANELA_AGRUPAMENTO_MIN = 60;

/**
 * Agente de limiar observado (RF-ALT-01/02) com antifadiga (RF-ALT-05).
 * So enxerga leituras aprovadas — leitura reprovada nunca dispara alerta.
 */
export function criarAgenteLimiar(): Agente {
  let sequencia = 0;

  return {
    id: "agente-limiar",
    nome: "Motor de limiares",
    modulo: "ALT",
    descricao:
      "Avalia os limiares vigentes por zona de risco contra as leituras aprovadas e cria alertas candidatos com evidência rastreável.",
    requisitos: ["RF-ALT-01", "RF-ALT-02", "RF-ALT-05"],
    status: "ocioso",
    ultimaAtividade: null,
    contadorTrabalho: 0,

    aoTick(ctx: ContextoAgente): void {
      const ts = ctx.relogio.iso;
      const vigentes = limiaresVigentes(ctx.mundo.limiares, ts).filter(
        (l) => l.origem === "observacao",
      );

      let criados = 0;
      let agrupados = 0;

      for (const limiar of vigentes) {
        const zona = ctx.mundo.zonas.find((z) => z.zonaId === limiar.zonaId);
        if (!zona) continue;

        const estacoesDaZona = ctx.estado.estacoes
          .filter((e) => e.subBaciaId === zona.subBaciaId && e.tipo === "pluviometrica")
          .map((e) => e.estacaoId);
        if (estacoesDaZona.length === 0) continue;

        const acumulado = acumular(
          ctx.estado.observacoes,
          limiar.variavel,
          estacoesDaZona,
          limiar.janelaHoras,
          ts,
        );
        const media = acumulado / estacoesDaZona.length;
        if (!atingeLimiar(limiar, media)) continue;

        const ativo = ctx.estado.alertas.find(
          (a) =>
            a.zonaId === zona.zonaId &&
            a.origem === "observacao" &&
            a.estado !== "encerrado" &&
            a.estado !== "descartado",
        );

        if (ativo && deveAgrupar(ativo, limiar.severidade, ts, JANELA_AGRUPAMENTO_MIN)) {
          const indice = ctx.estado.alertas.indexOf(ativo);
          ctx.estado.alertas[indice] = aplicarAtualizacao(
            ativo,
            "reforco",
            `Limiar reincidente: ${media.toFixed(1)} mm acumulados em ${limiar.janelaHoras} h`,
            ts,
          );
          agrupados++;
          ctx.publicar(
            this.id,
            "alerta.agrupado",
            `Reincidência na zona ${zona.nome} agrupada no alerta ${ativo.alertaId}`,
            { alertaId: ativo.alertaId, valor: media },
            ativo.alertaId,
          );
          continue;
        }

        if (ativo) continue;

        const alertaId = `A-OBS-${String(++sequencia).padStart(3, "0")}`;
        const alerta = criarAlertaCandidato({
          alertaId,
          zonaId: zona.zonaId,
          limiarId: limiar.limiarId,
          severidade: limiar.severidade,
          origem: "observacao",
          valorDisparo: Number(media.toFixed(1)),
          tsDeteccao: ts,
          leadTimeHoras: null,
          evidencias: [
            {
              tipo: "observacao",
              referenciaId: limiar.limiarId,
              descricao: `Chuva acumulada de ${media.toFixed(1)} mm em ${limiar.janelaHoras} h nas ${estacoesDaZona.length} estações da zona`,
              valor: Number(media.toFixed(1)),
              ts,
            },
          ],
        });

        ctx.estado.alertas.push(alerta);
        criados++;

        ctx.publicar(
          this.id,
          "limiar.atingido",
          `Limiar ${limiar.limiarId} atingido na zona ${zona.nome}: ${media.toFixed(1)} mm`,
          { limiarId: limiar.limiarId, zonaId: zona.zonaId, valor: media },
          alertaId,
        );
        ctx.publicar(
          this.id,
          "alerta.criado",
          `Alerta ${alertaId} (${limiar.severidade}) criado para ${zona.nome} — aguardando validação humana`,
          { alertaId, zonaId: zona.zonaId, severidade: limiar.severidade },
          alertaId,
        );
      }

      this.status = criados > 0 || agrupados > 0 ? "alerta" : "trabalhando";
      this.ultimaAtividade = ts;
      this.contadorTrabalho += vigentes.length;
    },
  };
}
