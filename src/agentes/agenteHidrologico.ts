import { acumular } from "@/dominio/limiar";
import { exposicaoPorMancha, mancharPorCota } from "@/dominio/mancha";
import { preverNivel } from "@/dominio/previsao";
import type { Agente, ContextoAgente } from "./tipos";

const HORIZONTES = [6, 12, 24] as const;

/**
 * Agente hidrologico (modulo MOD, RF-MOD-02/04).
 * Roda o ciclo de previsao, deriva a mancha de inundacao pela cota
 * prevista e calcula a exposicao. E aqui que nasce a acao espacial
 * que o agente de geofencing vai consumir.
 */
export function criarAgenteHidrologico(): Agente {
  let rodada = 0;

  return {
    id: "agente-hidrologico",
    nome: "Modelagem hidrológica",
    modulo: "MOD",
    descricao:
      "Acopla chuva observada e prevista para projetar nível com incerteza, deriva a mancha por cota e cruza com a exposição.",
    // RF-MOD-03 (avaliacao continua de desempenho do modelo — NSE/RMSE/MAE/
    // vies) NAO esta listado aqui: nada neste agente calcula essas metricas.
    requisitos: ["RF-MOD-02", "RF-MOD-04"],
    status: "ocioso",
    ultimaAtividade: null,
    contadorTrabalho: 0,

    aoTick(ctx: ContextoAgente): void {
      const ts = ctx.relogio.iso;
      const estacoesPluvio = ctx.estado.estacoes
        .filter((e) => e.tipo === "pluviometrica")
        .map((e) => e.estacaoId);

      const chuva6h = acumular(ctx.estado.observacoes, "chuva_mm", estacoesPluvio, 6, ts);
      const tempoConcentracao =
        ctx.mundo.subBacias[0]?.tempoConcentracaoHoras ?? 8;

      ctx.estado.previsoes = preverNivel({
        rodadaId: `R-${++rodada}`,
        postoId: ctx.mundo.postoId,
        nivelAtualM: ctx.estado.nivelAtualM,
        chuvaAcumulada6hMm: chuva6h / Math.max(estacoesPluvio.length, 1),
        chuvaPrevista24hMm: ctx.estado.intensidadeChuvaMmH * 6,
        tempoConcentracaoHoras: tempoConcentracao,
        horizontes: [...HORIZONTES],
        tsRodada: ts,
      });

      const doze = ctx.estado.previsoes.find((p) => p.horizonteHoras === 12);
      ctx.estado.cotaPrevistaM = doze?.nivelPrevistoM ?? ctx.estado.nivelAtualM;

      ctx.publicar(
        this.id,
        "previsao.gerada",
        `Rodada R-${rodada}: cota prevista de ${ctx.estado.cotaPrevistaM.toFixed(2)} m em 12 h`,
        { rodadaId: `R-${rodada}`, cotaPrevistaM: ctx.estado.cotaPrevistaM },
      );

      const mancha = mancharPorCota(
        ctx.mundo.corredor,
        ctx.estado.cotaPrevistaM,
        ctx.mundo.cotaBaseM,
      );
      ctx.estado.mancha = mancha;
      ctx.estado.exposicao = exposicaoPorMancha(mancha, ctx.mundo.zonas);

      ctx.publicar(
        this.id,
        "mancha.gerada",
        `Mancha projetada na cota ${ctx.estado.cotaPrevistaM.toFixed(2)} m alcança ${ctx.estado.exposicao.length} zona(s)`,
        {
          cotaM: ctx.estado.cotaPrevistaM,
          zonasAlcancadas: ctx.estado.exposicao.map((e) => e.zonaId),
        },
      );

      this.status = ctx.estado.exposicao.length > 0 ? "alerta" : "trabalhando";
      this.ultimaAtividade = ts;
      this.contadorTrabalho += 1;
    },
  };
}
