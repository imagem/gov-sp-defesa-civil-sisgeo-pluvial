import { redigirBoletim } from "@/dominio/boletim";
import type { Agente, ContextoAgente } from "./tipos";

/**
 * Agente redator (modulo LLM, RF-LLM-01/03/05).
 * Produz SEMPRE rascunho. Nao expede, nao altera limiar, nao escreve dado autoritativo.
 */
export function criarAgenteRedator(): Agente {
  let sequencia = 0;

  return {
    id: "agente-redator",
    nome: "Assistente de plantão",
    modulo: "LLM",
    descricao:
      "Redige o boletim de situação em rascunho, citando as fontes consultadas. Só lê e rascunha — nunca escreve dado autoritativo nem expede.",
    requisitos: ["RF-LLM-01", "RF-LLM-03", "RF-LLM-05"],
    status: "ocioso",
    ultimaAtividade: null,
    contadorTrabalho: 0,

    aoTick(ctx: ContextoAgente): void {
      const ts = ctx.relogio.iso;
      const pendentes = ctx.estado.alertas.filter(
        (a) =>
          (a.estado === "validado" || a.estado === "expedido") &&
          !ctx.estado.boletins.some((b) => b.alertaId === a.alertaId),
      );

      if (pendentes.length === 0) {
        this.status = "ocioso";
        this.ultimaAtividade = ts;
        return;
      }

      const operantes = ctx.estado.estacoes.filter((e) => e.situacao === "operante").length;

      for (const alerta of pendentes) {
        const zona = ctx.mundo.zonas.find((z) => z.zonaId === alerta.zonaId);
        if (!zona) continue;

        const fontes = [
          `zonas de risco (${zona.codigoSetorSgb})`,
          `previsão de nível do posto ${ctx.mundo.postoId}`,
          `rede de observação (${operantes}/${ctx.estado.estacoes.length} estações)`,
          ...alerta.evidencias.map((e) => e.descricao),
        ];

        ctx.estado.boletins.push({
          boletimId: `B-${String(++sequencia).padStart(3, "0")}`,
          alertaId: alerta.alertaId,
          publico: "defesa_civil",
          textoRascunho: redigirBoletim({
            alerta,
            zona,
            cotaPrevistaM: ctx.estado.cotaPrevistaM,
            estacoesOperantes: operantes,
            estacoesTotal: ctx.estado.estacoes.length,
            tsIso: ts,
          }),
          textoAprovado: null,
          fontesConsultadas: fontes,
          tsGeracao: ts,
          tsAprovacao: null,
          autorAprovacao: null,
        });

        ctx.publicar(
          this.id,
          "ferramenta.invocada",
          `Consultadas ${fontes.length} fontes para compor o boletim de ${alerta.alertaId}`,
          { alertaId: alerta.alertaId, fontes },
          alerta.alertaId,
        );
        ctx.publicar(
          this.id,
          "boletim.rascunho",
          `Boletim de ${alerta.alertaId} redigido em rascunho — aguardando aprovação humana`,
          { alertaId: alerta.alertaId },
          alerta.alertaId,
        );
      }

      this.status = "trabalhando";
      this.ultimaAtividade = ts;
      this.contadorTrabalho += pendentes.length;
    },
  };
}
