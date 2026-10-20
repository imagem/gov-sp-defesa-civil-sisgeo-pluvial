import { avaliarQualidade } from "@/dominio/qc";
import type { Observacao } from "@/dominio/tipos";
import type { Agente, ContextoAgente } from "./tipos";

/**
 * Quantas leituras anteriores por (estacao, variavel) bastam para a checagem
 * de qualidade (ordem temporal, salto abrupto, sensor travado — este ultimo
 * precisa de 5). Guardamos um pouco mais por margem de seguranca.
 */
const HISTORICO_POR_CHAVE = 8;

function chaveSerie(o: Observacao): string {
  return `${o.estacaoId}|${o.variavel}`;
}

/**
 * Agente de controle de qualidade (RF-ING-04).
 * Reavalia as leituras ainda nao inspecionadas.
 * Leitura reprovada NUNCA e removida — fica no estado com o sinalizador,
 * apenas nao alimenta o motor de alerta.
 *
 * Nota de performance: em vez de reslicear o array inteiro de observacoes a
 * cada leitura (o que o tornava O(n^2) por tick conforme a simulacao
 * avancava), mantemos um pequeno historico por estacao+variavel — e so ele
 * que avaliarQualidade precisa para checar ordem, salto e sensor travado.
 */
export function criarAgenteQualidade(): Agente {
  const ultimasPorChave = new Map<string, Observacao[]>();

  return {
    id: "agente-qualidade",
    nome: "Controle de qualidade",
    modulo: "ING",
    descricao:
      "Verifica faixa física, ordem temporal, salto abrupto e sensor travado. Leitura reprovada é mantida e sinalizada, nunca descartada em silêncio.",
    requisitos: ["RF-ING-04"],
    status: "ocioso",
    ultimaAtividade: null,
    contadorTrabalho: 0,

    aoTick(ctx: ContextoAgente): void {
      // qualidadeCursor e um indice LOCAL no array atual (ja podado pelo
      // motor). O motor mantem esse indice correto sempre que remove
      // observacoes antigas da frente — ver Motor.podarObservacoes().
      const cursor = ctx.estado.qualidadeCursor;
      const pendentes = ctx.estado.observacoes.slice(cursor);
      if (pendentes.length === 0) {
        this.status = "ocioso";
        return;
      }

      let reprovadas = 0;
      for (let i = 0; i < pendentes.length; i++) {
        const leitura = pendentes[i];
        if (!leitura) continue;

        const chave = chaveSerie(leitura);
        const anteriores = ultimasPorChave.get(chave) ?? [];
        const resultado = avaliarQualidade(leitura, anteriores);

        let leituraFinal = leitura;
        if (resultado.qualidade !== "aprovada") {
          leituraFinal = {
            ...leitura,
            qualidade: resultado.qualidade,
            ...(resultado.motivo ? { motivoQualidade: resultado.motivo } : {}),
          };
          ctx.estado.observacoes[cursor + i] = leituraFinal;
          reprovadas++;
          ctx.publicar(
            this.id,
            "leitura.reprovada",
            `Leitura ${leitura.observacaoId} marcada como ${resultado.qualidade}: ${resultado.motivo}`,
            {
              observacaoId: leitura.observacaoId,
              estacaoId: leitura.estacaoId,
              valor: leitura.valor,
              motivo: resultado.motivo,
            },
          );
        }

        const historico = [...anteriores, leituraFinal].slice(-HISTORICO_POR_CHAVE);
        ultimasPorChave.set(chave, historico);
      }

      ctx.estado.qualidadeCursor = ctx.estado.observacoes.length;
      ctx.estado.leiturasReprovadasTotal += reprovadas;
      this.status = reprovadas > 0 ? "alerta" : "trabalhando";
      this.ultimaAtividade = ctx.relogio.iso;
      this.contadorTrabalho += pendentes.length;
    },
  };
}
