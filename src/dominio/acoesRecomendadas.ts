import type { Severidade, ZonaRisco } from "./tipos";

/**
 * Catalogo de acoes recomendadas por tipo da zona (inundacao vs
 * deslizamento) e severidade. Nao e LLM nem heuristica estatistica — e um
 * roteiro curto, baseado em cartilhas de defesa civil (ex.: Plano Municipal
 * de Contingencia, protocolos CEMADEN), para que o dossie do alerta sugira
 * o que fazer a seguir sem exigir que o plantao decore manual.
 *
 * As acoes aparecem no dossie do alerta e sao DIDATICAS — nao sao expedidas
 * nem acionam ninguem. O operador decide.
 */

export interface AcaoRecomendada {
  readonly titulo: string;
  readonly detalhe: string;
  readonly responsavel: string;
}

const ACOES_INUNDACAO_BASE: AcaoRecomendada[] = [
  {
    titulo: "Pre-posicionar equipes de resgate",
    detalhe:
      "Deslocar viaturas de busca e salvamento para pontos cegos da sub-bacia; checar inventario de botes.",
    responsavel: "Bombeiros / Defesa Civil municipal",
  },
  {
    titulo: "Confirmar prontidao dos abrigos",
    detalhe:
      "Validar lista de abrigos elegiveis na zona com energia, agua e colchoes suficientes para a populacao estimada.",
    responsavel: "Assistencia Social municipal",
  },
  {
    titulo: "Monitorar cota em pontos criticos",
    detalhe:
      "Observador manual nas reguas de referencia, com reporte a cada 15 min enquanto a cota prevista nao estabilizar.",
    responsavel: "Plantao hidrologico",
  },
];

const ACOES_INUNDACAO_SEVERA: AcaoRecomendada[] = [
  {
    titulo: "Acionar evacuacao preventiva",
    detalhe:
      "Avisar a populacao com antecedencia proporcional ao lead time; rota publicada deve evitar vias que ja alagam na cota prevista.",
    responsavel: "Defesa Civil municipal",
  },
  {
    titulo: "Fechar comportas e acionar EBAPs",
    detalhe:
      "No gemeo digital, verificar quais ativos protegem a zona alertada; operacao em campo depende da regra do municipio.",
    responsavel: "Operacao hidraulica",
  },
  {
    titulo: "Comunicar municipios vizinhos",
    detalhe:
      "Sub-bacia nao respeita divisa municipal; alertar ponte da bacia a jusante para pre-posicionar sua propria estrutura.",
    responsavel: "Coordenadoria estadual",
  },
];

const ACOES_DESLIZAMENTO_BASE: AcaoRecomendada[] = [
  {
    titulo: "Inspecao visual da encosta",
    detalhe:
      "Enviar equipe geotecnica para verificar trincas no solo, agua empocada e vegetacao inclinada em pontos de referencia da zona.",
    responsavel: "Geotecnia municipal",
  },
  {
    titulo: "Checar drenagem a montante",
    detalhe:
      "Limpar bocas de lobo e canaletas na parte alta; agua represada e o gatilho mais frequente de ruptura.",
    responsavel: "Zeladoria urbana",
  },
  {
    titulo: "Monitorar chuva acumulada",
    detalhe:
      "Pluviometros da encosta precisam reportar a cada 10 min; qualquer silencio prolongado dispara despacho de equipe.",
    responsavel: "Plantao operacional",
  },
];

const ACOES_DESLIZAMENTO_SEVERA: AcaoRecomendada[] = [
  {
    titulo: "Evacuacao preventiva da encosta",
    detalhe:
      "Toda a zona de muito alto risco deve ser evacuada antes de a chuva acumulada ultrapassar o limiar critico; checar se abrigos aceitam animais domesticos.",
    responsavel: "Defesa Civil municipal",
  },
  {
    titulo: "Interditar vias de risco",
    detalhe:
      "Fechar acessos a trechos sob corte de encosta; sinalizacao antes do inicio da chuva evita manobras de pico.",
    responsavel: "Transito municipal",
  },
  {
    titulo: "Alertar hospitais e ambulatorios",
    detalhe:
      "Reservar leitos e equipe de ortopedia; informar rotas alternativas de acesso caso a via principal fique interditada.",
    responsavel: "Saude municipal",
  },
];

const SEVERIDADES_CRITICAS: readonly Severidade[] = ["alta", "muito_alta"];

export function acoesParaAlerta(
  zona: Pick<ZonaRisco, "tipo">,
  severidade: Severidade,
): readonly AcaoRecomendada[] {
  const critica = SEVERIDADES_CRITICAS.includes(severidade);
  if (zona.tipo === "deslizamento") {
    return critica
      ? [...ACOES_DESLIZAMENTO_SEVERA, ...ACOES_DESLIZAMENTO_BASE]
      : ACOES_DESLIZAMENTO_BASE;
  }
  return critica
    ? [...ACOES_INUNDACAO_SEVERA, ...ACOES_INUNDACAO_BASE]
    : ACOES_INUNDACAO_BASE;
}
