import { beforeEach, describe, expect, it } from "vitest";
import { criarAleatorio } from "@/dominio/prng";
import { RelogioSimulado } from "@/dominio/relogio";
import { Barramento, type TipoEvento } from "@/simulacao/barramento";
import { criarMundo, type Mundo } from "@/simulacao/mundo";
import { criarAgenteHidrologico } from "./agenteHidrologico";
import { criarAgenteIngestao } from "./agenteIngestao";
import { criarAgenteQualidade } from "./agenteQualidade";
import { criarAgenteRede } from "./agenteRede";
import { criarEstadoInicial, type ContextoAgente, type EstadoSimulacao } from "./tipos";

function criarContexto(mundo: Mundo): ContextoAgente {
  const barramento = new Barramento();
  const relogio = new RelogioSimulado(new Date("2026-05-01T00:00:00.000Z"));
  const estado: EstadoSimulacao = criarEstadoInicial(2);
  estado.estacoes = mundo.estacoes.map((e) => ({ ...e }));
  let contador = 0;
  return {
    relogio,
    barramento,
    mundo,
    estado,
    aleatorio: criarAleatorio(99),
    publicar(agenteId, tipo, titulo, carga, correlacaoId) {
      barramento.publicar({
        eventoId: `ev-${++contador}`,
        tipo,
        agenteId,
        ts: relogio.iso,
        titulo,
        carga,
        ...(correlacaoId ? { correlacaoId } : {}),
      });
    },
  };
}

function tiposPublicados(ctx: ContextoAgente): TipoEvento[] {
  return ctx.barramento.historico().map((e) => e.tipo);
}

describe("agenteIngestao", () => {
  let mundo: Mundo;
  let ctx: ContextoAgente;

  beforeEach(() => {
    mundo = criarMundo(2024);
    ctx = criarContexto(mundo);
  });

  it("ingere leituras apenas das estacoes da sua fonte", () => {
    const agente = criarAgenteIngestao("CEMADEN");
    agente.aoTick(ctx);
    const fontes = new Set(ctx.estado.observacoes.map((o) => o.fonteId));
    expect(fontes).toEqual(new Set(["CEMADEN"]));
  });

  it("gera ao menos uma leitura por estacao operante da fonte", () => {
    const agente = criarAgenteIngestao("CEMADEN");
    const daFonte = mundo.estacoes.filter((e) => e.fonteId === "CEMADEN");
    agente.aoTick(ctx);
    expect(ctx.estado.observacoes.length).toBe(daFonte.length);
  });

  it("nao le estacao silenciosa", () => {
    const agente = criarAgenteIngestao("CEMADEN");
    for (const estacao of ctx.estado.estacoes) {
      if (estacao.fonteId === "CEMADEN") estacao.situacao = "silenciosa";
    }
    agente.aoTick(ctx);
    expect(ctx.estado.observacoes).toHaveLength(0);
  });

  it("nao le estacao sem comunicacao", () => {
    const agente = criarAgenteIngestao("CEMADEN");
    const daFonte = ctx.estado.estacoes.filter((e) => e.fonteId === "CEMADEN");
    ctx.estado.estacoesSemComunicacao = daFonte.map((e) => e.estacaoId);
    agente.aoTick(ctx);
    expect(ctx.estado.observacoes).toHaveLength(0);
  });

  it("registra proveniencia completa na leitura", () => {
    criarAgenteIngestao("CEMADEN").aoTick(ctx);
    const obs = ctx.estado.observacoes[0];
    if (!obs) throw new Error("sem observacao");
    expect(obs.fonteId).toBe("CEMADEN");
    expect(obs.tsOrigem).toBe("2026-05-01T00:00:00.000Z");
    expect(obs.tsIngestao).toBe("2026-05-01T00:00:00.000Z");
    expect(obs.qualidade).toBe("aprovada");
  });

  it("publica evento de ingestao e marca o proprio status", () => {
    const agente = criarAgenteIngestao("CEMADEN");
    agente.aoTick(ctx);
    expect(tiposPublicados(ctx)).toContain("leitura.ingerida");
    expect(agente.status).toBe("trabalhando");
    expect(agente.contadorTrabalho).toBeGreaterThan(0);
  });

  it("atualiza o carimbo de ultima leitura da estacao", () => {
    criarAgenteIngestao("CEMADEN").aoTick(ctx);
    const estacao = ctx.estado.estacoes.find((e) => e.fonteId === "CEMADEN");
    expect(estacao?.ultimaLeituraTs).toBe("2026-05-01T00:00:00.000Z");
  });
});

