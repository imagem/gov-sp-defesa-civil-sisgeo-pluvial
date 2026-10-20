import { beforeEach, describe, expect, it } from "vitest";
import { criarAlertaCandidato, descartar, validar } from "@/dominio/alerta";
import { criarAleatorio } from "@/dominio/prng";
import { RelogioSimulado } from "@/dominio/relogio";
import { Barramento } from "@/simulacao/barramento";
import { criarMundo, type Mundo } from "@/simulacao/mundo";
import { criarAgenteExpedicao } from "./agenteExpedicao";
import { criarAgenteGeofencing } from "./agenteGeofencing";
import { criarAgenteLimiar } from "./agenteLimiar";
import { criarAgenteRedator } from "./agenteRedator";
import { criarEnxame } from "./registro";
import { criarEstadoInicial, type ContextoAgente, type EstadoSimulacao } from "./tipos";

function criarContexto(mundo: Mundo, nivel = 2): ContextoAgente {
  const barramento = new Barramento();
  const relogio = new RelogioSimulado(new Date("2026-05-01T12:00:00.000Z"));
  const estado: EstadoSimulacao = criarEstadoInicial(nivel);
  estado.estacoes = mundo.estacoes.map((e) => ({ ...e }));
  let n = 0;
  return {
    relogio,
    barramento,
    mundo,
    estado,
    aleatorio: criarAleatorio(7),
    publicar(agenteId, tipo, titulo, carga, correlacaoId) {
      barramento.publicar({
        eventoId: `ev-${++n}`,
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

function saturarChuva(ctx: ContextoAgente, mm: number): void {
  const pluvio = ctx.estado.estacoes.filter((e) => e.tipo === "pluviometrica");
  for (const estacao of pluvio) {
    ctx.estado.observacoes.push({
      observacaoId: `obs-${ctx.estado.contador++}`,
      estacaoId: estacao.estacaoId,
      fonteId: estacao.fonteId,
      variavel: "chuva_mm",
      valor: mm,
      unidade: "mm",
      tsOrigem: "2026-05-01T11:00:00.000Z",
      tsIngestao: "2026-05-01T11:00:00.000Z",
      qualidade: "aprovada",
    });
  }
}

describe("agenteLimiar", () => {
  let mundo: Mundo;
  let ctx: ContextoAgente;

  beforeEach(() => {
    mundo = criarMundo(2024);
    ctx = criarContexto(mundo);
  });

  it("nao cria alerta quando nenhum limiar e atingido", () => {
    criarAgenteLimiar().aoTick(ctx);
    expect(ctx.estado.alertas).toHaveLength(0);
  });

  it("cria alerta candidato quando o limiar de chuva e ultrapassado — CA-ALT-02", () => {
    saturarChuva(ctx, 90);
    criarAgenteLimiar().aoTick(ctx);
    expect(ctx.estado.alertas.length).toBeGreaterThan(0);
    expect(ctx.estado.alertas.every((a) => a.estado === "candidato")).toBe(true);
  });

  it("anexa evidencia rastreavel ao alerta", () => {
    saturarChuva(ctx, 90);
    criarAgenteLimiar().aoTick(ctx);
    const alerta = ctx.estado.alertas[0];
    if (!alerta) throw new Error("sem alerta");
    expect(alerta.evidencias.length).toBeGreaterThan(0);
    expect(alerta.evidencias[0]?.tipo).toBe("observacao");
  });

  it("ignora leitura reprovada ao acumular — CA-ING-04 encadeado", () => {
    const pluvio = ctx.estado.estacoes.filter((e) => e.tipo === "pluviometrica");
    for (const estacao of pluvio) {
      ctx.estado.observacoes.push({
        observacaoId: `obs-${ctx.estado.contador++}`,
        estacaoId: estacao.estacaoId,
        fonteId: estacao.fonteId,
        variavel: "chuva_mm",
        valor: 400,
        unidade: "mm",
        tsOrigem: "2026-05-01T11:00:00.000Z",
        tsIngestao: "2026-05-01T11:00:00.000Z",
        qualidade: "reprovada",
        motivoQualidade: "fora de faixa",
      });
    }
    criarAgenteLimiar().aoTick(ctx);
    expect(ctx.estado.alertas).toHaveLength(0);
  });

  it("publica evento correlacionado ao alerta criado", () => {
    saturarChuva(ctx, 90);
    criarAgenteLimiar().aoTick(ctx);
    const alerta = ctx.estado.alertas[0];
    if (!alerta) throw new Error("sem alerta");
    const cadeia = ctx.barramento.porCorrelacao(alerta.alertaId);
    expect(cadeia.map((e) => e.tipo)).toContain("alerta.criado");
  });

  it("volta a alertar na zona depois de um alerta descartado", () => {
    const agente = criarAgenteLimiar();
    saturarChuva(ctx, 90);
    agente.aoTick(ctx);
    const primeiro = ctx.estado.alertas[0];
    if (!primeiro) throw new Error("cenario nao gerou alerta");

    ctx.estado.alertas[0] = descartar(primeiro, "falso positivo", ctx.relogio.iso);
    ctx.relogio.avancarMinutos(20);
    agente.aoTick(ctx);

    const daZona = ctx.estado.alertas.filter((a) => a.zonaId === primeiro.zonaId);
    expect(daZona.length).toBeGreaterThan(1);
    expect(daZona.some((a) => a.estado === "candidato")).toBe(true);
  });
});

describe("agenteAntifadiga (integrado ao agenteLimiar)", () => {
  it("segundo disparo na mesma zona vira atualizacao, nao novo alerta — CA-ALT-05", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    const agente = criarAgenteLimiar();

    saturarChuva(ctx, 90);
    agente.aoTick(ctx);
    const quantidadeInicial = ctx.estado.alertas.length;
    expect(quantidadeInicial).toBeGreaterThan(0);

    ctx.relogio.avancarMinutos(20);
    agente.aoTick(ctx);

    expect(ctx.estado.alertas).toHaveLength(quantidadeInicial);
    expect(ctx.estado.alertas.some((a) => a.atualizacoes.length > 0)).toBe(true);
    expect(ctx.barramento.historico().map((e) => e.tipo)).toContain("alerta.agrupado");
  });
});

describe("agenteGeofencing", () => {
  it("cria alerta preditivo com lead time quando a mancha alcanca a zona — CA-ALT-03", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo, 12);
    ctx.estado.cotaPrevistaM = 12;
    ctx.estado.exposicao = mundo.zonas.slice(0, 2).map((z) => ({
      zonaId: z.zonaId,
      areaInterceptadaKm2: 1.2,
      populacaoEstimada: z.populacaoEstimada,
      familiasEstimadas: z.familiasEstimadas,
      metodoEstimativa: "teste",
    }));

    criarAgenteGeofencing().aoTick(ctx);

    const preditivos = ctx.estado.alertas.filter((a) => a.origem === "previsao");
    expect(preditivos.length).toBeGreaterThan(0);
    expect(preditivos[0]?.leadTimeHoras).toBe(12);
    expect(preditivos[0]?.evidencias[0]?.tipo).toBe("mancha");
  });

  it("nao cria alerta quando nenhuma zona e alcancada", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    ctx.estado.exposicao = [];
    criarAgenteGeofencing().aoTick(ctx);
    expect(ctx.estado.alertas).toHaveLength(0);
  });
});

describe("agenteRedator", () => {
  it("gera boletim em rascunho citando as fontes consultadas — CA-LLM-01", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    const zona = mundo.zonas[0];
    if (!zona) throw new Error("sem zona");

    ctx.estado.alertas.push(
      validar(
        criarAlertaCandidato({
          alertaId: "A-1",
          zonaId: zona.zonaId,
          limiarId: "L-1",
          severidade: "alta",
          origem: "observacao",
          valorDisparo: 72,
          tsDeteccao: "2026-05-01T12:00:00.000Z",
          leadTimeHoras: null,
          evidencias: [
            {
              tipo: "observacao",
              referenciaId: "obs-1",
              descricao: "Chuva acumulada 6 h",
              valor: 72,
              ts: "2026-05-01T12:00:00.000Z",
            },
          ],
        }),
        "coord.plantao",
        "2026-05-01T12:02:00.000Z",
      ),
    );

    criarAgenteRedator().aoTick(ctx);

    const boletim = ctx.estado.boletins[0];
    if (!boletim) throw new Error("sem boletim");
    expect(boletim.textoAprovado).toBeNull();
    expect(boletim.fontesConsultadas.length).toBeGreaterThan(0);
    expect(boletim.textoRascunho).toContain(zona.nome);
    expect(boletim.textoRascunho).toContain("72");
  });

  it("nao redige boletim para alerta ainda candidato", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    const zona = mundo.zonas[0];
    if (!zona) throw new Error("sem zona");
    ctx.estado.alertas.push(
      criarAlertaCandidato({
        alertaId: "A-9",
        zonaId: zona.zonaId,
        limiarId: "L-1",
        severidade: "alta",
        origem: "observacao",
        valorDisparo: 72,
        tsDeteccao: "2026-05-01T12:00:00.000Z",
        leadTimeHoras: null,
        evidencias: [],
      }),
    );
    criarAgenteRedator().aoTick(ctx);
    expect(ctx.estado.boletins).toHaveLength(0);
  });
});

