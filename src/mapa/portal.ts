import esriId from "@arcgis/core/identity/IdentityManager.js";
import OAuthInfo from "@arcgis/core/identity/OAuthInfo.js";
import { appId, modoEnterprise, portalUrl } from "./config";

/**
 * Autenticacao OAuth 2.0 contra o ArcGIS Enterprise de Sao Paulo.
 *
 * Enquanto VITE_ARCGIS_APP_ID estiver vazio, esta funcao e um no-op:
 * a demo funciona integralmente sem credencial. Quando o App ID for
 * registrado no portal, basta preencher o .env — nenhum outro arquivo muda.
 */
export async function autenticarNoPortal(): Promise<boolean> {
  if (!modoEnterprise()) return false;

  const info = new OAuthInfo({
    appId: appId(),
    portalUrl: portalUrl(),
    popup: false,
  });
  esriId.registerOAuthInfos([info]);

  try {
    await esriId.checkSignInStatus(`${portalUrl()}/sharing`);
    return true;
  } catch {
    // Sem sessao ativa: a demo continua com dado sintetico em vez de
    // interromper a apresentacao com uma tela de login.
    console.warn("[portal] sem sessao ativa no Enterprise; seguindo com dado sintetico");
    return false;
  }
}
