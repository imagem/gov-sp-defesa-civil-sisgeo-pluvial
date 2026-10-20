/**
 * Nucleo semantico do gemeo digital de bacia (RF-TWN-01/02/03).
 *
 * Modela uma REDE DE INFLUENCIA entre ativos de protecao (comportas, EBAPs,
 * diques) e zonas de risco: mudar o estado de UM ativo propaga um efeito de cota
 * para OUTRAS zonas. E o que diferencia uma sala de situacao (observa) de um
 * gemeo digital (opera e simula "e se").
 *
 * Funcoes puras e deterministicas. Os coeficientes de efeito sao SINTETICOS —
 * a demo nao resolve hidraulica real (o SPEC-H1 preve isso via modelo acoplavel).
 * No produto, a rede de influencia corresponde a ArcGIS Utility Network / Knowledge.
 */

import { centroide, type Coordenada } from "./geometria";
import { atingeLimiar } from "./limiar";
import type { AtivoProtecao, Limiar, ZonaRisco } from "./tipos";

export type TipoNo = "comporta" | "ebap" | "dique";

export interface NoInfluencia {
  readonly id: string;
  readonly tipo: TipoNo;
}

export interface ArestaInfluencia {
  /** Id do no de origem (o ativo cujo estado gera o efeito). */
  readonly de: string;
  /** Zona influenciada. */
  readonly zonaId: string;
  /**
   * Delta de cota (m) aplicado a zona quando a origem esta MITIGANDO.
   * Negativo protege (jusante); positivo represa (montante).
   */
  readonly efeitoCotaM: number;
}

export interface RedeInfluencia {
  readonly nos: readonly NoInfluencia[];
  readonly arestas: readonly ArestaInfluencia[];
}

/**
 * Um ativo so exerce seu efeito quando esta no estado que o faz agir sobre a
 * cheia: comporta fechada, EBAP operante (bombeando), dique integro.
 */
export function estaMitigando(tipo: TipoNo, estado: string): boolean {
  switch (tipo) {
    case "comporta":
      return estado === "fechada";
    case "ebap":
      return estado === "operante";
    case "dique":
      return estado === "integro";
  }
}

/**
 * Recalcula a cota por zona a partir da cota base, aplicando o efeito de cada
 * ativo que esteja mitigando. Zonas sem aresta ficam com a cota base. Um no
 * ausente do mapa de estados e tratado como nao mitigando. A cota efetiva nunca
 * fica negativa.
 */
export function cotaEfetivaPorZona(
  rede: RedeInfluencia,
  estados: ReadonlyMap<string, string>,
  cotaBasePorZona: ReadonlyMap<string, number>,
): Map<string, number> {
  const tipoPorNo = new Map(rede.nos.map((n) => [n.id, n.tipo]));
  const efetiva = new Map(cotaBasePorZona);

  for (const aresta of rede.arestas) {
    const tipo = tipoPorNo.get(aresta.de);
    if (tipo === undefined) continue;
    const estado = estados.get(aresta.de);
    if (estado === undefined || !estaMitigando(tipo, estado)) continue;

    const base = efetiva.get(aresta.zonaId);
    if (base === undefined) continue;
    efetiva.set(aresta.zonaId, base + aresta.efeitoCotaM);
  }

  for (const [zonaId, cota] of efetiva) {
    efetiva.set(zonaId, Number(Math.max(0, cota).toFixed(3)));
  }
  return efetiva;
}

/**
 * Efeito de cota (m) aplicado por um ativo mitigando sobre a zona que protege.
 * Negativo protege. Parametros sinteticos de demonstracao.
 *
 * A grandeza e calibrada contra a dispersao dos limiares de cota do mundo
 * (3,20 m a 5,40 m sobre ~10 zonas, ou seja ~0,22 m entre limiares vizinhos):
 * um efeito pequeno demais quase nunca cruza um limiar e o operador ve o
 * painel "nao fazer nada". Com -0,8 m uma comporta move de forma confiavel
 * algumas zonas, e o represamento de +0,35 m mantem o custo visivel — a
 * decisao continua sendo uma troca, nao um botao magico.
 */
