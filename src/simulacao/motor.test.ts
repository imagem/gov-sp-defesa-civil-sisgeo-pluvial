import { describe, expect, it } from "vitest";
import { CENARIOS } from "./cenarios";
import { Motor } from "./motor";

function cenario(id: string) {
  const c = CENARIOS.find((x) => x.id === id);
  if (!c) throw new Error(`cenario ${id} nao encontrado`);
  return c;
}

describe("Motor", () => {
  it("comeca no instante de inicio do cenario", () => {
    const motor = new Motor(cenario("calmaria"));
    expect(motor.relogio.iso).toBe("2026-05-01T06:00:00.000Z");
  });

  it("avanca 10 minutos por tick", () => {
    const motor = new Motor(cenario("calmaria"));
    motor.tick();
    expect(motor.relogio.iso).toBe("2026-05-01T06:10:00.000Z");
  });

  it("monta o enxame de 12 agentes", () => {
    expect(new Motor(cenario("calmaria")).agentes).toHaveLength(12);
  });

  it("produz observacoes desde o primeiro tick", () => {
    const motor = new Motor(cenario("calmaria"));
    motor.tick();
    expect(motor.estado.observacoes.length).toBeGreaterThan(0);
  });

  it("e reproduzivel: dois motores do mesmo cenario convergem", () => {
    const a = new Motor(cenario("extremo"));
    const b = new Motor(cenario("extremo"));
    for (let i = 0; i < 30; i++) {
      a.tick();
      b.tick();
    }
    expect(a.estado.alertas.map((x) => x.alertaId)).toEqual(
      b.estado.alertas.map((x) => x.alertaId),
    );
    expect(a.estado.cotaPrevistaM).toBe(b.estado.cotaPrevistaM);
  });

  it("no cenario extremo, gera alerta preditivo por geofencing", () => {
    const motor = new Motor(cenario("extremo"));
    for (let i = 0; i < 90; i++) motor.tick();
    expect(motor.estado.alertas.some((a) => a.origem === "previsao")).toBe(true);
  });

  it("no cenario de dado sujo, a leitura absurda e reprovada e nao vira alerta", () => {
    const motor = new Motor(cenario("dado-sujo"));
    for (let i = 0; i < 12; i++) motor.tick();
    const reprovadas = motor.estado.observacoes.filter((o) => o.qualidade === "reprovada");
    expect(reprovadas.length).toBeGreaterThan(0);
    expect(reprovadas.some((o) => o.valor === 2000)).toBe(true);
  });

  it("no cenario de rede degradada, ao menos uma estacao fica silenciosa", () => {
    const motor = new Motor(cenario("rede-degradada"));
    for (let i = 0; i < 40; i++) motor.tick();
    expect(motor.estado.estacoes.some((e) => e.situacao === "silenciosa")).toBe(true);
  });

  it("nao expede alerta sem validacao humana — RNF-18 ponta a ponta", () => {
    const motor = new Motor(cenario("extremo"));
    for (let i = 0; i < 120; i++) motor.tick();
    expect(motor.estado.alertas.some((a) => a.estado === "candidato")).toBe(true);
    expect(motor.estado.alertas.every((a) => a.estado !== "expedido")).toBe(true);
  });

  it("expede apenas depois de validarAlerta", () => {
    const motor = new Motor(cenario("convectiva"));
    for (let i = 0; i < 40; i++) motor.tick();
    const candidato = motor.estado.alertas.find((a) => a.estado === "candidato");
    if (!candidato) throw new Error("cenario nao gerou candidato");

    motor.validarAlerta(candidato.alertaId, "coord.plantao");
    motor.tick();

    const depois = motor.estado.alertas.find((a) => a.alertaId === candidato.alertaId);
    expect(depois?.estado).toBe("expedido");
  });

  it("descartarAlerta exige motivo e registra na trilha", () => {
    const motor = new Motor(cenario("convectiva"));
    for (let i = 0; i < 40; i++) motor.tick();
    const candidato = motor.estado.alertas.find((a) => a.estado === "candidato");
    if (!candidato) throw new Error("cenario nao gerou candidato");

    expect(() => motor.descartarAlerta(candidato.alertaId, "")).toThrow("motivo obrigatório");

    motor.descartarAlerta(candidato.alertaId, "celula ja dissipada");
    const depois = motor.estado.alertas.find((a) => a.alertaId === candidato.alertaId);
    expect(depois?.estado).toBe("descartado");
    expect(motor.barramento.historico().map((e) => e.tipo)).toContain("alerta.descartado");
  });

  it("aprovarBoletim registra autor e texto final", () => {
    const motor = new Motor(cenario("convectiva"));
    for (let i = 0; i < 40; i++) motor.tick();
    const candidato = motor.estado.alertas.find((a) => a.estado === "candidato");
    if (!candidato) throw new Error("cenario nao gerou candidato");

    motor.validarAlerta(candidato.alertaId, "coord.plantao");
    motor.tick();
    motor.tick();

    const boletim = motor.estado.boletins[0];
    if (!boletim) throw new Error("sem boletim");

    motor.aprovarBoletim(boletim.boletimId, "coord.plantao", "Texto revisado pelo plantao.");
    expect(motor.estado.boletins[0]?.textoAprovado).toBe("Texto revisado pelo plantao.");
    expect(motor.estado.boletins[0]?.autorAprovacao).toBe("coord.plantao");
  });

  it("mantem o nivel em faixa fisicamente plausivel no cenario extremo", () => {
    const motor = new Motor(cenario("extremo"));
    let pico = 0;
    for (let i = 0; i < 300; i++) {
      motor.tick();
      pico = Math.max(pico, motor.estado.nivelAtualM);
    }
    expect(pico).toBeGreaterThan(3);
    expect(pico).toBeLessThan(12);
  });

  // Trava a regressao do double-count de chuva em preverNivel: a previsao
  // somava a chuva das ultimas 6h de novo, ja tendo essa mesma chuva entrado
  // em nivelAtualM via o motor. O cenario extremo chegava a bater ~9 m de
  // cota prevista, bem acima do recorde do Guaiba (5,35 m, maio de 2024).
  it("cotaPrevistaM (COTA PREVISTA 12H) fica dentro de uma faixa crivel no cenario extremo", () => {
    const motor = new Motor(cenario("extremo"));
    let pico = 0;
    for (let i = 0; i < 300; i++) {
      motor.tick();
      pico = Math.max(pico, motor.estado.cotaPrevistaM);
    }
    // Acima do recorde historico e legitimo — o cenario e "evento extremo
    // prolongado" de proposito — mas o teto de 7 m evita que a previsao
    // volte a soar como um numero de outro planeta.
    expect(pico).toBeLessThanOrEqual(7);
    expect(pico).toBeGreaterThan(3.2); // cruza o menor limiar preditivo semeado (mundo.ts)
  });
});

