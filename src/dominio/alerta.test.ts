import { describe, expect, it } from "vitest";
import {
  aplicarAtualizacao,
  criarAlertaCandidato,
  descartar,
  deveAgrupar,
  encerrar,
  expedir,
  validar,
} from "./alerta";
import type { Alerta } from "./tipos";

function candidato(): Alerta {
  return criarAlertaCandidato({
    alertaId: "A-1",
    zonaId: "Z-27",
    limiarId: "L-1",
    severidade: "alta",
    origem: "observacao",
    valorDisparo: 62,
    tsDeteccao: "2026-05-01T12:00:00.000Z",
    leadTimeHoras: null,
    evidencias: [
      {
        tipo: "observacao",
        referenciaId: "obs-9",
        descricao: "Chuva acumulada 6 h na zona Z-27",
        valor: 62,
        ts: "2026-05-01T12:00:00.000Z",
      },
    ],
  });
}

describe("criarAlertaCandidato", () => {
  it("nasce no estado candidato, sem validador nem expedicao", () => {
    const a = candidato();
    expect(a.estado).toBe("candidato");
    expect(a.operadorValidador).toBeNull();
    expect(a.tsValidacao).toBeNull();
    expect(a.tsExpedicao).toBeNull();
  });

  it("carrega a evidencia que o disparou", () => {
    expect(candidato().evidencias).toHaveLength(1);
    expect(candidato().evidencias[0]?.valor).toBe(62);
  });
});

describe("validar", () => {
  it("registra operador e horario", () => {
    const a = validar(candidato(), "coord.plantao", "2026-05-01T12:04:00.000Z");
    expect(a.estado).toBe("validado");
    expect(a.operadorValidador).toBe("coord.plantao");
    expect(a.tsValidacao).toBe("2026-05-01T12:04:00.000Z");
  });

  it("recusa validar um alerta ja descartado", () => {
    const descartado = descartar(candidato(), "chuva localizada sem risco", "2026-05-01T12:02:00.000Z");
    expect(() => validar(descartado, "coord.plantao", "2026-05-01T12:05:00.000Z")).toThrow(
      "só um alerta candidato pode ser validado",
    );
  });

  it("recusa operador vazio", () => {
    expect(() => validar(candidato(), "  ", "2026-05-01T12:04:00.000Z")).toThrow(
      "operador obrigatório",
    );
  });
});

describe("descartar", () => {
  it("exige motivo — CA-ALT-04b", () => {
    expect(() => descartar(candidato(), "", "2026-05-01T12:02:00.000Z")).toThrow(
      "motivo obrigatório",
    );
  });

  it("registra motivo e horario", () => {
    const a = descartar(candidato(), "chuva ja cessou", "2026-05-01T12:02:00.000Z");
    expect(a.estado).toBe("descartado");
    expect(a.motivoDescarte).toBe("chuva ja cessou");
  });
});

// Este bloco e a materializacao de RNF-18. Nao pode ser afrouxado.
describe("expedir", () => {
  it("recusa expedir alerta candidato — CA-ALT-04a", () => {
    expect(() => expedir(candidato(), "2026-05-01T12:05:00.000Z")).toThrow(
      "expedição exige alerta validado por operador identificado",
    );
  });

  it("recusa expedir alerta descartado", () => {
    const d = descartar(candidato(), "sem risco", "2026-05-01T12:02:00.000Z");
    expect(() => expedir(d, "2026-05-01T12:05:00.000Z")).toThrow(
      "expedição exige alerta validado por operador identificado",
    );
  });

  it("expede apenas depois da validacao humana", () => {
    const validado = validar(candidato(), "coord.plantao", "2026-05-01T12:04:00.000Z");
    const expedido = expedir(validado, "2026-05-01T12:05:00.000Z");
    expect(expedido.estado).toBe("expedido");
    expect(expedido.tsExpedicao).toBe("2026-05-01T12:05:00.000Z");
    expect(expedido.operadorValidador).toBe("coord.plantao");
  });
});

describe("encerrar", () => {
  it("encerra alerta expedido", () => {
    const expedido = expedir(
      validar(candidato(), "coord.plantao", "2026-05-01T12:04:00.000Z"),
      "2026-05-01T12:05:00.000Z",
    );
    const encerrado = encerrar(expedido, "2026-05-01T18:00:00.000Z");
    expect(encerrado.estado).toBe("encerrado");
    expect(encerrado.tsEncerramento).toBe("2026-05-01T18:00:00.000Z");
  });
});

describe("deveAgrupar", () => {
  const ativo = expedir(
    validar(candidato(), "coord.plantao", "2026-05-01T12:04:00.000Z"),
    "2026-05-01T12:05:00.000Z",
  );

  it("agrupa severidade igual dentro da janela — CA-ALT-05", () => {
    expect(deveAgrupar(ativo, "alta", "2026-05-01T12:40:00.000Z", 60)).toBe(true);
  });

  it("agrupa severidade menor dentro da janela", () => {
    expect(deveAgrupar(ativo, "media", "2026-05-01T12:40:00.000Z", 60)).toBe(true);
  });

  it("nao agrupa severidade maior — escalada merece tratamento proprio", () => {
    expect(deveAgrupar(ativo, "muito_alta", "2026-05-01T12:40:00.000Z", 60)).toBe(false);
  });

  it("nao agrupa fora da janela", () => {
    expect(deveAgrupar(ativo, "alta", "2026-05-01T14:00:00.000Z", 60)).toBe(false);
  });

  it("nao agrupa em alerta encerrado", () => {
    const encerrado = encerrar(ativo, "2026-05-01T12:30:00.000Z");
    expect(deveAgrupar(encerrado, "alta", "2026-05-01T12:40:00.000Z", 60)).toBe(false);
  });
});

describe("aplicarAtualizacao", () => {
  it("adiciona atualizacao preservando o historico", () => {
    const a = aplicarAtualizacao(candidato(), "reforco", "Chuva mantida", "2026-05-01T12:30:00.000Z");
    const b = aplicarAtualizacao(a, "escalada", "Nivel subindo", "2026-05-01T13:00:00.000Z");
    expect(b.atualizacoes).toHaveLength(2);
    expect(b.atualizacoes[1]?.tipo).toBe("escalada");
  });
});