const EFEITO_PROTECAO: Record<TipoNo, number> = {
  comporta: -0.8,
  ebap: -0.5,
  dique: -0.9,
};
/** Represamento a montante quando uma comporta fecha (efeito colateral). */
const EFEITO_REPRESAMENTO = 0.35;

function distancia(a: Coordenada, b: Coordenada): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function zonasPorProximidade(posicao: Coordenada, zonas: readonly ZonaRisco[]): ZonaRisco[] {
  return [...zonas].sort((z1, z2) => {
    const c1 = z1.geometria.aneis[0] ? centroide(z1.geometria.aneis[0]) : posicao;
    const c2 = z2.geometria.aneis[0] ? centroide(z2.geometria.aneis[0]) : posicao;
    return distancia(posicao, c1) - distancia(posicao, c2);
  });
}

/** Quantos ativos mais proximos podem agir sobre cada zona. */
const PROTETORES_POR_ZONA = 2;

function ativosPorProximidade(
  zona: ZonaRisco,
  ativos: readonly AtivoProtecao[],
): AtivoProtecao[] {
  const anel = zona.geometria.aneis[0];
  const centro: Coordenada = anel ? centroide(anel) : [0, 0];
  return [...ativos].sort(
    (a, b) =>
      distancia(centro, a.posicao) - distancia(centro, b.posicao) ||
      a.ativoId.localeCompare(b.ativoId),
  );
}

/**
 * Constroi a rede de influencia a partir do mundo.
 *
 * A montagem parte das ZONAS, nao dos ativos: cada zona de risco recebe como
 * protetores os PROTETORES_POR_ZONA ativos mais proximos. Partir dos ativos
 * (cada ativo protege a zona mais proxima dele) deixava zonas inteiras sem
 * nenhum ativo capaz de agir sobre elas — varios ativos disputavam a mesma
 * zona vizinha e as demais ficavam orfas, de modo que o gemeo nunca tinha o
 * que oferecer justamente para as zonas expostas.
 *
 * Alem disso, uma comporta ao fechar represa agua para a segunda zona mais
 * proxima dela (a montante). E uma heuristica espacial deterministica — no
 * produto, a topologia viria de ArcGIS Utility Network / Knowledge.
 */
export function construirRedeInfluencia(
  zonas: readonly ZonaRisco[],
  ativos: readonly AtivoProtecao[],
): RedeInfluencia {
  const nos: NoInfluencia[] = ativos.map((a) => ({ id: a.ativoId, tipo: a.tipo }));
  const arestas: ArestaInfluencia[] = [];

  for (const zona of zonas) {
    for (const ativo of ativosPorProximidade(zona, ativos).slice(0, PROTETORES_POR_ZONA)) {
      arestas.push({
        de: ativo.ativoId,
        zonaId: zona.zonaId,
        efeitoCotaM: EFEITO_PROTECAO[ativo.tipo],
      });
    }
  }

  for (const ativo of ativos) {
    if (ativo.tipo !== "comporta") continue;
    const ordenadas = zonasPorProximidade(ativo.posicao, zonas);
    const montante = ordenadas[1];
    // Nao represa uma zona que esta comporta ja protege: o efeito se anularia
    // e a linha do painel ficaria incompreensivel.
    if (!montante) continue;
    const jaProtege = arestas.some(
      (a) => a.de === ativo.ativoId && a.zonaId === montante.zonaId,
    );
    if (jaProtege) continue;
    arestas.push({ de: ativo.ativoId, zonaId: montante.zonaId, efeitoCotaM: EFEITO_REPRESAMENTO });
  }

  return { nos, arestas };
}

/**
 * Soma a populacao das zonas cuja cota efetiva atinge o limiar de nivel da zona.
 * Zonas sem limiar de nivel ou sem cota conhecida nao contam.
 */
export function populacaoExpostaSobCota(
  zonas: readonly ZonaRisco[],
  limiares: readonly Limiar[],
  cotaPorZona: ReadonlyMap<string, number>,
): number {
  let total = 0;
  for (const zona of zonas) {
    const cota = cotaPorZona.get(zona.zonaId);
    if (cota === undefined) continue;
    const limiar = limiares.find((l) => l.zonaId === zona.zonaId && l.variavel === "nivel_m");
    if (!limiar) continue;
    if (atingeLimiar(limiar, cota)) total += zona.populacaoEstimada;
  }
  return total;
}
