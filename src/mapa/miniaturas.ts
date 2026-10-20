import type { BasemapId } from "@/estado/store";

/**
 * Catálogo de mapas base, com a miniatura de cada um.
 *
 * A miniatura é um tile REAL, do mesmo servidor que o mapa usa, centrado na
 * área de interesse da demonstração. Preferimos o tile ao vivo a uma imagem
 * empacotada porque ele é sempre o que o operador vai de fato ver ao escolher
 * a opção — e porque não exige redistribuir arte de terceiros com a aplicação.
 *
 * Por isso o catálogo só inclui mapas base que tenham um serviço de tiles
 * raster equivalente: um mapa base só vetorial entraria aqui com uma
 * miniatura genérica do mundo, que não mostraria a bacia nem as cores reais.
 */

/** Zoom e tile que cobrem o centro sintético do mundo (ver mundo.ts). */
const Z = 11;
const X = 732;
const Y = 1203;

const ARCGIS = "https://server.arcgisonline.com/ArcGIS/rest/services";

/** Ordem de exibição no seletor: claros primeiro, escuros no fim. */
export const BASEMAPS: readonly BasemapId[] = [
  "osm",
  "satellite",
  "topo-vector",
  "gray-vector",
  "dark-gray-vector",
];

export const ROTULO_BASEMAP: Record<BasemapId, string> = {
  osm: "Ruas",
  satellite: "Satélite",
  "topo-vector": "Topográfico",
  "gray-vector": "Cinza claro",
  "dark-gray-vector": "Escuro",
};

export const MINIATURA_BASEMAP: Record<BasemapId, string> = {
  osm: `https://tile.openstreetmap.org/${Z}/${X}/${Y}.png`,
  satellite: `${ARCGIS}/World_Imagery/MapServer/tile/${Z}/${Y}/${X}`,
  "topo-vector": `${ARCGIS}/World_Topo_Map/MapServer/tile/${Z}/${Y}/${X}`,
  "gray-vector": `${ARCGIS}/Canvas/World_Light_Gray_Base/MapServer/tile/${Z}/${Y}/${X}`,
  "dark-gray-vector": `${ARCGIS}/Canvas/World_Dark_Gray_Base/MapServer/tile/${Z}/${Y}/${X}`,
};

export const DESCRICAO_BASEMAP: Record<BasemapId, string> = {
  osm: "Ruas, bairros e vias nomeadas",
  satellite: "Imagem de satélite, sem rótulos",
  "topo-vector": "Relevo, hidrografia e curvas de nível",
  "gray-vector": "Base neutra: realça as camadas de risco",
  "dark-gray-vector": "Base escura, para plantão noturno",
};
