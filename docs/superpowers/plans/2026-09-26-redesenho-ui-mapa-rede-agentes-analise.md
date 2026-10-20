# Controles de Mapa, Saúde da Rede, Agentes e Trilha Causal — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar controles de mapa (foco/camadas/basemap), enriquecer Saúde da Rede (legenda/hover/lista/ordenação) e Agentes Especialistas (filtro/detalhes), e ligar os dois últimos por um mecanismo de destaque compartilhado no grafo "Fluxo do Dado", incluindo a trilha causal de um alerta específico.

**Architecture:** Um novo campo de destaque (`agentesDestacados: readonly string[]`) e um sinal de abertura (`sinalAbrirFluxoDoDado`) entram no store Zustand como estado de apresentação puro — usados por `PainelAgentes.tsx` (clique simples) e por `FilaAlertas.tsx`/`TrilhaAuditoria.tsx` (trilha causal via `Barramento.porCorrelacao`, já existente no domínio) para pilotar a opacidade condicional em `GrafoAgentes.tsx`/`nosDoGrafo.tsx`. Saúde da Rede e Controles de Mapa são independentes desse mecanismo e entre si.

**Tech Stack:** React 19, TypeScript, Zustand, ArcGIS Maps SDK for JS v5, `@xyflow/react` (React Flow), Vitest.

**Spec:** `docs/superpowers/specs/2026-09-26-redesenho-ui-mapa-rede-agentes-analise.md`

## Global Constraints

- RNF-18 (nenhum alerta chega a `expedido` sem validação humana) não pode ser enfraquecido — o botão "Ver trilha" é somente leitura; `validarAlerta`/`descartarAlerta` e o corpo de `CartaoAlerta` que os aciona não mudam de comportamento.
- `demo/src/dominio/`, `demo/src/simulacao/`, `demo/src/agentes/` não são modificados por nenhuma tarefa deste plano — apenas lidos/consumidos.
- Cores de domínio (severidade, `SituacaoEstacao`, `StatusAgente`) permanecem exatamente como estão — nenhuma tarefa introduz nova paleta para dado.
- A aparência do canvas do React Flow (posição de nó, cor de aresta/borda por status) continua igual, exceto a opacidade condicional de destaque explicitamente aprovada neste plano — uma exceção distinta da restrição de "canvas congelado por tema" definida na Fundação, que seguia valendo para conversões de cor ligadas ao tema claro/escuro.
- Basemaps oferecidos: exatamente `"osm"`, `"streets-vector"`, `"dark-gray-vector"` — sem chave de API do ArcGIS, sem mudança em `VITE_ARCGIS_APP_ID`/modo Enterprise.
- `.tsx` e `demo/src/mapa/camadas.ts` continuam sem teste unitário, por convenção do projeto — verificados por ensaio manual (Task 13). `.ts` de lógica pura ganham teste.
- Funções puras novas usam tipos estruturais mínimos (`Pick`/genéricos com bound), no mesmo estilo já usado em `resumosPainel.ts`, para que os testes usem literais pequenos em vez do tipo de domínio inteiro.

## Review Focus

- **Estação silenciosa que nunca recebeu leitura** (`ultimaLeituraTs === null`): `motivoSituacao` deve descrever isso explicitamente, não calcular um atraso com `NaN`/`Infinity` visível ao operador — coberto por teste na Task 2.
- **Filtro (Saúde da Rede ou Agentes Especialistas) sem nenhum resultado**: o painel deve mostrar uma mensagem de "nenhum resultado", não um grid/lista vazios sem explicação — coberto nas Tasks 3 e 5.
- **Botão "Focar em ativos" sem nenhum alvo** (nenhuma zona em alerta, mancha ou estação não-operante): fica `disabled` com `title` explicando por quê, em vez de chamar `view.goTo` com uma lista vazia — coberto na Task 11 (verificado manualmente na Task 13, já que `camadas.ts` é sem teste unitário por convenção).
- **Trocar de cenário com um agente ou trilha destacados**: o destaque não deve sobreviver referenciando implicitamente o motor anterior — `trocarCenario` passa a limpar `agentesDestacados`, igual a `reiniciar()` — coberto por teste na Task 1.
- **`porCorrelacao` retorna lista vazia** (alerta sem eventos correlacionados, teoricamente impossível mas defensivo): `agentesDaTrilha([])` deve retornar `[]` sem lançar erro — coberto por teste na Task 7.

---

### Task 1: Estado compartilhado de destaque no store

**Files:**
- Modify: `demo/src/estado/store.ts`
- Test: `demo/src/estado/store.test.ts`

**Interfaces:**
- Produces: `agentesDestacados: readonly string[]`, `sinalAbrirFluxoDoDado: number`, `alternarAgenteDestacado(id: string): void`, `definirTrilhaDestacada(ids: readonly string[]): void`, `limparDestaque(): void` — usados pelas Tasks 5, 6, 8, 9.

- [ ] **Step 1: Escrever os testes (ainda falhando)**

```ts
// adicionar ao final de demo/src/estado/store.test.ts, dentro do describe("useSimulacao") existente
  describe("destaque de agentes", () => {
    it("comeca vazio", () => {
      expect(useSimulacao.getState().agentesDestacados).toEqual([]);
    });

    it("alternarAgenteDestacado seleciona um agente", () => {
      useSimulacao.getState().alternarAgenteDestacado("agente-rede");
      expect(useSimulacao.getState().agentesDestacados).toEqual(["agente-rede"]);
    });

    it("alternarAgenteDestacado no mesmo agente ja selecionado limpa a selecao", () => {
      useSimulacao.getState().alternarAgenteDestacado("agente-rede");
      useSimulacao.getState().alternarAgenteDestacado("agente-rede");
      expect(useSimulacao.getState().agentesDestacados).toEqual([]);
    });

    it("alternarAgenteDestacado em outro agente substitui a selecao", () => {
      useSimulacao.getState().alternarAgenteDestacado("agente-rede");
      useSimulacao.getState().alternarAgenteDestacado("agente-limiar");
      expect(useSimulacao.getState().agentesDestacados).toEqual(["agente-limiar"]);
    });

    it("definirTrilhaDestacada substitui a selecao e incrementa o sinal de abertura", () => {
      const sinalAntes = useSimulacao.getState().sinalAbrirFluxoDoDado;
      useSimulacao.getState().definirTrilhaDestacada(["agente-limiar", "agente-geofencing"]);
      const s = useSimulacao.getState();
      expect(s.agentesDestacados).toEqual(["agente-limiar", "agente-geofencing"]);
      expect(s.sinalAbrirFluxoDoDado).toBe(sinalAntes + 1);
    });

    it("limparDestaque esvazia a selecao", () => {
      useSimulacao.getState().alternarAgenteDestacado("agente-rede");
      useSimulacao.getState().limparDestaque();
      expect(useSimulacao.getState().agentesDestacados).toEqual([]);
    });

    it("trocarCenario limpa o destaque", () => {
      useSimulacao.getState().alternarAgenteDestacado("agente-rede");
      useSimulacao.getState().trocarCenario("extremo");
      expect(useSimulacao.getState().agentesDestacados).toEqual([]);
    });
  });
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/estado/store.test.ts`
Expected: FAIL — `agentesDestacados`/`alternarAgenteDestacado`/etc. não existem em `EstadoLoja`.

- [ ] **Step 3: Adicionar os campos e acoes em `store.ts`**

No `interface EstadoLoja`, adicionar (perto de `boletimAberto`):

```ts
  /** Ids de agentes destacados no grafo "Fluxo do dado" — [] = nada destacado. */
  agentesDestacados: readonly string[];
  /** Incrementado toda vez que algo pede que o painel "Fluxo do dado" se abra. */
  sinalAbrirFluxoDoDado: number;

  alternarAgenteDestacado(id: string): void;
  definirTrilhaDestacada(ids: readonly string[]): void;
  limparDestaque(): void;
```

