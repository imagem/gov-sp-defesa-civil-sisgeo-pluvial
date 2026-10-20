import { describe, expect, it } from "vitest";
import {
  avancarDespacho,
  criarDespacho,
  escolherEspecialista,
  ESPECIALISTAS,
  estimarDeslocamentoMin,
  minutosRestantes,
  pontoNaRota,
  posicaoDoDespacho,
  progressoTrajeto,
  rotuloDespacho,
  tracarRota,
} from "./despacho";

function despachoBase() {
  return criarDespacho({
    despachoId: "D-001",
    estacaoId: "E-004",
    estacaoNome: "Médio Antas 4",
    especialista: "Téc. Marcos Ribeiro",
    equipe: "REDE-1",
    motivo: "silenciosa",
    origem: [-51.22, -30.03],
    destino: [-51.12, -30.03],
    tsDespacho: "2026-05-01T12:00:00.000Z",
  });
}

describe("tracarRota", () => {
  it("sai da origem e termina no destino", () => {
    const rota = tracarRota([0, 0], [1, 1], "E-001");
    expect(rota.pontos[0]).toEqual([0, 0]);
    expect(rota.pontos[rota.pontos.length - 1]).toEqual([1, 1]);
  });

  it("é mais longa que a reta — a viatura não voa", () => {
    const rota = tracarRota([0, 0], [1, 1], "E-001");
    expect(rota.comprimentoGraus).toBeGreaterThan(Math.hypot(1, 1));
  });

  it("é determinística por estação", () => {
    expect(tracarRota([0, 0], [1, 1], "E-007")).toEqual(tracarRota([0, 0], [1, 1], "E-007"));
  });

  it("estações diferentes recebem percursos diferentes", () => {
    const a = tracarRota([0, 0], [1, 1], "E-001");
    const b = tracarRota([0, 0], [1, 1], "E-002");
    expect(a.pontos).not.toEqual(b.pontos);
  });
});

describe("estimarDeslocamentoMin", () => {
  it("cresce com o comprimento do percurso", () => {
    const perto = estimarDeslocamentoMin(tracarRota([0, 0], [0.05, 0], "E-001"));
    const longe = estimarDeslocamentoMin(tracarRota([0, 0], [0.4, 0], "E-001"));
    expect(longe).toBeGreaterThan(perto);
  });

  it("respeita o piso e o teto de deslocamento", () => {
    expect(estimarDeslocamentoMin(tracarRota([0, 0], [0, 0], "E-001"))).toBe(40);
    expect(estimarDeslocamentoMin(tracarRota([0, 0], [50, 0], "E-001"))).toBe(240);
  });
});

describe("escolherEspecialista", () => {
  it("devolve o primeiro do plantão quando ninguém está em campo", () => {
    expect(escolherEspecialista([])?.nome).toBe(ESPECIALISTAS[0]?.nome);
  });

  it("pula quem já está em um despacho aberto", () => {
    const escolhido = escolherEspecialista([{ especialista: ESPECIALISTAS[0]!.nome }]);
    expect(escolhido?.nome).toBe(ESPECIALISTAS[1]?.nome);
  });

  it("devolve null quando todo o plantão está ocupado", () => {
    const todos = ESPECIALISTAS.map((e) => ({ especialista: e.nome }));
    expect(escolherEspecialista(todos)).toBeNull();
  });
});

describe("avancarDespacho", () => {
  it("começa acionando a equipe, não já na estrada", () => {
    expect(despachoBase().estado).toBe("preparando");
  });

  it("a viatura não se move enquanto a equipe é acionada", () => {
    const d = despachoBase();
    expect(progressoTrajeto(avancarDespacho(d, d.preparoMin - 1))).toBe(0);
  });

  it("passa a a_caminho quando o preparo termina", () => {
    const d = despachoBase();
    expect(avancarDespacho(d, d.preparoMin).estado).toBe("a_caminho");
  });

  it("passa a em_atendimento ao cumprir preparo mais deslocamento", () => {
    const d = despachoBase();
    expect(avancarDespacho(d, d.preparoMin + d.deslocamentoMin).estado).toBe("em_atendimento");
  });

  it("conclui ao cumprir as três etapas", () => {
    const d = despachoBase();
    const total = d.preparoMin + d.deslocamentoMin + d.atendimentoMin;
    expect(avancarDespacho(d, total).estado).toBe("concluido");
  });

  it("não reabre um despacho concluído", () => {
    const concluido = avancarDespacho(despachoBase(), 10_000);
    expect(avancarDespacho(concluido, 10).decorridoMin).toBe(concluido.decorridoMin);
  });
});

describe("pontoNaRota", () => {
  const rota = tracarRota([0, 0], [1, 0], "E-003");

  it("parte do primeiro vértice e chega ao último", () => {
    expect(pontoNaRota(rota, 0).posicao).toEqual(rota.pontos[0]);
    const fim = pontoNaRota(rota, 1).posicao;
    expect(fim[0]).toBeCloseTo(1, 6);
    expect(fim[1]).toBeCloseTo(0, 6);
  });

  it("segue os vértices, não a reta entre origem e destino", () => {
    const meio = pontoNaRota(rota, 0.5).posicao;
    expect(Math.abs(meio[1])).toBeGreaterThan(0);
  });

  it("devolve um rumo utilizável para girar o ícone", () => {
    const a = pontoNaRota(rota, 0.1).anguloGraus;
    expect(Number.isFinite(a)).toBe(true);
    expect(Math.abs(a)).toBeLessThanOrEqual(180);
  });
});

describe("posicaoDoDespacho", () => {
  it("fica no pátio enquanto a equipe é acionada", () => {
    const d = despachoBase();
    expect(posicaoDoDespacho(d).posicao).toEqual(d.rota.pontos[0]);
  });

  it("chega à estação quando o deslocamento termina", () => {
    const d = despachoBase();
    const chegou = avancarDespacho(d, d.preparoMin + d.deslocamentoMin);
    const [x, y] = posicaoDoDespacho(chegou).posicao;
    expect(x).toBeCloseTo(-51.12, 6);
    expect(y).toBeCloseTo(-30.03, 6);
  });

  it("não ultrapassa o destino durante o atendimento", () => {
    expect(progressoTrajeto(avancarDespacho(despachoBase(), 10_000))).toBe(1);
  });
});

describe("minutosRestantes e rotuloDespacho", () => {
  it("conta preparo, deslocamento e atendimento", () => {
    const d = despachoBase();
    expect(minutosRestantes(d)).toBe(d.preparoMin + d.deslocamentoMin + d.atendimentoMin);
  });

  it("nunca fica negativo", () => {
    expect(minutosRestantes(avancarDespacho(despachoBase(), 10_000))).toBe(0);
  });

  it("descreve a etapa atual com o tempo restante", () => {
    const d = despachoBase();
    expect(rotuloDespacho(d)).toContain("acionando equipe");
    expect(rotuloDespacho(avancarDespacho(d, d.preparoMin))).toContain("a caminho");
    expect(rotuloDespacho(avancarDespacho(d, d.preparoMin + d.deslocamentoMin))).toContain(
      "em atendimento",
    );
    expect(rotuloDespacho(avancarDespacho(d, 10_000))).toContain("concluído");
  });
});
