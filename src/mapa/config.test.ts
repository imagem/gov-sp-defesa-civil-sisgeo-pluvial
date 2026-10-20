import { afterEach, describe, expect, it, vi } from "vitest";
import { descreverModo, modoEnterprise } from "./config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("modoEnterprise", () => {
  it("fica desligado quando nao ha App ID", () => {
    vi.stubEnv("VITE_MODO_ENTERPRISE", "true");
    vi.stubEnv("VITE_ARCGIS_APP_ID", "");
    expect(modoEnterprise()).toBe(false);
  });

  it("fica desligado quando a flag e false, mesmo com App ID", () => {
    vi.stubEnv("VITE_MODO_ENTERPRISE", "false");
    vi.stubEnv("VITE_ARCGIS_APP_ID", "abc123");
    expect(modoEnterprise()).toBe(false);
  });

  it("liga quando flag e App ID estao presentes", () => {
    vi.stubEnv("VITE_MODO_ENTERPRISE", "true");
    vi.stubEnv("VITE_ARCGIS_APP_ID", "abc123");
    vi.stubEnv("VITE_ARCGIS_PORTAL_URL", "https://portal.exemplo.gov.br/portal");
    expect(modoEnterprise()).toBe(true);
  });

  it("descreve o modo em linguagem apresentavel", () => {
    vi.stubEnv("VITE_MODO_ENTERPRISE", "false");
    expect(descreverModo()).toContain("sintético");
  });

  it("distingue ligado-mas-sem-sessao de conectado quando o Enterprise esta ligado", () => {
    vi.stubEnv("VITE_MODO_ENTERPRISE", "true");
    vi.stubEnv("VITE_ARCGIS_APP_ID", "abc123");
    vi.stubEnv("VITE_ARCGIS_PORTAL_URL", "https://portal.exemplo.gov.br/portal");

    const verificando = descreverModo();
    const semSessao = descreverModo(false);
    const conectado = descreverModo(true);

    // Os tres estados devem ser visualmente distintos — e exatamente a falha
    // que este teste impede: a demo nunca deve dizer "conectado" sem que a
    // autenticacao tenha de fato confirmado uma sessao no portal.
    expect(new Set([verificando, semSessao, conectado]).size).toBe(3);
    expect(conectado).toContain("Conectado ao portal");
    expect(semSessao).not.toContain("Conectado ao portal");
    expect(semSessao).toContain("sintético");
  });
});
