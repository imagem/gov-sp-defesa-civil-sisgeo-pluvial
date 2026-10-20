/**
 * Camadas do mapa que o operador pode ligar/desligar. `subBacias` corresponde a
 * camada de base sintetica (sub-bacias + corredor) do GerenciadorCamadas.
 */
export type CamadaId = "mancha" | "zonas" | "estacoes" | "equipes" | "ativos" | "subBacias";

export const CAMADAS_IDS: readonly CamadaId[] = [
  "mancha",
  "zonas",
  "estacoes",
  "equipes",
  "ativos",
  "subBacias",
];

/** Estado inicial: todas as camadas visiveis. */
export function visibilidadePadrao(): Record<CamadaId, boolean> {
  return { mancha: true, zonas: true, estacoes: true, equipes: true, ativos: true, subBacias: true };
}
