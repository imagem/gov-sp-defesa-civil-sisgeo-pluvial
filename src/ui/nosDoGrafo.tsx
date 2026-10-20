import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { StatusAgente } from "@/agentes/tipos";

/**
 * Medidas FIXAS do cartao de agente.
 *
 * O React Flow esconde cada no (visibility: hidden) ate medi-lo por
 * ResizeObserver, e so desenha as arestas depois disso. Quando a medicao nao
 * acontece — canvas que nasce com altura zero, aba em segundo plano — o grafo
 * fica permanentemente invisivel: nos escondidos e nenhuma aresta. Declarando
 * o tamanho no proprio no (ver GrafoAgentes), o React Flow nao precisa medir
 * nada para desenhar, e o grafo aparece no primeiro quadro.
 */
export const LARGURA_NO = 178;
export const ALTURA_NO = 88;

export interface DadosNoAgente extends Record<string, unknown> {
  nome: string;
  modulo: string;
  status: StatusAgente;
  requisitos: readonly string[];
  contador: number;
}

// A borda neutra de "ocioso" e tokenizada com o valor original como padrao
// do tema escuro (mesmo motivo do comentario em GrafoAgentes.tsx): o canvas
// continua pixel-identico ao que o dono do projeto ja aprovou nesse tema; so
// o tema claro (que nao existia quando essa restricao foi definida) recebe
// um valor diferente. As demais cores de status seguem fixas e fora de
// escopo: sao acentos saturados que ja leem bem nos dois temas.
const CORES: Record<StatusAgente, { borda: string; texto: string }> = {
  ocioso: { borda: "var(--grafo-borda-ociosa)", texto: "var(--cor-texto-fraco)" },
  trabalhando: { borda: "rgba(56,189,248,0.75)", texto: "var(--cor-acento)" },
  alerta: { borda: "rgba(251,146,60,0.85)", texto: "var(--cor-alta)" },
  bloqueado: { borda: "rgba(244,63,94,0.9)", texto: "var(--cor-critica)" },
  falha: { borda: "rgba(244,63,94,0.9)", texto: "var(--cor-critica)" },
};

const ROTULO_STATUS: Record<StatusAgente, string> = {
  ocioso: "ocioso",
  trabalhando: "trabalhando",
  alerta: "anomalia detectada",
  bloqueado: "BLOQUEADO — aguarda decisão humana",
  falha: "falha",
};

export function NoAgente({ data }: NodeProps) {
  const d = data as DadosNoAgente;
  const cor = CORES[d.status];
  const destacar = d.status === "bloqueado" || d.status === "alerta";

  return (
    <div
      className={`vidro ${destacar ? "pulsando" : ""}`}
      style={{
        width: LARGURA_NO,
        height: ALTURA_NO,
        boxSizing: "border-box",
        overflow: "hidden",
        padding: "9px 11px",
        borderColor: cor.borda,
        borderWidth: destacar ? 2 : 1,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: cor.borda }} />

      <div style={{ fontSize: 9, letterSpacing: "0.08em", color: "var(--cor-texto-fraco)" }}>
        {d.modulo}
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.25, margin: "2px 0 4px" }}>
        {d.nome}
      </div>
      <div style={{ fontSize: 10, color: cor.texto, fontWeight: 600 }}>
        {ROTULO_STATUS[d.status]}
      </div>
      <div style={{ fontSize: 9, color: "var(--cor-texto-fraco)", marginTop: 3 }}>
        {d.requisitos.join(" · ")}
      </div>

      <Handle type="source" position={Position.Right} style={{ background: cor.borda }} />
    </div>
  );
}

export const TIPOS_DE_NO = { agente: NoAgente } as const;