No objeto criado por `create<EstadoLoja>(...)`, adicionar aos valores iniciais:

```ts
  agentesDestacados: [],
  sinalAbrirFluxoDoDado: 0,
```

E as acoes:

```ts
  alternarAgenteDestacado(id) {
    set((s) => {
      const jaEraOUnico = s.agentesDestacados.length === 1 && s.agentesDestacados[0] === id;
      return { agentesDestacados: jaEraOUnico ? [] : [id] };
    });
  },

  definirTrilhaDestacada(ids) {
    set((s) => ({ agentesDestacados: ids, sinalAbrirFluxoDoDado: s.sinalAbrirFluxoDoDado + 1 }));
  },

  limparDestaque() {
    set({ agentesDestacados: [] });
  },
```

Em `trocarCenario` e em `reiniciar`, adicionar `agentesDestacados: []` ao objeto passado para `set(...)` (mesma linha onde `boletimAberto: null` já aparece nos dois).

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/estado/store.test.ts`
Expected: PASS (todos os testes existentes + os 7 novos).

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/estado/store.ts src/estado/store.test.ts
git commit -m "feat(estado): destaque compartilhado de agentes para o vinculo com o grafo"
```

---

### Task 2: Lógica pura de Saúde da Rede

**Files:**
- Create: `demo/src/ui/saudeRede.ts`
- Test: `demo/src/ui/saudeRede.test.ts`

**Interfaces:**
- Produces: `motivoSituacao`, `ordenarEstacoes`, `filtrarPorSituacao`, `contarPorSituacao` — usados pela Task 3.

- [ ] **Step 1: Escrever os testes (ainda falhando)**

```ts
// demo/src/ui/saudeRede.test.ts
import { describe, expect, it } from "vitest";
import { contarPorSituacao, filtrarPorSituacao, motivoSituacao, ordenarEstacoes } from "./saudeRede";

const AGORA = "2026-01-01T12:00:00.000Z";

describe("motivoSituacao", () => {
  it("descreve estacao operante", () => {
    expect(
      motivoSituacao({ situacao: "operante", ultimaLeituraTs: AGORA, periodicidadeEsperadaMin: 15 }, AGORA),
    ).toBe("Transmitindo normalmente.");
  });

  it("descreve estacao silenciosa com o atraso calculado", () => {
    const ultimaLeituraTs = "2026-01-01T11:13:00.000Z"; // 47 min antes de AGORA
    const motivo = motivoSituacao(
      { situacao: "silenciosa", ultimaLeituraTs, periodicidadeEsperadaMin: 15 },
      AGORA,
    );
    expect(motivo).toBe("Sem leitura ha 47 min — limite e 45 min (periodicidade 15 min x 3)");
  });

  it("descreve estacao silenciosa que nunca leu", () => {
    expect(
      motivoSituacao({ situacao: "silenciosa", ultimaLeituraTs: null, periodicidadeEsperadaMin: 15 }, AGORA),
    ).toBe("Nenhuma leitura recebida ainda.");
  });

  it("descreve estacao degradada", () => {
    expect(
      motivoSituacao({ situacao: "degradada", ultimaLeituraTs: AGORA, periodicidadeEsperadaMin: 15 }, AGORA),
    ).toBe("Transmitindo com qualidade reduzida.");
  });

  it("descreve estacao desativada", () => {
    expect(
      motivoSituacao({ situacao: "desativada", ultimaLeituraTs: null, periodicidadeEsperadaMin: 15 }, AGORA),
    ).toBe("Estacao desativada — fora de operacao.");
  });
});

describe("ordenarEstacoes", () => {
  const estacoes = [
    { id: "a", situacao: "operante" as const, ultimaLeituraTs: AGORA },
    { id: "b", situacao: "silenciosa" as const, ultimaLeituraTs: "2026-01-01T11:00:00.000Z" },
    { id: "c", situacao: "degradada" as const, ultimaLeituraTs: AGORA },
  ];

  it("padrao mantem a ordem original", () => {
    expect(ordenarEstacoes(estacoes, "padrao", AGORA).map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("por situacao poe silenciosa, depois degradada, depois operante", () => {
    expect(ordenarEstacoes(estacoes, "situacao", AGORA).map((e) => e.id)).toEqual(["b", "c", "a"]);
  });

  it("por atraso poe a estacao com maior atraso primeiro", () => {
    expect(ordenarEstacoes(estacoes, "atraso", AGORA).map((e) => e.id)).toEqual(["b", "a", "c"]);
  });
});

describe("filtrarPorSituacao", () => {
  const estacoes = [
    { id: "a", situacao: "operante" as const },
    { id: "b", situacao: "silenciosa" as const },
  ];

  it("retorna tudo quando o filtro e null", () => {
    expect(filtrarPorSituacao(estacoes, null)).toHaveLength(2);
  });

  it("filtra pela situacao pedida", () => {
    expect(filtrarPorSituacao(estacoes, "silenciosa").map((e) => e.id)).toEqual(["b"]);
  });
});

describe("contarPorSituacao", () => {
  it("conta cada situacao, incluindo as ausentes como zero", () => {
    const estacoes = [
      { situacao: "operante" as const },
      { situacao: "operante" as const },
      { situacao: "silenciosa" as const },
    ];
    expect(contarPorSituacao(estacoes)).toEqual({
      operante: 2,
      degradada: 0,
      silenciosa: 1,
      desativada: 0,
    });
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/ui/saudeRede.test.ts`
Expected: FAIL — `Cannot find module './saudeRede'`.

- [ ] **Step 3: Implementar `saudeRede.ts`**

```ts
// demo/src/ui/saudeRede.ts
import type { SituacaoEstacao } from "@/dominio/tipos";

type CampoSituacao = { situacao: SituacaoEstacao; ultimaLeituraTs: string | null; periodicidadeEsperadaMin: number };

export function motivoSituacao(estacao: CampoSituacao, agoraIso: string): string {
  if (estacao.situacao === "operante") return "Transmitindo normalmente.";
  if (estacao.situacao === "degradada") return "Transmitindo com qualidade reduzida.";
  if (estacao.situacao === "desativada") return "Estacao desativada — fora de operacao.";

  // silenciosa
  if (estacao.ultimaLeituraTs === null) return "Nenhuma leitura recebida ainda.";
  const atrasoMin = Math.round(
    (new Date(agoraIso).getTime() - new Date(estacao.ultimaLeituraTs).getTime()) / 60_000,
  );
  const limiteMin = estacao.periodicidadeEsperadaMin * 3;
  return `Sem leitura ha ${atrasoMin} min — limite e ${limiteMin} min (periodicidade ${estacao.periodicidadeEsperadaMin} min x 3)`;
}

const ORDEM_SITUACAO: Record<SituacaoEstacao, number> = {
  silenciosa: 0,
  degradada: 1,
  operante: 2,
  desativada: 3,
};

export function ordenarEstacoes<T extends { situacao: SituacaoEstacao; ultimaLeituraTs: string | null }>(
  estacoes: readonly T[],
  criterio: "padrao" | "situacao" | "atraso",
  agoraIso: string,
): T[] {
  if (criterio === "padrao") return [...estacoes];

  if (criterio === "situacao") {
    return [...estacoes].sort((a, b) => ORDEM_SITUACAO[a.situacao] - ORDEM_SITUACAO[b.situacao]);
  }

  function atrasoMin(e: T): number {
    if (e.ultimaLeituraTs === null) return Number.POSITIVE_INFINITY;
    return (new Date(agoraIso).getTime() - new Date(e.ultimaLeituraTs).getTime()) / 60_000;
  }
  return [...estacoes].sort((a, b) => atrasoMin(b) - atrasoMin(a));
}

export function filtrarPorSituacao<T extends { situacao: SituacaoEstacao }>(
  estacoes: readonly T[],
  situacao: SituacaoEstacao | null,
): T[] {
  if (situacao === null) return [...estacoes];
  return estacoes.filter((e) => e.situacao === situacao);
}

export function contarPorSituacao(
  estacoes: readonly { situacao: SituacaoEstacao }[],
): Record<SituacaoEstacao, number> {
  const contagem: Record<SituacaoEstacao, number> = {
    operante: 0,
    degradada: 0,
    silenciosa: 0,
    desativada: 0,
  };
  for (const e of estacoes) contagem[e.situacao]++;
  return contagem;
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/ui/saudeRede.test.ts`
Expected: PASS (10 testes).

