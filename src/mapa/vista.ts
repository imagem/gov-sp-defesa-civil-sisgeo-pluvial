import type MapView from "@arcgis/core/views/MapView.js";

/**
 * Referência à MapView viva, para controles de mapa escritos em React.
 *
 * O widget de zoom do ArcGIS só pode ser ancorado nos quatro cantos da view, e
 * os cantos desta sala estão todos ocupados por painéis flutuantes. Em vez de
 * empurrar o widget com CSS — que quebra assim que um painel é recolhido —, o
 * zoom é um componente nosso, posicionado pelo mesmo layout dos painéis, e
 * fala com a view por aqui.
 *
 * Um módulo com estado em vez de contexto React porque quem escreve
 * (MapaSalaSituacao, num efeito) e quem lê (ControlesMapa) são irmãos, e a
 * view não é um valor renderizável: trocá-la não deve re-renderizar ninguém.
 */
let vistaAtual: MapView | null = null;

export function registrarVista(vista: MapView | null): void {
  vistaAtual = vista;
}

export function obterVista(): MapView | null {
  return vistaAtual;
}

/** Limites de zoom da sala, alinhados ao que os basemaps entregam na bacia. */
const ZOOM_MIN = 8;
const ZOOM_MAX = 18;

/**
 * Aproxima ou afasta um nível. Sem efeito quando a view ainda não montou —
 * o operador pode clicar antes de o mapa terminar de carregar.
 */
export function ajustarZoom(passo: 1 | -1): void {
  const vista = vistaAtual;
  if (!vista) return;
  const alvo = Math.min(Math.max(vista.zoom + passo, ZOOM_MIN), ZOOM_MAX);
  if (alvo === vista.zoom) return;
  void vista.goTo({ zoom: alvo }, { duration: 200 });
}
