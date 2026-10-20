import { criarAgenteAntifadiga } from "./agenteAntifadiga";
import { criarAgenteAuditoria } from "./agenteAuditoria";
import { criarAgenteExpedicao } from "./agenteExpedicao";
import { criarAgenteGeofencing } from "./agenteGeofencing";
import { criarAgenteHidrologico } from "./agenteHidrologico";
import { criarAgenteIngestao } from "./agenteIngestao";
import { criarAgenteLimiar } from "./agenteLimiar";
import { criarAgenteQualidade } from "./agenteQualidade";
import { criarAgenteRedator } from "./agenteRedator";
import { criarAgenteRede } from "./agenteRede";
import { FONTES } from "@/simulacao/mundo";
import type { Agente } from "./tipos";

/**
 * Monta o enxame na ordem de execucao do tick.
 * A ordem importa: ingestao -> qualidade -> rede -> modelagem ->
 * limiar/geofencing -> antifadiga -> redator -> expedicao -> auditoria.
 */
export function criarEnxame(): Agente[] {
  return [
    ...FONTES.map((fonte) => criarAgenteIngestao(fonte)),
    criarAgenteQualidade(),
    criarAgenteRede(),
    criarAgenteHidrologico(),
    criarAgenteLimiar(),
    criarAgenteGeofencing(),
    criarAgenteAntifadiga(),
    criarAgenteRedator(),
    criarAgenteExpedicao(),
    criarAgenteAuditoria(),
  ];
}