- [ ] **Step 5: Commit**

```bash
git add src/ui/saudeRede.ts src/ui/saudeRede.test.ts
git commit -m "feat(ui): logica pura de motivo/ordenacao/filtro/contagem de saude da rede"
```

---

### Task 3: `<Painel>` ganha `acoesExtras`, e `PainelSaudeRede.tsx` integra legenda/hover/lista/ordenação

**Files:**
- Modify: `demo/src/ui/Painel.tsx`
- Modify: `demo/src/ui/PainelSaudeRede.tsx`
- Modify: `demo/src/styles/componentes.css`

**Interfaces:**
- Consumes: `motivoSituacao`, `ordenarEstacoes`, `filtrarPorSituacao`, `contarPorSituacao` (Task 2).
- Produces: `PainelProps.acoesExtras?: ReactNode` — disponível para qualquer painel futuro, usado aqui e por nenhum outro consumidor existente (os 4 demais painéis continuam sem passar essa prop).

- [ ] **Step 1: Adicionar `acoesExtras` a `Painel.tsx`**

```diff
 interface PainelProps {
   titulo: string;
   aberto: boolean;
   aoAlternar: () => void;
   resumo: ReactNode;
   info?: ReactNode;
+  acoesExtras?: ReactNode;
   children: ReactNode;
   comPadding?: boolean;
   estiloSecao?: CSSProperties;
 }

 export default function Painel({
   titulo,
   aberto,
   aoAlternar,
   resumo,
   info,
+  acoesExtras,
   children,
   comPadding = true,
   estiloSecao,
 }: PainelProps) {
```

E no JSX do cabeçalho, dentro do `<div ref={infoRef} style={{ marginLeft: "auto", ... }}>`, adicionar `{acoesExtras}` como primeiro filho, antes do bloco `{info ? (...) : null}`:

```diff
         <div ref={infoRef} style={{ marginLeft: "auto", display: "flex", gap: 6, position: "relative" }}>
+          {acoesExtras}
           {info ? (
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Adicionar `.estacao-hover-card` a `componentes.css`**

```css
.estacao-hover-card {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 25;
  width: 200px;
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 10.5px;
  line-height: 1.4;
  pointer-events: none;
  white-space: normal;
}
```

- [ ] **Step 4: Substituir o conteúdo de `PainelSaudeRede.tsx`**

```tsx
// demo/src/ui/PainelSaudeRede.tsx
import { useState } from "react";
import { useSimulacao } from "@/estado/store";
import type { SituacaoEstacao } from "@/dominio/tipos";
import Painel from "./Painel";
import { resumirEstacoes } from "./resumosPainel";
import { contarPorSituacao, filtrarPorSituacao, motivoSituacao, ordenarEstacoes } from "./saudeRede";

const COR: Record<SituacaoEstacao, string> = {
  operante: "var(--cor-ok)",
  degradada: "var(--cor-atencao)",
  silenciosa: "var(--cor-critica)",
  desativada: "var(--cor-texto-fraco)",
};

const ROTULO_SITUACAO: Record<SituacaoEstacao, string> = {
  operante: "Operante",
  degradada: "Degradada",
  silenciosa: "Silenciosa",
  desativada: "Desativada",
};

const SITUACOES: readonly SituacaoEstacao[] = ["operante", "degradada", "silenciosa", "desativada"];

type Ordenacao = "padrao" | "situacao" | "atraso";