describe("agenteQualidade", () => {
  it("reprova leitura fora de faixa e publica o evento — RF-ING-04", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    const estacao = mundo.estacoes[0];
    if (!estacao) throw new Error("sem estacao");

    ctx.estado.observacoes.push({
      observacaoId: "obs-absurda",
      estacaoId: estacao.estacaoId,
      fonteId: estacao.fonteId,
      variavel: "chuva_mm",
      valor: 2000,
      unidade: "mm",
      tsOrigem: "2026-05-01T00:00:00.000Z",
      tsIngestao: "2026-05-01T00:00:00.000Z",
      qualidade: "aprovada",
    });

    criarAgenteQualidade().aoTick(ctx);

    const revisada = ctx.estado.observacoes[0];
    expect(revisada?.qualidade).toBe("reprovada");
    expect(revisada?.motivoQualidade).toBe("fora de faixa");
    expect(tiposPublicados(ctx)).toContain("leitura.reprovada");
  });

  it("nao remove a leitura reprovada do estado", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    const estacao = mundo.estacoes[0];
    if (!estacao) throw new Error("sem estacao");
    ctx.estado.observacoes.push({
      observacaoId: "obs-absurda",
      estacaoId: estacao.estacaoId,
      fonteId: estacao.fonteId,
      variavel: "chuva_mm",
      valor: 2000,
      unidade: "mm",
      tsOrigem: "2026-05-01T00:00:00.000Z",
      tsIngestao: "2026-05-01T00:00:00.000Z",
      qualidade: "aprovada",
    });
    criarAgenteQualidade().aoTick(ctx);
    expect(ctx.estado.observacoes).toHaveLength(1);
  });
});

describe("agenteRede", () => {
  it("marca como silenciosa a estacao sem leitura por 3 periodos — CA-NET-01", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    const estacao = ctx.estado.estacoes[0];
    if (!estacao) throw new Error("sem estacao");
    estacao.ultimaLeituraTs = "2026-04-30T23:20:00.000Z"; // 40 min antes
    ctx.relogio.avancarMinutos(0);

    criarAgenteRede().aoTick(ctx);

    expect(estacao.situacao).toBe("silenciosa");
    expect(tiposPublicados(ctx)).toContain("estacao.silenciosa");
  });

  it("mantem operante a estacao que leu dentro do periodo", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    const estacao = ctx.estado.estacoes[0];
    if (!estacao) throw new Error("sem estacao");
    estacao.ultimaLeituraTs = "2026-04-30T23:55:00.000Z";
    criarAgenteRede().aoTick(ctx);
    expect(estacao.situacao).toBe("operante");
  });

  it("ignora estacao que nunca leu (mundo recem-criado)", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    criarAgenteRede().aoTick(ctx);
    expect(ctx.estado.estacoes.every((e) => e.situacao === "operante")).toBe(true);
  });
});

describe("agenteHidrologico", () => {
  it("gera previsoes de nivel com incerteza e publica o evento", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    ctx.estado.nivelAtualM = 3;
    ctx.estado.intensidadeChuvaMmH = 12;

    criarAgenteHidrologico().aoTick(ctx);

    expect(ctx.estado.previsoes.length).toBe(3);
    expect(tiposPublicados(ctx)).toContain("previsao.gerada");
    for (const p of ctx.estado.previsoes) {
      expect(p.limiteSup).toBeGreaterThan(p.limiteInf);
    }
  });

  it("expoe a cota prevista de 12 h no estado", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    ctx.estado.nivelAtualM = 3;

    criarAgenteHidrologico().aoTick(ctx);

    const doze = ctx.estado.previsoes.find((p) => p.horizonteHoras === 12);
    expect(ctx.estado.cotaPrevistaM).toBe(doze?.nivelPrevistoM);
  });

  it("gera mancha de inundacao e publica o evento espacial", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    ctx.estado.nivelAtualM = 6;
    ctx.estado.intensidadeChuvaMmH = 25;

    criarAgenteHidrologico().aoTick(ctx);

    expect(ctx.estado.mancha).not.toBeNull();
    expect(tiposPublicados(ctx)).toContain("mancha.gerada");
  });

  it("calcula exposicao quando a mancha alcanca zonas", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    ctx.estado.nivelAtualM = 12;
    ctx.estado.intensidadeChuvaMmH = 40;

    criarAgenteHidrologico().aoTick(ctx);

    expect(ctx.estado.exposicao.length).toBeGreaterThan(0);
  });
});