// Este bloco e o coracao demonstrativo da aplicacao.
describe("agenteExpedicao — RNF-18", () => {
  function contextoComAlerta(estado: "candidato" | "validado"): ContextoAgente {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    const zona = mundo.zonas[0];
    if (!zona) throw new Error("sem zona");
    const base = criarAlertaCandidato({
      alertaId: "A-1",
      zonaId: zona.zonaId,
      limiarId: "L-1",
      severidade: "alta",
      origem: "observacao",
      valorDisparo: 72,
      tsDeteccao: "2026-05-01T12:00:00.000Z",
      leadTimeHoras: null,
      evidencias: [],
    });
    ctx.estado.alertas.push(
      estado === "validado" ? validar(base, "coord.plantao", "2026-05-01T12:02:00.000Z") : base,
    );
    return ctx;
  }

  it("fica BLOQUEADO diante de alerta apenas candidato", () => {
    const ctx = contextoComAlerta("candidato");
    const agente = criarAgenteExpedicao();
    agente.aoTick(ctx);

    expect(agente.status).toBe("bloqueado");
    expect(ctx.estado.alertas[0]?.estado).toBe("candidato");
    expect(ctx.barramento.historico().map((e) => e.tipo)).toContain("expedicao.bloqueada");
  });

  it("expede somente depois da validacao humana", () => {
    const ctx = contextoComAlerta("validado");
    const agente = criarAgenteExpedicao();
    agente.aoTick(ctx);

    expect(ctx.estado.alertas[0]?.estado).toBe("expedido");
    expect(ctx.estado.alertas[0]?.operadorValidador).toBe("coord.plantao");
    expect(ctx.barramento.historico().map((e) => e.tipo)).toContain("alerta.expedido");
  });

  it("nunca altera um alerta descartado", () => {
    const ctx = contextoComAlerta("candidato");
    const alerta = ctx.estado.alertas[0];
    if (!alerta) throw new Error("sem alerta");
    ctx.estado.alertas[0] = { ...alerta, estado: "descartado", motivoDescarte: "sem risco" };

    criarAgenteExpedicao().aoTick(ctx);
    expect(ctx.estado.alertas[0]?.estado).toBe("descartado");
  });
});

describe("criarEnxame", () => {
  it("monta os 12 agentes do enxame", () => {
    expect(criarEnxame()).toHaveLength(12);
  });

  it("da a cada agente um id unico", () => {
    const ids = criarEnxame().map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cobre os sete modulos do SPEC-H1", () => {
    const modulos = new Set(criarEnxame().map((a) => a.modulo));
    expect(modulos).toEqual(new Set(["ING", "NET", "MOD", "ALT", "EXP", "LLM", "GOV"]));
  });

  it("declara os requisitos que cada agente demonstra", () => {
    for (const agente of criarEnxame()) {
      expect(agente.requisitos.length).toBeGreaterThan(0);
      for (const requisito of agente.requisitos) {
        expect(requisito).toMatch(/^(RF|RNF)-/);
      }
    }
  });
});
