import type { Agente, ContextoAgente } from "./tipos";

const PERIODOS_PARA_SILENCIO = 3;

/**
 * Agente de saude da rede (modulo NET, RF-NET-01).
 * Detecta estacao silenciosa e restabelecida, e mantem o indicador
 * de percentual operante que aparece no painel de KPI.
 */
export function criarAgenteRede(): Agente {
  return {
    id: "agente-rede",
    nome: "Saúde da rede",
    modulo: "NET",
    descricao:
      "Monitora disponibilidade e latência das estações. Estação sem leitura por 3 períodos vira silenciosa.",
    requisitos: ["RF-NET-01"],
    status: "ocioso",
    ultimaAtividade: null,
    contadorTrabalho: 0,

    aoTick(ctx: ContextoAgente): void {
      let silenciadas = 0;

      for (const estacao of ctx.estado.estacoes) {
        if (estacao.situacao === "desativada") continue;
        if (estacao.ultimaLeituraTs === null) continue;

        const atraso = ctx.relogio.minutosDesde(estacao.ultimaLeituraTs);
        const limite = estacao.periodicidadeEsperadaMin * PERIODOS_PARA_SILENCIO;

        if (atraso > limite && estacao.situacao !== "silenciosa") {
          estacao.situacao = "silenciosa";
          silenciadas++;
          ctx.publicar(
            this.id,
            "estacao.silenciosa",
            `Estação ${estacao.estacaoId} (${estacao.nome}) sem leitura há ${Math.round(atraso)} min`,
            { estacaoId: estacao.estacaoId, atrasoMinutos: Math.round(atraso) },
          );
        } else if (atraso <= limite && estacao.situacao === "silenciosa") {
          estacao.situacao = "operante";
          ctx.publicar(
            this.id,
            "estacao.restabelecida",
            `Estação ${estacao.estacaoId} voltou a transmitir`,
            { estacaoId: estacao.estacaoId },
          );
        }
      }

      this.status = silenciadas > 0 ? "alerta" : "trabalhando";
      this.ultimaAtividade = ctx.relogio.iso;
      this.contadorTrabalho += 1;
    },
  };
}
