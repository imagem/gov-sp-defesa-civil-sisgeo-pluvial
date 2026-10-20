import type { Agente, EstadoSimulacao } from "@/agentes/tipos";

function plural(n: number, singular: string, pluralForma: string): string {
  return n === 1 ? singular : pluralForma;
}

/**
 * Frase em linguagem natural do que o agente esta fazendo AGORA, derivada do
 * estado compartilhado da simulacao. Agentes sem caso especifico devolvem a
 * descricao estatica.
 */
export function descreverAtividade(agente: Agente, estado: EstadoSimulacao): string {
  const operantes = estado.estacoes.filter((e) => e.situacao === "operante").length;
  const total = estado.estacoes.length;

  if (agente.modulo === "ING" && agente.id.startsWith("agente-ingestao")) {
    return `Recebendo leituras de ${operantes} ${plural(operantes, "estação operante", "estações operantes")}`;
  }

  switch (agente.id) {
    case "agente-qualidade": {
      const n = estado.leiturasReprovadasTotal;
      return `Validou as leituras; ${n} ${plural(n, "reprovada barrada", "reprovadas barradas")}`;
    }
    case "agente-rede":
      return `Monitorando ${operantes}/${total} estações operantes`;
    case "agente-hidrologico":
      return `Projetando cota de ${estado.cotaPrevistaM.toFixed(2)} m para as próximas 12 h`;
    case "agente-limiar": {
      const candidatos = estado.alertas.filter((a) => a.estado === "candidato").length;
      return candidatos > 0
        ? `Comparando a cota prevista com os limiares; ${candidatos} ${plural(candidatos, "alerta candidato", "alertas candidatos")}`
        : "Comparando a cota prevista com os limiares de alerta";
    }
    case "agente-geofencing": {
      const n = estado.exposicao.length;
      return `Cruzando a mancha com as zonas; ${n} ${plural(n, "zona alcançada", "zonas alcançadas")}`;
    }
    case "agente-antifadiga":
      return "Evitando avisos repetidos para a mesma zona";
    case "agente-redator": {
      const n = estado.boletins.length;
      return `Redigindo boletins para revisão humana; ${n} ${plural(n, "rascunho pronto", "rascunhos prontos")}`;
    }
    case "agente-expedicao": {
      const n = estado.alertas.filter((a) => a.estado === "expedido" || a.estado === "atualizado").length;
      return `Enviando avisos pelos canais; ${n} ${plural(n, "alerta expedido", "alertas expedidos")}`;
    }
    case "agente-auditoria":
      return "Registrando cada decisão para consulta posterior";
    default:
      return agente.descricao;
  }
}