export default function PainelSaudeRede() {
  const motor = useSimulacao((s) => s.motor);
  useSimulacao((s) => s.versao);
  const [aberto, setAberto] = useState(true);
  const [filtro, setFiltro] = useState<SituacaoEstacao | null>(null);
  const [emFoco, setEmFoco] = useState<string | null>(null);
  const [modoLista, setModoLista] = useState(false);
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("padrao");

  const estacoes = motor.estado.estacoes;
  const { operantes, silenciosas } = resumirEstacoes(estacoes);
  const contagem = contarPorSituacao(estacoes);
  const agoraIso = motor.relogio.iso;

  const filtradas = filtrarPorSituacao(estacoes, filtro);
  const exibidas = modoLista ? ordenarEstacoes(filtradas, ordenacao, agoraIso) : filtradas;

  return (
    <Painel
      titulo="Saude da rede de observacao"
      aberto={aberto}
      aoAlternar={() => setAberto((v) => !v)}
      acoesExtras={
        <button
          type="button"
          className="botao-icone"
          aria-label={modoLista ? "Ver como grade" : "Ver como lista"}
          onClick={() => setModoLista((v) => !v)}
        >
          {modoLista ? "▦" : "☰"}
        </button>
      }
      info={
        <>
          Cada bloco e uma estacao de monitoramento. <b style={{ color: "var(--cor-ok)" }}>Verde</b> = transmitindo
          normalmente. <b style={{ color: "var(--cor-critica)" }}>Vermelho pulsante</b> = sem leitura ha mais de 3
          periodos (silenciosa). Passe o mouse sobre um bloco para ver o motivo detalhado. Clique numa legenda
          abaixo do grid para filtrar.
        </>
      }
      resumo={
        <>
          <span className="titulo-resumo">Saude da rede</span>
          <span className="chip">
            <span className="chip-ponto" style={{ background: "var(--cor-ok)" }} />
            <b>{operantes}</b>&nbsp;operantes
          </span>
          {silenciosas > 0 ? (
            <span className="chip">
              <span className="chip-ponto" style={{ background: "var(--cor-critica)" }} />
              <b>{silenciosas}</b>&nbsp;silenciosa{silenciosas > 1 ? "s" : ""}
            </span>
          ) : null}
          <div style={{ display: "flex", gap: 3, marginLeft: 4 }}>
            {estacoes.slice(0, 8).map((estacao) => (
              <span
                key={estacao.estacaoId}
                style={{ width: 5, height: 12, borderRadius: 2, background: COR[estacao.situacao] }}
              />
            ))}
          </div>
        </>
      }
    >
      {modoLista ? (
        <label
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, marginBottom: "var(--espaco-2)" }}
        >
          <span style={{ color: "var(--cor-texto-fraco)" }}>Ordenar por</span>
          <select
            className="botao"
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
            style={{ fontSize: 10.5, padding: "3px 8px" }}
          >
            <option value="padrao">Padrao</option>
            <option value="situacao">Situacao</option>
            <option value="atraso">Atraso</option>
          </select>
        </label>
      ) : null}

      {exibidas.length === 0 ? (
        <p style={{ fontSize: 11, color: "var(--cor-texto-fraco)" }}>
          Nenhuma estacao corresponde ao filtro selecionado.
        </p>
      ) : modoLista ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4 }}>
          {exibidas.map((estacao) => (
            <li
              key={estacao.estacaoId}
              style={{
                display: "grid",
                gridTemplateColumns: "8px 1fr auto",
                gap: 8,
                alignItems: "center",
                padding: "5px 8px",
                borderRadius: 8,
                background: "var(--superficie-fraca)",
                fontSize: 11,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: COR[estacao.situacao] }} />
              <span>
                {estacao.nome}
                <span style={{ fontSize: 9, color: "var(--cor-texto-fraco)", marginLeft: 6 }}>
                  {estacao.fonteId} · {estacao.tipo}
                </span>
              </span>
              <span style={{ fontFamily: "var(--fonte-mono)", fontSize: 9.5, color: "var(--cor-texto-fraco)" }}>
                {motivoSituacao(estacao, agoraIso)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 5 }}>
          {exibidas.map((estacao) => (
            <div
              key={estacao.estacaoId}
              className={estacao.situacao === "silenciosa" ? "pulsando" : undefined}
              style={{
                position: "relative",
                height: 22,
                borderRadius: 5,
                background: COR[estacao.situacao],
                opacity: estacao.situacao === "operante" ? 0.75 : 1,
              }}
              onMouseEnter={() => setEmFoco(estacao.estacaoId)}
              onMouseLeave={() => setEmFoco((atual) => (atual === estacao.estacaoId ? null : atual))}
            >
              {emFoco === estacao.estacaoId ? (
                <div className="estacao-hover-card vidro">
                  <strong>{estacao.nome}</strong>
                  <div style={{ color: "var(--cor-texto-fraco)" }}>
                    {estacao.fonteId} · {estacao.tipo}
                  </div>
                  <div style={{ marginTop: 3 }}>{motivoSituacao(estacao, agoraIso)}</div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "var(--espaco-3)" }}>
        {SITUACOES.map((situacao) => (
          <button
            key={situacao}
            type="button"
            className="chip"
            onClick={() => setFiltro((f) => (f === situacao ? null : situacao))}
            style={filtro === situacao ? { borderColor: COR[situacao], color: "var(--cor-texto)" } : undefined}
          >
            <span className="chip-ponto" style={{ background: COR[situacao] }} />
            {ROTULO_SITUACAO[situacao]}&nbsp;<b>{contagem[situacao]}</b>
          </button>
        ))}
      </div>
    </Painel>
  );
}
```

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Rodar a suíte completa**

Run: `npm test`
Expected: PASS, sem regressao.

- [ ] **Step 7: Commit**

```bash
git add src/ui/Painel.tsx src/ui/PainelSaudeRede.tsx src/styles/componentes.css
git commit -m "feat(ui): saude da rede ganha legenda filtravel, hover detalhado, lista e ordenacao"
```

---

### Task 4: Lógica pura de filtro de Agentes Especialistas

**Files:**
- Create: `demo/src/ui/filtrosAgentes.ts`
- Test: `demo/src/ui/filtrosAgentes.test.ts`

**Interfaces:**
- Produces: `type StatusFiltro = "trabalhando" | "bloqueado" | "ocioso"`, `filtrarAgentes<T extends { modulo: ModuloAgente; status: StatusAgente }>(agentes: readonly T[], modulo: ModuloAgente | null, status: StatusFiltro | null): T[]` — usado pela Task 5.

- [ ] **Step 1: Escrever os testes (ainda falhando)**

```ts
// demo/src/ui/filtrosAgentes.test.ts
import { describe, expect, it } from "vitest";
import { filtrarAgentes } from "./filtrosAgentes";

const agentes = [
  { id: "a", modulo: "ING" as const, status: "trabalhando" as const },
  { id: "b", modulo: "ING" as const, status: "ocioso" as const },
  { id: "c", modulo: "NET" as const, status: "bloqueado" as const },
  { id: "d", modulo: "NET" as const, status: "alerta" as const },
  { id: "e", modulo: "EXP" as const, status: "falha" as const },
];

describe("filtrarAgentes", () => {
  it("sem filtros retorna tudo", () => {
    expect(filtrarAgentes(agentes, null, null)).toHaveLength(5);
  });

  it("filtra por modulo", () => {
    expect(filtrarAgentes(agentes, "ING", null).map((a) => a.id)).toEqual(["a", "b"]);
  });

  it("filtra por status trabalhando (inclui alerta)", () => {
    expect(filtrarAgentes(agentes, null, "trabalhando").map((a) => a.id)).toEqual(["a", "d"]);
  });

  it("filtra por status bloqueado (inclui falha)", () => {
    expect(filtrarAgentes(agentes, null, "bloqueado").map((a) => a.id)).toEqual(["c", "e"]);
  });

  it("filtra por status ocioso", () => {
    expect(filtrarAgentes(agentes, null, "ocioso").map((a) => a.id)).toEqual(["b"]);
  });

  it("combina modulo e status", () => {
    expect(filtrarAgentes(agentes, "NET", "trabalhando").map((a) => a.id)).toEqual(["d"]);
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/ui/filtrosAgentes.test.ts`
Expected: FAIL — `Cannot find module './filtrosAgentes'`.

- [ ] **Step 3: Implementar `filtrosAgentes.ts`**

```ts
// demo/src/ui/filtrosAgentes.ts
import type { ModuloAgente, StatusAgente } from "@/agentes/tipos";

export type StatusFiltro = "trabalhando" | "bloqueado" | "ocioso";

export function filtrarAgentes<T extends { modulo: ModuloAgente; status: StatusAgente }>(
  agentes: readonly T[],
  modulo: ModuloAgente | null,
  status: StatusFiltro | null,
): T[] {
  return agentes.filter((a) => {
    if (modulo !== null && a.modulo !== modulo) return false;
    if (status === "trabalhando" && a.status !== "trabalhando" && a.status !== "alerta") return false;
    if (status === "bloqueado" && a.status !== "bloqueado" && a.status !== "falha") return false;
    if (status === "ocioso" && a.status !== "ocioso") return false;
    return true;
  });
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/ui/filtrosAgentes.test.ts`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add src/ui/filtrosAgentes.ts src/ui/filtrosAgentes.test.ts
git commit -m "feat(ui): logica pura de filtro de agentes por modulo e status"
```

---

### Task 5: `PainelAgentes.tsx` ganha filtro, detalhes expandidos e seleção

**Files:**
- Modify: `demo/src/ui/PainelAgentes.tsx`

**Interfaces:**
- Consumes: `filtrarAgentes`, `type StatusFiltro` (Task 4); `agentesDestacados`, `alternarAgenteDestacado` (Task 1).

- [ ] **Step 1: Substituir o conteúdo de `PainelAgentes.tsx`**

```tsx
// demo/src/ui/PainelAgentes.tsx
import { useState } from "react";
import type { ModuloAgente, StatusAgente } from "@/agentes/tipos";
import { useSimulacao } from "@/estado/store";
import Painel from "./Painel";
import { resumirAgentes } from "./resumosPainel";
import { filtrarAgentes, type StatusFiltro } from "./filtrosAgentes";

const COR: Record<StatusAgente, string> = {
  ocioso: "var(--cor-texto-fraco)",
  trabalhando: "var(--cor-acento)",
  alerta: "var(--cor-alta)",
  bloqueado: "var(--cor-critica)",
  falha: "var(--cor-critica)",
};

const MODULOS: readonly ModuloAgente[] = ["ING", "NET", "MOD", "ALT", "LLM", "EXP", "GOV"];
const STATUS_FILTROS: readonly StatusFiltro[] = ["trabalhando", "bloqueado", "ocioso"];
const ROTULO_STATUS_FILTRO: Record<StatusFiltro, string> = {
  trabalhando: "Trabalhando",
  bloqueado: "Bloqueado",
  ocioso: "Ocioso",
};

export default function PainelAgentes() {
  const motor = useSimulacao((s) => s.motor);
  useSimulacao((s) => s.versao);
  const agentesDestacados = useSimulacao((s) => s.agentesDestacados);
  const alternarAgenteDestacado = useSimulacao((s) => s.alternarAgenteDestacado);
  const [aberto, setAberto] = useState(true);
  const [filtroModulo, setFiltroModulo] = useState<ModuloAgente | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro | null>(null);
  const [expandido, setExpandido] = useState<Set<string>>(new Set());

  const agentes = motor.agentes;
  const { trabalhando, bloqueado, ociosos } = resumirAgentes(agentes);
  const exibidos = filtrarAgentes(agentes, filtroModulo, filtroStatus);
  const haDestaque = agentesDestacados.length > 0;

  function alternarExpandido(id: string) {
    setExpandido((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  return (
    <Painel
      titulo={`Agentes especialistas (${agentes.length})`}
      aberto={aberto}
      aoAlternar={() => setAberto((v) => !v)}
      resumo={
        <>
          <span className="titulo-resumo">Agentes ({agentes.length})</span>
          <span className="chip">
            <span className="chip-ponto" style={{ background: "var(--cor-acento)" }} />
            <b>{trabalhando}</b>&nbsp;trabalhando
          </span>
          {bloqueado > 0 ? (
            <span className="chip">
              <span className="chip-ponto" style={{ background: "var(--cor-critica)" }} />
              <b>{bloqueado}</b>&nbsp;bloqueado{bloqueado > 1 ? "s" : ""}
            </span>
          ) : null}
          <span className="chip">
            <span className="chip-ponto" style={{ background: "var(--cor-texto-fraco)" }} />
            <b>{ociosos}</b>&nbsp;ocioso{ociosos !== 1 ? "s" : ""}
          </span>
        </>
      }
    >
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: "var(--espaco-2)" }}>
        {MODULOS.map((modulo) => (
          <button
            key={modulo}
            type="button"
            className="chip"
            onClick={() => setFiltroModulo((m) => (m === modulo ? null : modulo))}
            style={
              filtroModulo === modulo ? { borderColor: "var(--cor-acento)", color: "var(--cor-texto)" } : undefined
            }
          >
            {modulo}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: "var(--espaco-3)" }}>
        {STATUS_FILTROS.map((status) => (
          <button
            key={status}
            type="button"
            className="chip"
            onClick={() => setFiltroStatus((s) => (s === status ? null : status))}
            style={
              filtroStatus === status ? { borderColor: "var(--cor-acento)", color: "var(--cor-texto)" } : undefined
            }
          >
            {ROTULO_STATUS_FILTRO[status]}
          </button>
        ))}
      </div>

      {exibidos.length === 0 ? (
        <p style={{ fontSize: 11, color: "var(--cor-texto-fraco)" }}>
          Nenhum agente corresponde aos filtros selecionados.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
          {exibidos.map((agente) => {
            const emDestaque = agentesDestacados.includes(agente.id);
            return (
              <li
                key={agente.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "8px 1fr auto auto",
                  gap: 9,
                  alignItems: "center",
                  padding: "6px 8px",
                  borderRadius: 8,
                  background: "var(--superficie-fraca)",
                  border: emDestaque ? "1px solid var(--cor-acento)" : "1px solid transparent",
                  opacity: haDestaque && !emDestaque ? 0.4 : 1,
                  cursor: "pointer",
                }}
                onClick={() => alternarAgenteDestacado(agente.id)}
              >
                <span
                  className={agente.status === "bloqueado" ? "pulsando" : undefined}
                  style={{ width: 8, height: 8, borderRadius: "50%", background: COR[agente.status] }}
                />
                <span style={{ fontSize: 12 }}>
                  {agente.nome}
                  <span style={{ fontSize: 9, color: "var(--cor-texto-fraco)", marginLeft: 6 }}>
                    {agente.modulo}
                  </span>
                </span>
                <span
                  style={{ fontFamily: "var(--fonte-mono)", fontSize: 10, color: "var(--cor-texto-fraco)" }}
                >
                  {agente.contadorTrabalho}
                </span>
                <button
                  type="button"
                  className="botao-icone"
                  style={{ width: 18, height: 18, fontSize: 9 }}
                  aria-label={expandido.has(agente.id) ? "Ocultar detalhes" : "Ver detalhes"}
                  onClick={(e) => {
                    e.stopPropagation();
                    alternarExpandido(agente.id);
                  }}
                >
                  {expandido.has(agente.id) ? "▲" : "▾"}
                </button>
                {expandido.has(agente.id) ? (
                  <div
                    style={{ gridColumn: "1 / -1", fontSize: 10.5, color: "var(--cor-texto-fraco)", marginTop: 4 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p style={{ margin: "0 0 4px" }}>{agente.descricao}</p>
                    <p style={{ margin: 0 }}>{agente.requisitos.join(" · ")}</p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Painel>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Rodar a suíte completa**

Run: `npm test`
Expected: PASS, sem regressao.

- [ ] **Step 4: Commit**

```bash
git add src/ui/PainelAgentes.tsx
git commit -m "feat(ui): agentes especialistas ganha filtro, detalhes expandidos e selecao"
```

---

### Task 6: `GrafoAgentes.tsx` / `nosDoGrafo.tsx` consomem o destaque

**Files:**
- Modify: `demo/src/ui/GrafoAgentes.tsx`
- Modify: `demo/src/ui/nosDoGrafo.tsx`

**Interfaces:**
- Consumes: `agentesDestacados`, `alternarAgenteDestacado`, `limparDestaque`, `sinalAbrirFluxoDoDado` (Task 1).
- Produces: `DadosNoAgente.destacado: boolean` — o campo é interno a este par de arquivos, nenhuma outra task o consome.

**Nota de escopo:** a opacidade condicional aqui adicionada é a exceção explicitamente aprovada ao "canvas congelado" da Fundação (ver Global Constraints) — nada além da opacidade muda; posição de nó, cor de aresta/borda por status, e todos os props de `ReactFlow` continuam exatamente como estão.

- [ ] **Step 1: `nosDoGrafo.tsx` — adicionar `destacado` a `DadosNoAgente` e usar na opacidade**

```diff
 export interface DadosNoAgente extends Record<string, unknown> {
   nome: string;
   modulo: string;
   status: StatusAgente;
   requisitos: readonly string[];
   contador: number;
+  destacado: boolean;
 }
```

```diff
   return (
     <div
       className={`vidro ${destacarPulso ? "pulsando" : ""}`}
       style={{
         width: 178,
         padding: "9px 11px",
         borderColor: cor.borda,
         borderWidth: destacarPulso ? 2 : 1,
+        opacity: d.destacado ? 1 : 0.35,
+        transition: "opacity 160ms ease",
       }}
     >
```

(a variável local hoje chamada `destacar` em `NoAgente` — usada só para decidir o pulso de bloqueado/alerta — deve ser renomeada para `destacarPulso` neste mesmo passo, para não colidir em leitura com o novo `d.destacado`; sua lógica não muda: `d.status === "bloqueado" || d.status === "alerta"`.)

- [ ] **Step 2: `GrafoAgentes.tsx` — ler o destaque do store e aplicar aos nós/arestas**

```diff
-import { useMemo, useState } from "react";
+import { useEffect, useMemo, useRef, useState } from "react";
 import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
 import "@xyflow/react/dist/style.css";
 import { useShallow } from "zustand/react/shallow";
 import { selecionarEventosRecentes, useSimulacao } from "@/estado/store";
```

```diff
   const eventos = useSimulacao(useShallow((s) => selecionarEventosRecentes(s, 14)));
+  const agentesDestacados = useSimulacao((s) => s.agentesDestacados);
+  const alternarAgenteDestacado = useSimulacao((s) => s.alternarAgenteDestacado);
+  const limparDestaque = useSimulacao((s) => s.limparDestaque);
+  const sinalAbrirFluxoDoDado = useSimulacao((s) => s.sinalAbrirFluxoDoDado);
   const [aberto, setAberto] = useState(true);
+
+  // Abre o painel quando outro componente pede (ex: "Ver trilha" na Fila de
+  // Alertas) — so reage a MUDANCAS do sinal, nao ao valor inicial, senao o
+  // painel abriria sozinho ao montar.
+  const sinalAnterior = useRef(sinalAbrirFluxoDoDado);
+  useEffect(() => {
+    if (sinalAbrirFluxoDoDado !== sinalAnterior.current) {
+      sinalAnterior.current = sinalAbrirFluxoDoDado;
+      setAberto(true);
+    }
+  }, [sinalAbrirFluxoDoDado]);
```

```diff
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
+        destacado: agentesDestacados.length === 0 || agentesDestacados.includes(agente.id),
       };
       return {
         id: agente.id,
         type: "agente",
         position: posicaoDoAgente(agente, indice),
         data: dados,
         draggable: false,
         selectable: false,
       };
     });
-    // versao entra na dependencia porque os agentes sao mutaveis.
-  }, [motor, versao]);
+    // versao entra na dependencia porque os agentes sao mutaveis.
+  }, [motor, versao, agentesDestacados]);
```

```diff
   const arestas: Edge[] = useMemo(() => {
     const ativas = arestasAtivas(eventos);
     return LIGACOES.map((ligacao) => {
       const chave = chaveAresta(ligacao.origem, ligacao.destino);
       const ativa = ativas.has(chave);
+      const destacada =
+        agentesDestacados.length === 0 ||
+        (agentesDestacados.includes(ligacao.origem) && agentesDestacados.includes(ligacao.destino));
       return {
         id: chave,
         source: ligacao.origem,
         target: ligacao.destino,
         animated: ativa,
         // A cor da aresta inativa (neutra) e tokenizada com o valor original
         // como padrao do tema escuro [...]
         style: {
           stroke: ativa ? "rgba(56,189,248,0.95)" : "var(--grafo-linha-inativa)",
           strokeWidth: ativa ? 2 : 1,
+          opacity: destacada ? 1 : 0.25,
         },
       };
     });
-  }, [eventos]);
+  }, [eventos, agentesDestacados]);
```

Por fim, no `<ReactFlow>`, adicionar os dois handlers de clique:

```diff
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
+          onNodeClick={(_, no) => alternarAgenteDestacado(no.id)}
+          onPaneClick={limparDestaque}
         >
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Rodar `grafo.test.ts` (garantir que a logica pura do grafo nao foi tocada)**

