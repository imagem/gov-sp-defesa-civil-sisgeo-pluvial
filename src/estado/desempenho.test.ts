import { describe, expect, it } from "vitest";
import { calcularDesempenho } from "./desempenho";
import { criarEstadoInicial, type EstadoSimulacao } from "@/agentes/tipos";

function estadoCom(parcial: Partial<EstadoSimulacao>): EstadoSimulacao {
  return { ...criarEstadoInicial(2), ...parcial };
}

describe("calcularDesempenho", () => {
  it("calcula metricas de modelo e de alerta a partir das series acumuladas", () => {
    const d = calcularDesempenho(
      estadoCom({
        serieNivelRealizado: [1, 2, 3],
        serieNivelPrevisto: [2, 3, 4],
        zonasAlertadasHist: ["Z1", "Z2"],
        zonasInundadasHist: ["Z2", "Z3"],
      }),
    );
    expect(d.amostras).toBe(3);
    expect(d.rmse).toBe(1);
    expect(d.mae).toBe(1);
    expect(d.vies).toBe(1);
    expect(d.nse).toBe(-0.5);
    expect(d.acertos).toBe(1);
    expect(d.falsosAlarmes).toBe(1);
    expect(d.perdas).toBe(1);
    expect(d.pod).toBeCloseTo(0.5, 5);
  });

  it("deixa as metricas de modelo nulas ate haver ao menos duas amostras", () => {
    const d = calcularDesempenho(estadoCom({ serieNivelRealizado: [3], serieNivelPrevisto: [3] }));
    expect(d.amostras).toBe(1);
    expect(d.nse).toBeNull();
    expect(d.rmse).toBeNull();
    expect(d.mae).toBeNull();
    expect(d.vies).toBeNull();
  });

  it("mantem RMSE/MAE/vies mas deixa NSE nulo quando o realizado nao tem variancia", () => {
    const d = calcularDesempenho(
      estadoCom({ serieNivelRealizado: [2, 2], serieNivelPrevisto: [1, 3] }),
    );
    expect(d.nse).toBeNull();
    expect(d.rmse).toBe(1);
    expect(d.mae).toBe(1);
  });
});