describe("Motor.despacharEquipe", () => {
  /** Leva o cenario de rede degradada ate ter estacao silenciosa. */
  function motorComEstacaoCaida(): Motor {
    const motor = new Motor(cenario("rede-degradada"));
    for (let i = 0; i < 20; i++) motor.tick();
    return motor;
  }

  it("recusa estacao inexistente", () => {
    const motor = new Motor(cenario("calmaria"));
    expect(() => motor.despacharEquipe("E-999")).toThrow("não encontrada");
  });

  it("abre um despacho e registra o evento na trilha", () => {
    const motor = motorComEstacaoCaida();
    const caida = motor.estado.estacoes.find((e) => e.situacao === "silenciosa");
    expect(caida).toBeDefined();

    const despacho = motor.despacharEquipe(caida!.estacaoId);
    expect(despacho?.estacaoId).toBe(caida!.estacaoId);
    // Nasce em "preparando": a equipe e acionada antes de a viatura sair.
    expect(despacho?.estado).toBe("preparando");
    expect(motor.barramento.historico().map((e) => e.tipo)).toContain("equipe.despachada");
  });

  it("nao abre um segundo despacho para a mesma estacao", () => {
    const motor = motorComEstacaoCaida();
    const caida = motor.estado.estacoes.find((e) => e.situacao === "silenciosa");
    motor.despacharEquipe(caida!.estacaoId);
    expect(motor.despacharEquipe(caida!.estacaoId)).toBeNull();
  });

  it("devolve null quando todo o plantao de campo ja esta ocupado", () => {
    const motor = motorComEstacaoCaida();
    const caidas = motor.estado.estacoes.filter((e) => e.situacao === "silenciosa");
    // O plantao tem 5 especialistas; o cenario derruba 5 estacoes de uma vez.
    expect(caidas.length).toBeGreaterThanOrEqual(5);
    for (const e of caidas.slice(0, 5)) motor.despacharEquipe(e.estacaoId);
    const sexta = caidas[5] ?? caidas[0];
    expect(motor.despacharEquipe(sexta!.estacaoId)).toBeNull();
  });

  it("religa a estacao quando o atendimento termina", () => {
    const motor = motorComEstacaoCaida();
    const caida = motor.estado.estacoes.find((e) => e.situacao === "silenciosa");
    const despacho = motor.despacharEquipe(caida!.estacaoId);
    expect(despacho).not.toBeNull();

    // Preparo + deslocamento + atendimento, em ticks de 10 min, com folga.
    const ticks =
      Math.ceil(
        (despacho!.preparoMin + despacho!.deslocamentoMin + despacho!.atendimentoMin) / 10,
      ) + 1;
    for (let i = 0; i < ticks; i++) motor.tick();

    const depois = motor.estado.estacoes.find((e) => e.estacaoId === caida!.estacaoId);
    expect(depois?.situacao).toBe("operante");
    expect(motor.estado.estacoesSemComunicacao).not.toContain(caida!.estacaoId);
    expect(motor.barramento.historico().map((e) => e.tipo)).toContain("equipe.concluiu");
  });
});