Run: `npx vitest run src/ui/grafo.test.ts`
Expected: PASS — nenhuma mudanca em `grafo.ts`.

- [ ] **Step 5: Rodar a suíte completa**

Run: `npm test`
Expected: PASS, sem regressao.

- [ ] **Step 6: Commit**

```bash
git add src/ui/GrafoAgentes.tsx src/ui/nosDoGrafo.tsx
git commit -m "feat(ui): grafo destaca/esmaece nos e arestas conforme selecao de agentes"
```

---

### Task 7: Lógica pura da trilha causal

**Files:**
- Create: `demo/src/ui/trilhaCausal.ts`
- Test: `demo/src/ui/trilhaCausal.test.ts`

**Interfaces:**
- Produces: `agentesDaTrilha(eventos: readonly Pick<Evento, "agenteId">[]): string[]` — usado pelas Tasks 8 e 9.

- [ ] **Step 1: Escrever os testes (ainda falhando)**

```ts
// demo/src/ui/trilhaCausal.test.ts
import { describe, expect, it } from "vitest";
import { agentesDaTrilha } from "./trilhaCausal";

describe("agentesDaTrilha", () => {
  it("retorna agentes unicos na ordem de ocorrencia", () => {
    const eventos = [{ agenteId: "a" }, { agenteId: "b" }, { agenteId: "a" }, { agenteId: "c" }];
    expect(agentesDaTrilha(eventos)).toEqual(["a", "b", "c"]);
  });

  it("retorna lista vazia para nenhum evento", () => {
    expect(agentesDaTrilha([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/ui/trilhaCausal.test.ts`
