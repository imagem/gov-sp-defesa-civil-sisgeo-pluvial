import { useEffect, useMemo } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useUpdateNodeInternals,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useShallow } from "zustand/react/shallow";
import { selecionarEventosRecentes, useSimulacao } from "@/estado/store";
import { arestasAtivas, chaveAresta, LIGACOES, posicaoDoAgente } from "./grafo";
import { ALTURA_NO, LARGURA_NO, TIPOS_DE_NO, type DadosNoAgente } from "./nosDoGrafo";
import Painel from "./Painel";
import { moduloAtivoRecente } from "./resumosPainel";

const SEQUENCIA_MODULOS = ["ING", "NET", "MOD", "ALT", "LLM", "EXP", "GOV"] as const;

/**
 * Canvas do grafo.
 *
 * Fica num componente proprio, dentro do ReactFlowProvider, para poder pedir
 * ao React Flow que releia as ancoras (handles) dos nos no DOM assim que eles
 * montam. Sem esse empurrao, a leitura depende de um ResizeObserver que nem
 * sempre dispara aqui — e, quando nao dispara, o React Flow fica sem as
 * coordenadas das ancoras: nenhuma aresta e desenhada e o fitView nao tem
 * limites para enquadrar. Era esse o grafo "que sumiu": nos no lugar, zero
 * ligacoes entre eles.
 */
function Canvas({ nos, arestas }: { nos: Node[]; arestas: Edge[] }) {
  const atualizarInternos = useUpdateNodeInternals();
  const { fitView } = useReactFlow();
  const quantidade = nos.length;

  useEffect(() => {
    if (quantidade === 0) return;
    // No quadro seguinte: os nos ja estao no DOM e podem ser medidos.
    const quadro = requestAnimationFrame(() => {
      for (const no of nos) atualizarInternos(no.id);
      void fitView({ padding: 0.18, minZoom: 0.8 });
    });
    return () => cancelAnimationFrame(quadro);
    // So ao montar ou ao mudar a quantidade de agentes: `nos` e recriado a
    // cada tick da simulacao e reenquadrar a cada passo seria vertiginoso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantidade, atualizarInternos, fitView]);

  return (
    <ReactFlow
      nodes={nos}
      edges={arestas}
      nodeTypes={TIPOS_DE_NO}
      fitView
      fitViewOptions={{ padding: 0.18, minZoom: 0.8 }}
      proOptions={{ hideAttribution: false }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnScroll
      zoomOnScroll={false}
    >
      <Background color="var(--grafo-fundo-pontilhado)" gap={22} />
      <Controls />
    </ReactFlow>
  );
}

interface GrafoAgentesProps {
  /** false deixa o cartao esticar ate a altura do container (pagina Agentes). */
  alturaFixa?: boolean;
}

export default function GrafoAgentes({ alturaFixa = true }: GrafoAgentesProps = {}) {
  const motor = useSimulacao((s) => s.motor);
  const versao = useSimulacao((s) => s.versao);
  // useShallow evita o loop de renderizacao infinito do useSyncExternalStore:
  // o seletor cria um array novo a cada chamada, e sem cache por igualdade
  // rasa o React nunca considera o snapshot estavel (RNF-06 correcao de bug).
  const eventos = useSimulacao(useShallow((s) => selecionarEventosRecentes(s, 14)));
  const irPara = useSimulacao((s) => s.irPara);

  const nos: Node[] = useMemo(() => {
    const contagemPorModulo = new Map<string, number>();
    return motor.agentes.map((agente) => {
      const indice = contagemPorModulo.get(agente.modulo) ?? 0;
      contagemPorModulo.set(agente.modulo, indice + 1);
      const dados: DadosNoAgente = {
        nome: agente.nome,
        modulo: agente.modulo,
        status: agente.status,
        requisitos: agente.requisitos,
        contador: agente.contadorTrabalho,
      };
      return {
        id: agente.id,
        type: "agente",
        position: posicaoDoAgente(agente, indice),
        data: dados,
        draggable: false,
        selectable: false,
        // Tamanho declarado: sem isto o React Flow espera medir cada no por
        // ResizeObserver antes de revelar os nos e desenhar as arestas — e,
        // se a medicao nao vier, o grafo nunca aparece. Ver nosDoGrafo.tsx.
        width: LARGURA_NO,
        height: ALTURA_NO,
        measured: { width: LARGURA_NO, height: ALTURA_NO },
      };
    });
    // versao entra na dependencia porque os agentes sao mutaveis.
  }, [motor, versao]);

  const arestas: Edge[] = useMemo(() => {
    const ativas = arestasAtivas(eventos);
    return LIGACOES.map((ligacao) => {
      const chave = chaveAresta(ligacao.origem, ligacao.destino);
      const ativa = ativas.has(chave);
      return {
        id: chave,
        source: ligacao.origem,
        target: ligacao.destino,
        animated: ativa,
        // A cor da aresta inativa (neutra) e tokenizada com o valor original
        // como padrao do tema escuro, entao o canvas continua pixel-identico
        // ao que o dono do projeto ja aprovou nesse tema; so o tema claro
        // (que nao existia quando essa restricao foi definida) recebe um
        // valor diferente. A cor da aresta ativa segue fixa e fora de
        // escopo: e um acento saturado que ja le bem nos dois temas.
        style: {
          stroke: ativa ? "rgba(56,189,248,0.95)" : "var(--grafo-linha-inativa)",
          strokeWidth: ativa ? 2 : 1,
        },
      };
    });
  }, [eventos]);

  const moduloAtivo = moduloAtivoRecente(eventos, motor.agentes);

  return (
    <Painel
      titulo="Fluxo do dado"
      aberto
      aoFechar={() => irPara("operacional")}
      comPadding={false}
      estiloSecao={alturaFixa ? { height: 305 } : undefined}
      info={
        <>
          Cada nó é um agente especialista; a coluna indica seu módulo (ING, NET, MOD, ALT, LLM, EXP,
          GOV). Uma aresta acende quando um agente acabou de publicar um evento para o próximo. Nó
          vermelho pulsante = bloqueado aguardando decisão humana (RNF-18).{" "}
          <b>{SEQUENCIA_MODULOS.join(" → ")}</b> é a ordem de execução a cada passo da simulação.
        </>
      }
    >
      {/* Trilho de modulos: mostra em que etapa da cadeia o ultimo evento
          publicado nasceu, sem exigir que o operador siga as arestas. */}
      <div className="grafo-trilho">
        {SEQUENCIA_MODULOS.map((modulo, i) => (
          <span key={modulo} className="grafo-trilho-item">
            <span className={modulo === moduloAtivo ? "chip chip-ativo" : "chip"}>{modulo}</span>
            {i < SEQUENCIA_MODULOS.length - 1 ? (
              <span className="grafo-trilho-seta">{"→"}</span>
            ) : null}
          </span>
        ))}
      </div>

      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <ReactFlowProvider>
          <Canvas nos={nos} arestas={arestas} />
        </ReactFlowProvider>
      </div>
    </Painel>
  );
}
