import type { EstadoSimulacao } from "@/agentes/tipos";
import { montarContingencia } from "@/dominio/desempenho";
import { desempenhoAlerta, mae, nse, rmse, vies } from "@/dominio/metricas";

/**
 * Visao de desempenho para o painel (RF-MOD-03 e RF-ALT-06), derivada das series
 * que o motor acumula. Numeros SINTETICOS — o painel deve rotula-los como tal.
 */
export interface Desempenho {
  /** Quantidade de pares previsto x realizado ja coletados. */
  readonly amostras: number;
  readonly nse: number | null;
  readonly rmse: number | null;
  readonly mae: number | null;
  readonly vies: number | null;
  readonly pod: number;
  readonly far: number;
  readonly csi: number;
  readonly acertos: number;
  readonly perdas: number;
  readonly falsosAlarmes: number;
}

const MIN_AMOSTRAS = 2;

export function calcularDesempenho(estado: EstadoSimulacao): Desempenho {
  const obs = estado.serieNivelRealizado;
  const prev = estado.serieNivelPrevisto;
  const amostras = obs.length;

  let nseV: number | null = null;
  let rmseV: number | null = null;
  let maeV: number | null = null;
  let viesV: number | null = null;

  if (amostras >= MIN_AMOSTRAS) {
    rmseV = rmse(obs, prev);
    maeV = mae(obs, prev);
    viesV = vies(obs, prev);
    try {
      nseV = nse(obs, prev);
    } catch {
      // Serie observada sem variancia: NSE indefinido, os demais seguem validos.
      nseV = null;
    }
  }

  const contingencia = montarContingencia(estado.zonasAlertadasHist, estado.zonasInundadasHist);
  const alerta = desempenhoAlerta(contingencia);

  return {
    amostras,
    nse: nseV,
    rmse: rmseV,
    mae: maeV,
    vies: viesV,
    pod: alerta.pod,
    far: alerta.far,
    csi: alerta.csi,
    acertos: contingencia.acertos,
    perdas: contingencia.perdas,
    falsosAlarmes: contingencia.falsosAlarmes,
  };
}
