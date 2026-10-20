import esriConfig from "@arcgis/core/config.js";

/**
 * Assets do SDK servidos por CDN: evita copiar ~40 MB para o bundle da Vercel.
 * Alternativa, se a rede do orgao bloquear o CDN: usar vite-plugin-static-copy
 * para levar node_modules/@arcgis/core/assets para dist/assets.
 */
const CDN_ASSETS = "https://js.arcgis.com/5.1/@arcgis/core/assets";

export function portalUrl(): string {
  return import.meta.env.VITE_ARCGIS_PORTAL_URL ?? "";
}

export function appId(): string {
  return import.meta.env.VITE_ARCGIS_APP_ID ?? "";
}

/**
 * O modo Enterprise so liga com flag E App ID presentes.
 * Enquanto as credenciais do portal de Sao Paulo nao existirem,
 * a demo roda inteira com dado sintetico e basemap OpenStreetMap.
 */
export function modoEnterprise(): boolean {
  return import.meta.env.VITE_MODO_ENTERPRISE === "true" && appId().trim() !== "";
}

/**
 * Descreve o modo de dados em linguagem apresentavel.
 *
 * `autenticado` reflete o resultado de `autenticarNoPortal()` (ver
 * mapa/portal.ts), nao apenas a configuracao estatica: a flag e o App ID
 * ligados so dizem que o modo Enterprise foi *pedido*, nao que a sessao no
 * portal foi conseguida. Sem o resultado da autenticacao, o cabecalho nao
 * pode honestamente dizer "conectado".
 *
 * - `undefined`: Enterprise ligado, autenticacao ainda em andamento.
 * - `false`: Enterprise ligado, sem sessao ativa — segue com dado sintetico.
 * - `true`: Enterprise ligado e sessao confirmada no portal.
 */
export function descreverModo(autenticado?: boolean): string {
  if (!modoEnterprise()) return "Dado sintético — sem conexão com portal ArcGIS";
  if (autenticado === true) return `Conectado ao portal ${portalUrl()}`;
  if (autenticado === false) {
    return `Enterprise ligado, sem sessão no portal ${portalUrl()} — seguindo com dado sintético`;
  }
  return `Enterprise ligado — verificando sessão no portal ${portalUrl()}...`;
}

export function configurarArcGIS(): void {
  esriConfig.assetsPath = CDN_ASSETS;
  if (modoEnterprise()) {
    esriConfig.portalUrl = portalUrl();
  }
}
