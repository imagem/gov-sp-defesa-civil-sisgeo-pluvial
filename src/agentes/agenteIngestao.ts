import { entre } from "@/dominio/prng";
import type { Observacao } from "@/dominio/tipos";
import type { Agente, ContextoAgente } from "./tipos";

/**
 * Agente de ingestao (modulo ING do SPEC-H1).
 * Um agente por fonte. Le as estacoes operantes da sua fonte e
 * transforma o estado do tempo simulado em observacoes com proveniencia.
 */
export function criarAgenteIngestao(fonteId: string): Agente {
  return {
    id: `agente-ingestao-${fonteId.toLowerCase()}`,
    nome: `Ingestão ${fonteId}`,
    modulo: "ING",
    descricao: `Coleta leituras das estações da fonte ${fonteId}, normaliza unidade e tempo e registra proveniência.`,
    requisitos: ["RF-ING-01", "RF-ING-02", "RF-ING-05"],
    status: "ocioso",
    ultimaAtividade: null,
    contadorTrabalho: 0,

    aoTick(ctx: ContextoAgente): void {
      const estacoes = ctx.estado.estacoes.filter(
        (e) =>
          e.fonteId === fonteId &&
          e.situacao !== "silenciosa" &&
          e.situacao !== "desativada" &&
          !ctx.estado.estacoesSemComunicacao.includes(e.estacaoId),
      );

      if (estacoes.length === 0) {
        this.status = "ocioso";
        return;
      }

      const ts = ctx.relogio.iso;
      for (const estacao of estacoes) {
        const ruido = entre(ctx.aleatorio, 0.75, 1.25);
        const observacao: Observacao =
          estacao.tipo === "fluviometrica"
            ? {
                observacaoId: `obs-${ctx.estado.contador++}`,
                estacaoId: estacao.estacaoId,
                fonteId,
                variavel: "nivel_m",
                valor: Number((ctx.estado.nivelAtualM * ruido).toFixed(3)),
                unidade: "m",
                tsOrigem: ts,
                tsIngestao: ts,
                qualidade: "aprovada",
              }
            : {
                observacaoId: `obs-${ctx.estado.contador++}`,
                estacaoId: estacao.estacaoId,
                fonteId,
                variavel: "chuva_mm",
                valor: Number(((ctx.estado.intensidadeChuvaMmH / 6) * ruido).toFixed(2)),
                unidade: "mm",
                tsOrigem: ts,
                tsIngestao: ts,
                qualidade: "aprovada",
              };

        ctx.estado.observacoes.push(observacao);
        estacao.ultimaLeituraTs = ts;
      }

      this.status = "trabalhando";
      this.ultimaAtividade = ts;
      this.contadorTrabalho += estacoes.length;

      ctx.publicar(this.id, "leitura.ingerida", `${estacoes.length} leituras de ${fonteId}`, {
        fonteId,
        quantidade: estacoes.length,
      });
    },
  };
}