Expected: FAIL — `Cannot find module './trilhaCausal'`.

- [ ] **Step 3: Implementar `trilhaCausal.ts`**

```ts
// demo/src/ui/trilhaCausal.ts
import type { Evento } from "@/simulacao/barramento";

/** Agentes unicos que participaram de uma cadeia de eventos, na ordem em que apareceram. */
export function agentesDaTrilha(eventos: readonly Pick<Evento, "agenteId">[]): string[] {
  const vistos = new Set<string>();
  const ordem: string[] = [];
  for (const evento of eventos) {
    if (!vistos.has(evento.agenteId)) {
      vistos.add(evento.agenteId);
      ordem.push(evento.agenteId);
    }
  }
  return ordem;
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/ui/trilhaCausal.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/ui/trilhaCausal.ts src/ui/trilhaCausal.test.ts
git commit -m "feat(ui): logica pura para extrair os agentes de uma trilha causal"
```

---

### Task 8: Botão "Ver trilha" na Fila de Alertas

**Files:**
- Modify: `demo/src/ui/FilaAlertas.tsx`

**Interfaces:**
- Consumes: `agentesDaTrilha` (Task 7); `definirTrilhaDestacada` (Task 1).

- [ ] **Step 1: Adicionar o import e a acao dentro de `CartaoAlerta`**

```diff
 import { useState } from "react";
 import { motion, AnimatePresence } from "motion/react";
 import { useShallow } from "zustand/react/shallow";
 import type { Alerta, Severidade } from "@/dominio/tipos";
 import { selecionarAlertasAtivos, useSimulacao } from "@/estado/store";
 import Painel from "./Painel";
 import { resumirAlertas } from "./resumosPainel";
+import { agentesDaTrilha } from "./trilhaCausal";
```

```diff
 function CartaoAlerta({ alerta }: { alerta: Alerta }) {
   const motor = useSimulacao((s) => s.motor);
   const validarAlerta = useSimulacao((s) => s.validarAlerta);
   const descartarAlerta = useSimulacao((s) => s.descartarAlerta);
   const abrirBoletim = useSimulacao((s) => s.abrirBoletim);
+  const definirTrilhaDestacada = useSimulacao((s) => s.definirTrilhaDestacada);
   const [motivo, setMotivo] = useState("");
   const [erro, setErro] = useState<string | null>(null);

   const zona = motor.mundo.zonas.find((z) => z.zonaId === alerta.zonaId);
   const boletim = motor.estado.boletins.find((b) => b.alertaId === alerta.alertaId);
   const aguardando = alerta.estado === "candidato";

+  function aoVerTrilha() {
+    const eventos = motor.barramento.porCorrelacao(alerta.alertaId);
+    definirTrilhaDestacada(agentesDaTrilha(eventos));
+  }
+
   function aoDescartar() {
```

- [ ] **Step 2: Adicionar o botão no JSX, logo após o bloco de `atualizacoes` e antes do bloco `aguardando`**

```diff
       {alerta.atualizacoes.length > 0 ? (
         <div style={{ fontSize: 10, color: "var(--cor-atencao)", marginTop: 5 }}>
           {alerta.atualizacoes.length} atualizacao(oes) agrupada(s) — antifadiga ativa
         </div>
       ) : null}

+      <button
+        type="button"
+        className="botao"
+        style={{ marginTop: 8, width: "100%", fontSize: 10.5 }}
+        onClick={aoVerTrilha}
+      >
+        Ver trilha no Fluxo do Dado
+      </button>
+
       {aguardando ? (
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Rodar a suíte completa (regressao do RNF-18)**

Run: `npm test`
Expected: PASS — `store.test.ts` continua validando `validarAlerta`/`descartarAlerta` sem alteracao de comportamento.

- [ ] **Step 5: Commit**

```bash
git add src/ui/FilaAlertas.tsx
git commit -m "feat(ui): botao 'ver trilha' na fila de alertas destaca a cadeia causal no grafo"
```

---

### Task 9: `correlacaoId` clicável na Trilha de Auditoria

**Files:**
- Modify: `demo/src/ui/TrilhaAuditoria.tsx`

**Interfaces:**
- Consumes: `agentesDaTrilha` (Task 7); `definirTrilhaDestacada` (Task 1).

- [ ] **Step 1: Adicionar o import e a acao**

```diff
 import { useState } from "react";
 import { useShallow } from "zustand/react/shallow";
 import { selecionarEventosRecentes, useSimulacao } from "@/estado/store";
 import type { TipoEvento } from "@/simulacao/barramento";
 import Painel from "./Painel";
