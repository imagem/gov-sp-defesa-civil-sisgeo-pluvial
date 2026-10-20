import type { Alerta, ZonaRisco } from "./tipos";

export interface ParametrosBoletim {
  readonly alerta: Alerta;
  readonly zona: ZonaRisco;
  readonly cotaPrevistaM: number;
  readonly estacoesOperantes: number;
  readonly estacoesTotal: number;
  readonly tsIso: string;
}

const ROTULO_SEVERIDADE: Record<Alerta["severidade"], string> = {
  baixa: "BAIXA",
  media: "MÉDIA",
  alta: "ALTA",
  muito_alta: "MUITO ALTA",
};

/**
 * Compoe o rascunho do boletim a partir EXCLUSIVAMENTE dos dados da simulacao.
 * Nao ha LLM nesta demo: o texto e montado por template, e nenhum numero
 * aparece aqui sem ter sido lido do estado. Isso preserva a propriedade que
 * mais importa em RF-LLM-01 — nao afirmar valor que a fonte nao sustenta.
 */
export function redigirBoletim(p: ParametrosBoletim): string {
  const { alerta, zona } = p;
  const antecedencia =
    alerta.leadTimeHoras === null
      ? "com base em observação já registrada"
      : `com ${alerta.leadTimeHoras} h de antecedência`;

  const evidencias = alerta.evidencias
    .map((e) => `  - ${e.descricao} (${e.valor}, ${e.ts})`)
    .join("\n");

  return [
    `BOLETIM DE SITUAÇÃO — RASCUNHO (requer revisão humana)`,
    ``,
    `Emitido em: ${p.tsIso}`,
    `Alerta: ${alerta.alertaId} | Severidade: ${ROTULO_SEVERIDADE[alerta.severidade]}`,
    `Zona: ${zona.nome} (setor ${zona.codigoSetorSgb}, risco ${zona.grauRisco.replace("_", " ")})`,
    ``,
    `SITUAÇÃO`,
    `Foi identificada condição de risco na zona ${zona.nome} ${antecedencia}.`,
    `Cota prevista no posto de referência: ${p.cotaPrevistaM.toFixed(2)} m.`,
    `População potencialmente exposta: ${zona.populacaoEstimada} pessoas (${zona.familiasEstimadas} famílias).`,
    ``,
    `EVIDÊNCIAS CONSULTADAS`,
    evidencias || "  - (sem evidência registrada)",
    ``,
    `COBERTURA DA REDE DE OBSERVAÇÃO`,
    `${p.estacoesOperantes} de ${p.estacoesTotal} estações operantes no momento da análise.`,
    ``,
    `ORIENTAÇÃO`,
    `Acionar a equipe de defesa civil responsável pelo setor e verificar rotas de acesso.`,
    ``,
    `--`,
    `Rascunho gerado automaticamente a partir das camadas da plataforma.`,
    `Nenhum valor foi estimado fora das fontes citadas acima.`,
    `Este texto NÃO foi expedido: depende de revisão e aprovação humana.`,
  ].join("\n");
}
