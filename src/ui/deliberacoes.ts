import type { EstadoSimulacao } from "@/agentes/tipos";
import type { EstadoAlerta, Severidade } from "@/dominio/tipos";
import type { Mundo } from "@/simulacao/mundo";

export interface LinhaDeliberacao {
  readonly alertaId: string;
  readonly zonaNome: string;
  readonly severidade: Severidade;
  readonly estado: EstadoAlerta;
  readonly operador: string | null;
  readonly motivoDescarte: string | null;
  readonly leadTimeHoras: number | null;
  readonly tsDeteccao: string;
  readonly tsValidacao: string | null;
  readonly tsExpedicao: string | null;
  readonly temBoletim: boolean;
}

/**
 * Historico de deliberacoes: todos os alertas (inclusive descartados e
 * encerrados), do mais recente para o mais antigo por deteccao.
 */
export function montarDeliberacoes(estado: EstadoSimulacao, mundo: Mundo): LinhaDeliberacao[] {
  const nomesZona = new Map(mundo.zonas.map((z) => [z.zonaId, z.nome]));
  const alertasComBoletim = new Set(estado.boletins.map((b) => b.alertaId));

  return estado.alertas
    .map((a): LinhaDeliberacao => ({
      alertaId: a.alertaId,
      zonaNome: nomesZona.get(a.zonaId) ?? a.zonaId,
      severidade: a.severidade,
      estado: a.estado,
      operador: a.operadorValidador,
      motivoDescarte: a.motivoDescarte,
      leadTimeHoras: a.leadTimeHoras,
      tsDeteccao: a.tsDeteccao,
      tsValidacao: a.tsValidacao,
      tsExpedicao: a.tsExpedicao,
      temBoletim: alertasComBoletim.has(a.alertaId),
    }))
    .sort((x, y) => Date.parse(y.tsDeteccao) - Date.parse(x.tsDeteccao));
}
