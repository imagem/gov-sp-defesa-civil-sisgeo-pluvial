import { beforeEach, describe, expect, it } from "vitest";
import { OPERADOR_CARGO, OPERADOR_CODINOME, OPERADOR_DEMO, useSimulacao } from "./store";

describe("useSimulacao", () => {
  beforeEach(() => {
    useSimulacao.getState().reiniciar();
  });

  it("comeca pausado no primeiro cenario", () => {
    const s = useSimulacao.getState();
    expect(s.rodando).toBe(false);
    expect(s.cenarioId).toBe("calmaria");
  });

  it("avanca a versao a cada passo", () => {
    const antes = useSimulacao.getState().versao;
    useSimulacao.getState().passo();
    expect(useSimulacao.getState().versao).toBe(antes + 1);
  });

  it("troca de cenario e recria o motor do zero", () => {
    useSimulacao.getState().passo();
    useSimulacao.getState().trocarCenario("extremo");
    const s = useSimulacao.getState();
    expect(s.cenarioId).toBe("extremo");
    expect(s.motor.estado.observacoes).toHaveLength(0);
  });

  it("alterna execucao", () => {
    useSimulacao.getState().alternarExecucao();
    expect(useSimulacao.getState().rodando).toBe(true);
    useSimulacao.getState().alternarExecucao();
    expect(useSimulacao.getState().rodando).toBe(false);
  });

  it("valida alerta usando o operador da demo", () => {
    useSimulacao.getState().trocarCenario("convectiva");
    for (let i = 0; i < 40; i++) useSimulacao.getState().passo();

    const candidato = useSimulacao
      .getState()
      .motor.estado.alertas.find((a) => a.estado === "candidato");
    if (!candidato) throw new Error("cenario nao gerou candidato");

    useSimulacao.getState().validarAlerta(candidato.alertaId);
    const depois = useSimulacao
      .getState()
      .motor.estado.alertas.find((a) => a.alertaId === candidato.alertaId);
    expect(depois?.operadorValidador).toBe(OPERADOR_DEMO);
    expect(depois?.operadorValidador).toBe("Renata Vasques");
  });

  it("define o perfil do operador da demo", () => {
    expect(OPERADOR_DEMO).toBe("Renata Vasques");
    expect(OPERADOR_CARGO).toBe("Coordenadora de Plantão");
    expect(OPERADOR_CODINOME).toBe("SENTINELA-1");
  });

  it("propaga o erro de motivo vazio ao descartar", () => {
    useSimulacao.getState().trocarCenario("convectiva");
    for (let i = 0; i < 40; i++) useSimulacao.getState().passo();
    const candidato = useSimulacao
      .getState()
      .motor.estado.alertas.find((a) => a.estado === "candidato");
    if (!candidato) throw new Error("cenario nao gerou candidato");

    expect(() => useSimulacao.getState().descartarAlerta(candidato.alertaId, "  ")).toThrow(
      "motivo obrigatório",
    );
  });
});

describe("estado de pagina e modo tecnico", () => {
  beforeEach(() => {
    useSimulacao.getState().reiniciar();
  });

  it("inicia com pagina operacional", () => {
    expect(useSimulacao.getState().pagina).toBe("operacional");
  });

  it("irPara muda a pagina", () => {
    useSimulacao.getState().irPara("agentes");
    expect(useSimulacao.getState().pagina).toBe("agentes");

    useSimulacao.getState().irPara("alertas");
    expect(useSimulacao.getState().pagina).toBe("alertas");

    useSimulacao.getState().irPara("operacional");
    expect(useSimulacao.getState().pagina).toBe("operacional");
  });

  it("inicia com modoTecnico desligado", () => {
    expect(useSimulacao.getState().modoTecnico).toBe(false);
  });

  it("alternarModoTecnico inverte o estado", () => {
    expect(useSimulacao.getState().modoTecnico).toBe(false);

    useSimulacao.getState().alternarModoTecnico();
    expect(useSimulacao.getState().modoTecnico).toBe(true);

    useSimulacao.getState().alternarModoTecnico();
    expect(useSimulacao.getState().modoTecnico).toBe(false);
  });
  it("alternarCamada inverte apenas a camada indicada", () => {
    const antes = useSimulacao.getState().camadasVisiveis;
    const versao = useSimulacao.getState().versao;
    useSimulacao.getState().alternarCamada("zonas");
    const depois = useSimulacao.getState().camadasVisiveis;
    expect(depois.zonas).toBe(false);
    expect(depois.mancha).toBe(antes.mancha);
    expect(depois.estacoes).toBe(antes.estacoes);
    expect(depois.ativos).toBe(antes.ativos);
    expect(depois.subBacias).toBe(antes.subBacias);
    expect(useSimulacao.getState().versao).toBe(versao + 1);
    useSimulacao.getState().alternarCamada("zonas");
    expect(useSimulacao.getState().camadasVisiveis.zonas).toBe(true);
  });

  it("restaura a visibilidade padrao ao trocar de cenario", () => {
    useSimulacao.getState().alternarCamada("mancha");
    useSimulacao.getState().trocarCenario("extremo");
    expect(useSimulacao.getState().camadasVisiveis.mancha).toBe(true);
  });

  it("inicia no basemap escuro, em sintonia com o tema escuro padrao", () => {
    expect(useSimulacao.getState().basemapId).toBe("dark-gray-vector");
  });

  it("definirBasemap troca o mapa base", () => {
    useSimulacao.getState().definirBasemap("satellite");
    expect(useSimulacao.getState().basemapId).toBe("satellite");
    useSimulacao.getState().definirBasemap("dark-gray-vector");
  });
});