+import { agentesDaTrilha } from "./trilhaCausal";
```

```diff
 export default function TrilhaAuditoria() {
   const motor = useSimulacao((s) => s.motor);
   // useShallow evita o loop de renderizacao infinito do useSyncExternalStore [...]
   const eventos = useSimulacao(useShallow((s) => selecionarEventosRecentes(s, 40)));
+  const definirTrilhaDestacada = useSimulacao((s) => s.definirTrilhaDestacada);
   useSimulacao((s) => s.versao);
   const [aberto, setAberto] = useState(true);
```

- [ ] **Step 2: Trocar o `<span>` de `correlacaoId` por um botão**

```diff
               <span style={{ display: "block", color: "var(--cor-texto-fraco)", fontSize: 9.5 }}>
                 {evento.agenteId}
-                {evento.correlacaoId ? ` · ${evento.correlacaoId}` : ""}
+                {evento.correlacaoId ? (
+                  <>
+                    {" · "}
+                    <button
+                      type="button"
+                      style={{
+                        background: "none",
+                        border: "none",
+                        padding: 0,
+                        margin: 0,
+                        font: "inherit",
+                        color: "inherit",
+                        cursor: "pointer",
+                        textDecoration: "underline dotted",
+                      }}
+                      onClick={() =>
+                        definirTrilhaDestacada(
+                          agentesDaTrilha(motor.barramento.porCorrelacao(evento.correlacaoId as string)),
+                        )
+                      }
+                    >
+                      {evento.correlacaoId}
+                    </button>
+                  </>
+                ) : null}
               </span>
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Rodar a suíte completa**

Run: `npm test`
Expected: PASS, sem regressao.

- [ ] **Step 5: Commit**

```bash
git add src/ui/TrilhaAuditoria.tsx
git commit -m "feat(ui): correlacaoId na trilha de auditoria abre a trilha causal no grafo"
```

---

### Task 10: `GerenciadorCamadas` ganha visibilidade e foco

**Files:**
- Modify: `demo/src/mapa/camadas.ts`

**Interfaces:**
- Produces: `definirVisibilidade(nome: "estaticas" | "mancha" | "zonas" | "estacoes", visivel: boolean): void`, `graficosParaFoco(estado: EstadoSimulacao): Graphic[]` — usados pela Task 11.

Sem teste unitário — `camadas.ts` já é sem teste por convenção (dependente do SDK do ArcGIS), verificado por ensaio manual (Task 13).

- [ ] **Step 1: Adicionar os dois métodos e o helper privado `camada`**

```diff
   /** Registra um pulso visual sobre uma estacao que acabou de transmitir. */
   pulsar(posicao: [number, number], agoraMs: number): void {
     this.pulsosAtivos.push({ posicao, inicio: agoraMs });
   }
+
+  private camada(nome: "estaticas" | "mancha" | "zonas" | "estacoes"): GraphicsLayer {
+    switch (nome) {
+      case "estaticas":
+        return this.estaticas;
+      case "mancha":
+        return this.mancha;
+      case "zonas":
+        return this.zonas;
+      case "estacoes":
+        return this.estacoes;
+    }
+  }
+
+  /** Liga/desliga uma camada de dado. "Atividade" (pulsos) nao e exposta aqui — e efeito visual, sempre visivel. */
+  definirVisibilidade(nome: "estaticas" | "mancha" | "zonas" | "estacoes", visivel: boolean): void {
+    this.camada(nome).visible = visivel;
+  }
+
+  /** Graficos relevantes para o botao "Focar em ativos": zonas em alerta + mancha atual + estacoes nao-operantes. */
+  graficosParaFoco(estado: EstadoSimulacao): Graphic[] {
+    const zonasComAlerta = new Set(
+      estado.alertas
+        .filter((a) => a.estado !== "descartado" && a.estado !== "encerrado")
+        .map((a) => a.zonaId),
+    );
+    const graficosZonas = this.zonas.graphics
+      .filter((g) => zonasComAlerta.has(g.attributes.zonaId as string))
+      .toArray();
+    const graficosMancha = this.mancha.graphics.toArray();
+    const graficosEstacoes = this.estacoes.graphics
+      .filter((g) => g.attributes.situacao !== "operante")
+      .toArray();
+    return [...graficosZonas, ...graficosMancha, ...graficosEstacoes];
+  }
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/mapa/camadas.ts
git commit -m "feat(mapa): GerenciadorCamadas ganha visibilidade por camada e foco em ativos"
```

---

### Task 11: `ControlesMapa.tsx` — novo componente

**Files:**
- Create: `demo/src/mapa/ControlesMapa.tsx`

**Interfaces:**
- Consumes: `definirVisibilidade`, `graficosParaFoco` (Task 10).
- Produces: `export default function ControlesMapa(props: { viewRef: RefObject<MapView | null>; mapaRef: RefObject<ArcGISMap | null>; camadasRef: RefObject<GerenciadorCamadas | null> })` — usado pela Task 12.

Sem teste unitário — `.tsx` dependente do SDK do ArcGIS, verificado por ensaio manual (Task 13).

- [ ] **Step 1: Criar `demo/src/mapa/ControlesMapa.tsx`**

```tsx
// demo/src/mapa/ControlesMapa.tsx
import { useState, type RefObject } from "react";
import type MapView from "@arcgis/core/views/MapView.js";
import type ArcGISMap from "@arcgis/core/Map.js";
import Basemap from "@arcgis/core/Basemap.js";
import { useSimulacao } from "@/estado/store";
import type { GerenciadorCamadas } from "./camadas";

interface ControlesMapaProps {
  viewRef: RefObject<MapView | null>;
  mapaRef: RefObject<ArcGISMap | null>;
  camadasRef: RefObject<GerenciadorCamadas | null>;
}

type Popover = "camadas" | "basemap" | null;
type NomeCamada = "estaticas" | "mancha" | "zonas" | "estacoes";

const CAMADAS: readonly { nome: NomeCamada; rotulo: string }[] = [
  { nome: "estaticas", rotulo: "Base sintetica" },
  { nome: "mancha", rotulo: "Mancha de inundacao" },
  { nome: "zonas", rotulo: "Zonas de risco" },
  { nome: "estacoes", rotulo: "Rede de observacao" },
];

const BASEMAPS: readonly { id: string; rotulo: string }[] = [
  { id: "osm", rotulo: "OpenStreetMap" },
  { id: "streets-vector", rotulo: "Esri Streets" },
  { id: "dark-gray-vector", rotulo: "Esri Escuro" },
];

export default function ControlesMapa({ viewRef, mapaRef, camadasRef }: ControlesMapaProps) {
  const motor = useSimulacao((s) => s.motor);
  const [popoverAberto, setPopoverAberto] = useState<Popover>(null);
  const [visibilidade, setVisibilidade] = useState<Record<NomeCamada, boolean>>({
    estaticas: true,
    mancha: true,
    zonas: true,
    estacoes: true,
  });
  const [basemapAtual, setBasemapAtual] = useState("osm");

  const graficosFoco = camadasRef.current?.graficosParaFoco(motor.estado) ?? [];
  const semAlvoDeFoco = graficosFoco.length === 0;

  function aoClicarInicio() {
    viewRef.current?.goTo(
      { center: [motor.mundo.centro[0], motor.mundo.centro[1]], zoom: 11 },
      { animate: true },
    );
  }

  function aoClicarFocarAtivos() {
    if (semAlvoDeFoco || !viewRef.current) return;
    void viewRef.current.goTo(graficosFoco, { animate: true });
  }

  function alternarCamada(nome: NomeCamada) {
    const proximo = !visibilidade[nome];
    setVisibilidade((v) => ({ ...v, [nome]: proximo }));
    camadasRef.current?.definirVisibilidade(nome, proximo);
  }

  function escolherBasemap(id: string) {
    const basemap = Basemap.fromId(id);
    if (basemap && mapaRef.current) mapaRef.current.basemap = basemap;
    setBasemapAtual(id);
    setPopoverAberto(null);
  }

  return (
    <div className="vidro" style={{ position: "absolute", right: 16, bottom: 16, display: "flex", gap: 6, padding: 6, zIndex: 10 }}>
      <button
        type="button"
        className="botao-icone"
        style={{ width: 34, height: 34 }}
        aria-label="Voltar ao centro padrao"
        onClick={aoClicarInicio}
      >
        🏠
      </button>
      <button
        type="button"
        className="botao-icone"
        style={{ width: 34, height: 34 }}
        aria-label="Focar nos elementos ativos"
        disabled={semAlvoDeFoco}
        title={semAlvoDeFoco ? "Nenhuma zona em alerta, mancha ativa ou estacao fora do ar no momento" : undefined}
        onClick={aoClicarFocarAtivos}
      >
        🎯
      </button>
      <div style={{ position: "relative" }}>
        <button
          type="button"
          className="botao-icone"
          style={{ width: 34, height: 34 }}
          aria-label="Camadas do mapa"
          aria-expanded={popoverAberto === "camadas"}
          onClick={() => setPopoverAberto((p) => (p === "camadas" ? null : "camadas"))}
        >
          🗺️
        </button>
        {popoverAberto === "camadas" ? (
          <div className="cabecalho-popover" style={{ top: "auto", bottom: 42, right: 0 }}>
            {CAMADAS.map((c) => (
              <label key={c.nome} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "4px 0" }}>
                <input type="checkbox" checked={visibilidade[c.nome]} onChange={() => alternarCamada(c.nome)} />
                {c.rotulo}
              </label>
            ))}
          </div>
        ) : null}
      </div>
      <div style={{ position: "relative" }}>
        <button
          type="button"
          className="botao-icone"
          style={{ width: 34, height: 34 }}
          aria-label="Escolher basemap"
          aria-expanded={popoverAberto === "basemap"}
          onClick={() => setPopoverAberto((p) => (p === "basemap" ? null : "basemap"))}
        >
          🌐
        </button>
        {popoverAberto === "basemap" ? (
          <div className="cabecalho-popover" style={{ top: "auto", bottom: 42, right: 0 }}>
            {BASEMAPS.map((b) => (
              <button
                key={b.id}
                type="button"
                className="botao"
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  marginBottom: 6,
                  borderColor: b.id === basemapAtual ? "var(--cor-acento)" : undefined,
                }}
                onClick={() => escolherBasemap(b.id)}
              >
                {b.rotulo}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/mapa/ControlesMapa.tsx
git commit -m "feat(mapa): controles flutuantes de foco, camadas e basemap"
```

---

### Task 12: `MapaSalaSituacao.tsx` monta `ControlesMapa`

**Files:**
- Modify: `demo/src/mapa/MapaSalaSituacao.tsx`

**Interfaces:**
- Consumes: `ControlesMapa` (Task 11).

- [ ] **Step 1: Adicionar o estado `montado` e renderizar `ControlesMapa`**

```diff
-import { useEffect, useRef } from "react";
+import { useEffect, useRef, useState } from "react";
 import ArcGISMap from "@arcgis/core/Map.js";
 import MapView from "@arcgis/core/views/MapView.js";
 import Basemap from "@arcgis/core/Basemap.js";
 import "@arcgis/core/assets/esri/themes/dark/main.css";
 import { useSimulacao } from "@/estado/store";
 import { configurarArcGIS, modoEnterprise } from "./config";
 import { autenticarNoPortal } from "./portal";
 import { GerenciadorCamadas } from "./camadas";
+import ControlesMapa from "./ControlesMapa";
```

```diff
   const camadasRef = useRef<GerenciadorCamadas | null>(null);
   function obterCamadas(): GerenciadorCamadas {
     if (!camadasRef.current) camadasRef.current = new GerenciadorCamadas();
     return camadasRef.current;
   }
+  const [montado, setMontado] = useState(false);
```

```diff
     const view = new MapView({
       container: container.current,
       map,
       center: [motor.mundo.centro[0], motor.mundo.centro[1]],
       zoom: 11,
       ui: { components: ["zoom"] },
       constraints: { snapToZoom: false },
     });
     viewRef.current = view;
+    setMontado(true);

     return () => {
```

```diff
-  return <div ref={container} style={{ position: "absolute", inset: 0 }} />;
+  return (
+    <>
+      <div ref={container} style={{ position: "absolute", inset: 0 }} />
+      {montado ? <ControlesMapa viewRef={viewRef} mapaRef={mapaRef} camadasRef={camadasRef} /> : null}
+    </>
+  );
 }
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Rodar a suíte completa**

Run: `npm test`
Expected: PASS, sem regressao.

- [ ] **Step 4: Commit**

```bash
git add src/mapa/MapaSalaSituacao.tsx
git commit -m "feat(mapa): monta os controles de mapa assim que a view esta pronta"
```

---

### Task 13: Ensaio manual final e regressão

**Files:** nenhum (apenas verificação)

- [ ] **Step 1: Rodar a verificação completa**

Run: `npm run verificar` (ou `npm test && npx tsc --noEmit && npm run build`)
Expected: testes, typecheck e build todos verdes.

- [ ] **Step 2: Iniciar o servidor de desenvolvimento e abrir no navegador**

Run: `npm run dev`

- [ ] **Step 3: Checklist manual**

- **Controles de mapa:** clicar 🏠 recentra o mapa; clicar 🎯 com o cenário "Ceu limpo" (sem nada ativo) mostra o botão desabilitado com o `title` explicativo; rodar o cenário "Chuva convectiva localizada" até haver alertas/estações não-operantes e confirmar que 🎯 agora funciona e enquadra os elementos; abrir o popover de camadas e desligar/ligar cada uma das 4 camadas de dado, confirmando visualmente no mapa; trocar de basemap nas 3 opções.
- **Saúde da Rede:** confirmar que o grid original não mudou de aparência; passar o mouse sobre um bloco e ver o card com o motivo detalhado; clicar num chip da legenda e confirmar que filtra (grid e depois lista); clicar de novo no mesmo chip e confirmar que limpa; alternar para o modo lista e testar as 3 ordenações; filtrar por uma situação sem nenhuma estação (ex: "Desativada") e confirmar a mensagem de "nenhuma estacao".
- **Agentes Especialistas:** filtrar por módulo e por status (combinados); expandir/recolher os detalhes de uma linha sem que isso selecione o agente; clicar numa linha e confirmar que o nó correspondente acende no Fluxo do Dado com o resto esmaecido; clicar no mesmo agente de novo e confirmar que limpa; clicar num nó do grafo e confirmar que a linha correspondente na lista se destaca (vínculo no sentido inverso); clicar em área vazia do grafo e confirmar que limpa a seleção.
- **Fluxo do Dado / trilha causal:** com o painel colapsado, clicar em "Ver trilha no Fluxo do Dado" num alerta na Fila de Alertas e confirmar que o painel abre sozinho com a cadeia destacada; clicar num `correlacaoId` na Trilha de Auditoria e confirmar o mesmo comportamento.
- **Regressão RNF-18:** confirmar que "Validar e expedir"/"Descartar" continuam funcionando exatamente como antes, e que o botão "Ver trilha" não interfere nesse fluxo.
- **Tema:** alternar para o tema claro e revisitar rapidamente os itens acima (legenda, hover card, popovers dos controles de mapa, destaque no grafo) para confirmar legibilidade.

- [ ] **Step 4: Parar o servidor de desenvolvimento**

Nenhum commit nesta task — é só verificação. Se o checklist encontrar algo quebrado, corrigir na task correspondente antes de prosseguir.
