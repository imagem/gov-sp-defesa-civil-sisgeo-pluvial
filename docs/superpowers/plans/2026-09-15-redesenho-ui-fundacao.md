# Redesenho de UI/UX — Fundação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar à demo H1 uma casca de UI/UX coerente: tema claro/escuro funcional, um componente `<Painel>` compartilhado com collapse e resumo rico aplicado aos cinco painéis flutuantes, e uma nova barra superior (perfil, tema, notificações) sem a marca "H1".

**Architecture:** Introduz uma camada de apresentação nova e isolada do motor de simulação — tokens CSS temáticos, um wrapper `<Painel>` reutilizável com estado de collapse local a cada instância, e módulos `.ts` puros (`tema.ts`, `resumosPainel.ts`, `notificacoes.ts`) que derivam os números exibidos nos resumos a partir do estado já existente na store. Nenhuma mudança toca `src/dominio/`, `src/simulacao/` ou `src/agentes/`.

**Tech Stack:** React 19, Zustand v5, `motion` (motion/react) v13, `@xyflow/react` v12, Vite, Vitest.

**Spec:** [docs/superpowers/specs/2026-09-14-redesenho-ui-fundacao.md](../specs/2026-09-14-redesenho-ui-fundacao.md)

## Global Constraints

- RNF-18 (nenhum alerta chega a `expedido` sem validação humana) não pode ser tocado — nenhuma task deste plano modifica `validarAlerta`/`descartarAlerta`/`motor.validarAlerta`/`motor.descartarAlerta`.
- `src/dominio/`, `src/simulacao/`, `src/agentes/` continuam proibidos de chamar `Math.random()`/`Date.now()` — nenhuma task deste plano toca esses diretórios.
- Cores de domínio (`--cor-acento`, `--cor-ok`, `--cor-atencao`, `--cor-alta`, `--cor-critica`, `--sev-*`) têm o MESMO valor nos dois temas — só mudam fundo, texto, borda e material de vidro/botões.
- O conteúdo interno do grafo "Fluxo do dado" (nós, arestas, cores do canvas React Flow em `GrafoAgentes.tsx` e `nosDoGrafo.tsx`) não muda de comportamento nem de aparência — apenas ganha o cabeçalho compartilhado do `<Painel>` (collapse + info) por cima.
- Arquivos `.tsx` seguem a convenção do projeto: não têm teste unitário, são verificados por ensaio manual no navegador. Lógica pura extraída para `.ts` é testada via Vitest (`vitest.config.ts` só coleta `src/**/*.test.ts`).
- Nomenclatura em português, consistente com o restante do código (`Painel`, `resumo`, `aberto`, `aoAlternar`, etc.).

---

## Task 1: Tema — lógica pura e paleta clara

**Files:**
- Create: `demo/src/estado/tema.ts`
- Test: `demo/src/estado/tema.test.ts`
- Modify: `demo/src/styles/tokens.css`

**Interfaces:**
- Produces: `type Tema = "escuro" | "claro"`; `alternarTema(temaAtual: Tema): Tema`; `lerTemaSalvo(armazenamento: Pick<Storage, "getItem"> | undefined): Tema`; `salvarTema(armazenamento: Pick<Storage, "setItem"> | undefined, tema: Tema): void`; `aplicarTemaNoElemento(elemento: Pick<HTMLElement, "setAttribute" | "removeAttribute">, tema: Tema): void` — usados por `Cabecalho.tsx` (Task 13).
- Produces: tokens CSS `--vidro-fundo-1/2`, `--vidro-forte-fundo-1/2`, `--vidro-sombra`, `--vidro-forte-sombra`, `--vidro-realce`, `--vidro-fallback`, `--superficie-fraca/media/forte`, `--divisor-fraco`, `--botao-fundo(-hover)`, `--botao-primario-fundo(-hover)`, `--botao-primario-borda`, `--botao-perigo-fundo(-hover)`, `--botao-perigo-borda`, `--selo-fundo`, `--selo-borda`, `--selo-texto`, `--modal-scrim`, `--campo-fundo` — consumidos por `glass.css` (Task 2) e pelos arquivos `.tsx` convertidos (Task 2).

- [ ] **Step 1: Escrever o teste de `tema.ts` (ainda falhando)**

```ts
// demo/src/estado/tema.test.ts
import { describe, expect, it, vi } from "vitest";
import { alternarTema, aplicarTemaNoElemento, lerTemaSalvo, salvarTema } from "./tema";

describe("alternarTema", () => {
  it("alterna de escuro para claro e volta", () => {
    expect(alternarTema("escuro")).toBe("claro");
    expect(alternarTema("claro")).toBe("escuro");
  });
});

describe("lerTemaSalvo", () => {
  it("retorna escuro quando nao ha nada salvo", () => {
    expect(lerTemaSalvo({ getItem: () => null })).toBe("escuro");
  });

  it("retorna claro quando salvo assim", () => {
    expect(lerTemaSalvo({ getItem: () => "claro" })).toBe("claro");
  });

  it("ignora valor invalido salvo e usa escuro", () => {
    expect(lerTemaSalvo({ getItem: () => "sepia" })).toBe("escuro");
  });

  it("retorna escuro quando nao ha armazenamento disponivel", () => {
    expect(lerTemaSalvo(undefined)).toBe("escuro");
  });
});

describe("salvarTema", () => {
  it("grava o tema informado sob a chave demo.tema", () => {
    const setItem = vi.fn();
    salvarTema({ setItem }, "claro");
    expect(setItem).toHaveBeenCalledWith("demo.tema", "claro");
  });
});

describe("aplicarTemaNoElemento", () => {
  it("define data-tema=claro no elemento", () => {
    const setAttribute = vi.fn();
    const removeAttribute = vi.fn();
    aplicarTemaNoElemento({ setAttribute, removeAttribute }, "claro");
    expect(setAttribute).toHaveBeenCalledWith("data-tema", "claro");
    expect(removeAttribute).not.toHaveBeenCalled();
  });

  it("remove data-tema quando volta para escuro", () => {
    const setAttribute = vi.fn();
    const removeAttribute = vi.fn();
    aplicarTemaNoElemento({ setAttribute, removeAttribute }, "escuro");
    expect(removeAttribute).toHaveBeenCalledWith("data-tema");
    expect(setAttribute).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/estado/tema.test.ts`
Expected: FAIL — `Cannot find module './tema'` (o arquivo ainda não existe).

- [ ] **Step 3: Implementar `tema.ts`**

```ts
// demo/src/estado/tema.ts
export type Tema = "escuro" | "claro";

const CHAVE_ARMAZENAMENTO = "demo.tema";

export function alternarTema(temaAtual: Tema): Tema {
  return temaAtual === "escuro" ? "claro" : "escuro";
}

export function lerTemaSalvo(armazenamento: Pick<Storage, "getItem"> | undefined): Tema {
  const valor = armazenamento?.getItem(CHAVE_ARMAZENAMENTO);
  return valor === "claro" ? "claro" : "escuro";
}

export function salvarTema(armazenamento: Pick<Storage, "setItem"> | undefined, tema: Tema): void {
  armazenamento?.setItem(CHAVE_ARMAZENAMENTO, tema);
}

export function aplicarTemaNoElemento(
  elemento: Pick<HTMLElement, "setAttribute" | "removeAttribute">,
  tema: Tema,
): void {
  if (tema === "claro") {
    elemento.setAttribute("data-tema", "claro");
  } else {
    elemento.removeAttribute("data-tema");
  }
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/estado/tema.test.ts`
Expected: PASS (7 testes).

- [ ] **Step 5: Substituir o conteúdo de `demo/src/styles/tokens.css`**

Substitua o arquivo inteiro por:

```css
:root {
  color-scheme: dark;

  --cor-fundo: #070b14;
  --cor-fundo-alt: #0c1322;
  --cor-texto: #e8eef7;
  --cor-texto-fraco: #92a3bb;
  --cor-borda: rgba(255, 255, 255, 0.12);

  --cor-acento: #38bdf8;
  --cor-ok: #34d399;
  --cor-atencao: #fbbf24;
  --cor-alta: #fb923c;
  --cor-critica: #f43f5e;

  --sev-baixa: #38bdf8;
  --sev-media: #fbbf24;
  --sev-alta: #fb923c;
  --sev-muito-alta: #f43f5e;

  --raio: 14px;
  --espaco-1: 4px;
  --espaco-2: 8px;
  --espaco-3: 12px;
  --espaco-4: 16px;
  --espaco-5: 24px;

  --fonte: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --fonte-mono: ui-monospace, "SF Mono", "Cascadia Code", monospace;

  /* Material de vidro (glassmorfismo) — tema escuro e o padrao. */
  --vidro-fundo-1: rgba(15, 23, 40, 0.82);
  --vidro-fundo-2: rgba(9, 14, 25, 0.74);
  --vidro-forte-fundo-1: rgba(12, 19, 34, 0.88);
  --vidro-forte-fundo-2: rgba(7, 11, 20, 0.78);
  --vidro-sombra: rgba(0, 0, 0, 0.38);
  --vidro-forte-sombra: rgba(0, 0, 0, 0.5);
  --vidro-realce: rgba(255, 255, 255, 0.14);
  --vidro-fallback: rgba(9, 14, 25, 0.94);

  /* Sobreposicoes neutras usadas em fundos de linha, divisores e hovers. */
  --superficie-fraca: rgba(255, 255, 255, 0.04);
  --superficie-media: rgba(255, 255, 255, 0.07);
  --superficie-forte: rgba(255, 255, 255, 0.14);
  --divisor-fraco: rgba(255, 255, 255, 0.05);

  --botao-fundo: rgba(255, 255, 255, 0.07);
  --botao-fundo-hover: rgba(255, 255, 255, 0.14);
  --botao-primario-fundo: rgba(56, 189, 248, 0.22);
  --botao-primario-fundo-hover: rgba(56, 189, 248, 0.34);
  --botao-primario-borda: rgba(56, 189, 248, 0.55);
  --botao-perigo-fundo: rgba(244, 63, 94, 0.18);
  --botao-perigo-fundo-hover: rgba(244, 63, 94, 0.3);
  --botao-perigo-borda: rgba(244, 63, 94, 0.5);

  --selo-fundo: rgba(251, 191, 36, 0.16);
  --selo-borda: rgba(251, 191, 36, 0.45);
  --selo-texto: #fde68a;

  /* Escurece o fundo por baixo de modais — propositalmente igual nos dois temas. */
  --modal-scrim: rgba(3, 6, 12, 0.66);
  --campo-fundo: rgba(0, 0, 0, 0.34);
}

/*
 * Tema claro: so troca fundo, texto, borda e material de vidro/botoes.
 * As cores de dominio (--cor-acento/ok/atencao/alta/critica e --sev-*) NAO
 * mudam — sao a simbologia do mapa, da severidade e do status dos agentes,
 * e precisam significar a mesma coisa nos dois temas.
 */
:root[data-tema="claro"] {
  color-scheme: light;

  --cor-fundo: #eef2f8;
  --cor-fundo-alt: #ffffff;
  --cor-texto: #101725;
  --cor-texto-fraco: #55627a;
  --cor-borda: rgba(16, 23, 37, 0.14);

  --vidro-fundo-1: rgba(255, 255, 255, 0.82);
  --vidro-fundo-2: rgba(241, 245, 251, 0.78);
  --vidro-forte-fundo-1: rgba(255, 255, 255, 0.92);
  --vidro-forte-fundo-2: rgba(236, 241, 249, 0.86);
  --vidro-sombra: rgba(16, 23, 37, 0.14);
  --vidro-forte-sombra: rgba(16, 23, 37, 0.18);
  --vidro-realce: rgba(255, 255, 255, 0.6);
  --vidro-fallback: rgba(246, 248, 252, 0.96);

  --superficie-fraca: rgba(16, 23, 37, 0.035);
  --superficie-media: rgba(16, 23, 37, 0.06);
  --superficie-forte: rgba(16, 23, 37, 0.1);
  --divisor-fraco: rgba(16, 23, 37, 0.08);

  --botao-fundo: rgba(16, 23, 37, 0.05);
  --botao-fundo-hover: rgba(16, 23, 37, 0.1);
  --botao-primario-fundo: rgba(14, 165, 233, 0.14);
  --botao-primario-fundo-hover: rgba(14, 165, 233, 0.22);
  --botao-primario-borda: rgba(14, 165, 233, 0.5);
  --botao-perigo-fundo: rgba(225, 29, 72, 0.12);
  --botao-perigo-fundo-hover: rgba(225, 29, 72, 0.2);
  --botao-perigo-borda: rgba(225, 29, 72, 0.45);

  --selo-fundo: rgba(217, 119, 6, 0.14);
  --selo-borda: rgba(217, 119, 6, 0.4);
  --selo-texto: #92400e;

  --campo-fundo: rgba(16, 23, 37, 0.05);
}

* { box-sizing: border-box; }

html, body, #raiz {
  height: 100%;
  margin: 0;
}

body {
  background: var(--cor-fundo);
  color: var(--cor-texto);
  font-family: var(--fonte);
  font-size: 14px;
  overflow: hidden;
}
```

- [ ] **Step 6: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros (CSS não é verificado pelo tsc; este passo garante que `tema.ts` compila no projeto).

- [ ] **Step 7: Commit**

```bash
git add src/estado/tema.ts src/estado/tema.test.ts src/styles/tokens.css
git commit -m "feat(tema): logica pura de tema claro/escuro e paleta clara em tokens.css"
```

---

## Task 2: Converter o material de vidro e overlays neutros para tokens

**Files:**
- Modify: `demo/src/styles/glass.css`
- Modify: `demo/src/ui/PainelAgentes.tsx:30`
- Modify: `demo/src/ui/TrilhaAuditoria.tsx:46`
- Modify: `demo/src/ui/ModalBoletim.tsx:37,82`
- Modify: `demo/src/ui/GrafoAgentes.tsx` (comentário apenas)
- Modify: `demo/src/ui/nosDoGrafo.tsx` (comentário apenas)

**Interfaces:**
- Consumes: os tokens `--vidro-*`, `--superficie-*`, `--divisor-fraco`, `--botao-*`, `--selo-*`, `--modal-scrim`, `--campo-fundo` produzidos na Task 1.

**Nota de decisão:** `GrafoAgentes.tsx:52,80` (cor da aresta inativa e do padrão de fundo do canvas) e `nosDoGrafo.tsx:13` (borda neutra do nó "ocioso") permanecem com valores `rgba` fixos — não recebem tokens de tema. O usuário pediu explicitamente para não mudar a aparência do conteúdo do grafo sem avisar antes; como esses valores compõem o canvas do React Flow (não a moldura do `<Painel>` que envolve o painel), a Fundação os deixa intocados e documenta a decisão com um comentário no código.

- [ ] **Step 1: Substituir o conteúdo de `demo/src/styles/glass.css`**

```css
/* Camada de glassmorfismo. Um unico lugar define o material das superficies. */

.vidro {
  /* Fundo translucido: legivel por si so mesmo quando o
     backdrop-filter nao esta ativo (ver @supports abaixo). O blur, quando
     suportado, apenas enriquece o material — nunca e o que garante leitura. */
  background: linear-gradient(145deg, var(--vidro-fundo-1), var(--vidro-fundo-2));
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio);
  box-shadow:
    0 8px 32px var(--vidro-sombra),
    inset 0 1px 0 var(--vidro-realce);
}

.vidro-forte {
  background: linear-gradient(145deg, var(--vidro-forte-fundo-1), var(--vidro-forte-fundo-2));
  backdrop-filter: blur(26px) saturate(150%);
  -webkit-backdrop-filter: blur(26px) saturate(150%);
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio);
  box-shadow: 0 16px 48px var(--vidro-forte-sombra);
}

/* Fallback para navegadores sem backdrop-filter: sem ele, o texto
   ficaria ilegivel sobre o mapa. */
@supports not (backdrop-filter: blur(1px)) {
  .vidro,
  .vidro-forte {
    background: var(--vidro-fallback);
  }
}

.painel {
  padding: var(--espaco-4);
  color: var(--cor-texto);
  overflow: auto;
}

.titulo-painel {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--cor-texto-fraco);
  margin: 0 0 var(--espaco-3);
}

.selo-demo {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  background: var(--selo-fundo);
  border: 1px solid var(--selo-borda);
  color: var(--selo-texto);
}

.botao {
  appearance: none;
  cursor: pointer;
  font: inherit;
  color: var(--cor-texto);
  padding: 7px 14px;
  border-radius: 9px;
  border: 1px solid var(--cor-borda);
  background: var(--botao-fundo);
  transition: background 140ms ease, border-color 140ms ease, transform 90ms ease;
}

.botao:hover { background: var(--botao-fundo-hover); }
.botao:active { transform: translateY(1px); }
.botao:focus-visible { outline: 2px solid var(--cor-acento); outline-offset: 2px; }

.botao-primario {
  background: var(--botao-primario-fundo);
  border-color: var(--botao-primario-borda);
}
.botao-primario:hover { background: var(--botao-primario-fundo-hover); }

.botao-perigo {
  background: var(--botao-perigo-fundo);
  border-color: var(--botao-perigo-borda);
}
.botao-perigo:hover { background: var(--botao-perigo-fundo-hover); }

.pulsando { animation: pulsar 1.6s ease-in-out infinite; }

@keyframes pulsar {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

@media (prefers-reduced-motion: reduce) {
  .pulsando { animation: none; }
}
```

- [ ] **Step 2: Converter o overlay neutro em `PainelAgentes.tsx`**

```diff
-              background: "rgba(255,255,255,0.04)",
+              background: "var(--superficie-fraca)",
```

- [ ] **Step 3: Converter o divisor neutro em `TrilhaAuditoria.tsx`**

```diff
-              borderBottom: "1px solid rgba(255,255,255,0.05)",
+              borderBottom: "1px solid var(--divisor-fraco)",
```

- [ ] **Step 4: Converter os overlays de `ModalBoletim.tsx`**

```diff
-            background: "rgba(3, 6, 12, 0.66)",
+            background: "var(--modal-scrim)",
```

```diff
-                background: "rgba(0,0,0,0.34)",
+                background: "var(--campo-fundo)",
```

- [ ] **Step 5: Documentar a exclusão do canvas do grafo em `GrafoAgentes.tsx`**

Logo acima do array `arestas` (antes de `const arestas: Edge[] = useMemo(...)`), adicionar:

```ts
// As cores do canvas (aresta inativa, fundo pontilhado) sao fixas de proposito:
// o usuario pediu para nao mudar a aparencia deste conteudo sem avisar antes,
// entao elas nao viram tokens de tema nesta Fundacao (ver plano/spec do
// redesenho de UI, subprojeto "Fluxo do dado").
```

- [ ] **Step 6: Documentar a exclusão em `nosDoGrafo.tsx`**

Logo acima de `const CORES: Record<StatusAgente, ...>`, adicionar:

```ts
// A borda neutra de "ocioso" (rgba branco) e fixa de proposito, pelo mesmo
// motivo do comentario em GrafoAgentes.tsx: este canvas nao muda de aparencia
// nesta Fundacao.
```

- [ ] **Step 7: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
git add src/styles/glass.css src/ui/PainelAgentes.tsx src/ui/TrilhaAuditoria.tsx src/ui/ModalBoletim.tsx src/ui/GrafoAgentes.tsx src/ui/nosDoGrafo.tsx
git commit -m "refactor(tema): substitui overlays e material de vidro hardcoded por tokens"
```

---

## Task 3: Estilos do `<Painel>` colapsável e da nova barra superior

**Files:**
- Create: `demo/src/styles/componentes.css`
- Modify: `demo/src/App.tsx` (import do novo stylesheet)

**Interfaces:**
- Produces: classes CSS `.painel-cabecalho`, `.botao-icone`, `.painel-popover-info`, `.painel-resumo`, `.titulo-resumo`, `.chip`, `.chip-ponto`, `.cabecalho-separador`, `.cabecalho-pill`, `.cabecalho-avatar`, `.cabecalho-status`, `.cabecalho-badge`, `.cabecalho-popover` — consumidas por `Painel.tsx` (Task 4) e `Cabecalho.tsx` (Task 13).

- [ ] **Step 1: Criar `demo/src/styles/componentes.css`**

```css
/* Cabecalho do painel colapsavel: titulo + botoes de info/colapsar. */
.painel-cabecalho {
  display: flex;
  align-items: center;
  gap: var(--espaco-2);
}

.painel-cabecalho .titulo-painel {
  margin: 0;
}

.botao-icone {
  appearance: none;
  cursor: pointer;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid var(--cor-borda);
  background: var(--superficie-media);
  color: var(--cor-texto-fraco);
  font-size: 11px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.botao-icone:hover { background: var(--superficie-forte); }
.botao-icone:focus-visible { outline: 2px solid var(--cor-acento); outline-offset: 2px; }

.painel-popover-info {
  position: absolute;
  top: 28px;
  right: 0;
  z-index: 20;
  width: 260px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--vidro-forte-fundo-1);
  border: 1px dashed var(--cor-borda);
  box-shadow: 0 12px 32px var(--vidro-forte-sombra);
  font-size: 11.5px;
  color: var(--cor-texto-fraco);
  line-height: 1.5;
}

.painel-resumo {
  display: flex;
  align-items: center;
  gap: var(--espaco-2);
  min-height: 44px;
  flex-wrap: wrap;
}

.titulo-resumo {
  font-size: 12px;
  font-weight: 600;
  color: var(--cor-texto);
  white-space: nowrap;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--superficie-media);
  border: 1px solid var(--cor-borda);
  color: var(--cor-texto-fraco);
  white-space: nowrap;
}
.chip b { color: var(--cor-texto); font-weight: 600; }

.chip-ponto {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-block;
}

/* Barra superior */
.cabecalho-separador {
  width: 1px;
  align-self: stretch;
  background: var(--cor-borda);
  margin: 4px 2px;
}

.cabecalho-pill {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 12px;
  border-radius: 9px;
  border: 1px solid var(--cor-borda);
  background: var(--superficie-media);
  font-size: 12.5px;
  color: var(--cor-texto);
  cursor: pointer;
  white-space: nowrap;
  appearance: none;
  font: inherit;
}
.cabecalho-pill:hover { background: var(--superficie-forte); }

.cabecalho-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(145deg, var(--cor-acento), #0ea5e9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10.5px;
  font-weight: 700;
  color: #04121c;
  flex-shrink: 0;
}

.cabecalho-status {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--selo-fundo);
  border: 1px solid var(--selo-borda);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--selo-texto);
  white-space: nowrap;
}

.cabecalho-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--cor-critica);
  border: 2px solid var(--cor-fundo-alt);
}

.cabecalho-popover {
  position: absolute;
  top: 42px;
  right: 0;
  z-index: 30;
  width: 280px;
  max-height: 320px;
  overflow: auto;
  padding: 10px;
  border-radius: 10px;
  background: var(--vidro-forte-fundo-1);
  border: 1px solid var(--cor-borda);
  box-shadow: 0 16px 40px var(--vidro-forte-sombra);
}
```

- [ ] **Step 2: Importar o novo stylesheet em `App.tsx`**

```diff
 import { useSimulacao, VELOCIDADES } from "@/estado/store";
 import "@/styles/glass.css";
+import "@/styles/componentes.css";
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/styles/componentes.css src/App.tsx
git commit -m "feat(ui): estilos do painel colapsavel e da nova barra superior"
```

---

## Task 4: Componente `<Painel>` genérico

**Files:**
- Create: `demo/src/ui/Painel.tsx`

**Interfaces:**
- Consumes: classes CSS da Task 3 (`.painel-cabecalho`, `.botao-icone`, `.painel-popover-info`, `.painel-resumo`, `.chip`).
- Produces: `export default function Painel(props: PainelProps)` com `interface PainelProps { titulo: string; aberto: boolean; aoAlternar: () => void; resumo: ReactNode; info?: ReactNode; children: ReactNode; comPadding?: boolean; estiloSecao?: CSSProperties }` — usado pelas Tasks 6 a 10.

`.tsx` sem teste unitário (convenção do projeto) — verificado por ensaio manual na Task 14.

- [ ] **Step 1: Criar `demo/src/ui/Painel.tsx`**

```tsx
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";

interface PainelProps {
  titulo: string;
  aberto: boolean;
  aoAlternar: () => void;
  resumo: ReactNode;
  info?: ReactNode;
  children: ReactNode;
  /**
   * false remove o padding padrao do <section> — usado pelo Fluxo do dado,
   * cujo conteudo (canvas do React Flow) precisa preencher o cartao ate a
   * borda, exatamente como preenchia antes deste componente existir.
   */
  comPadding?: boolean;
  estiloSecao?: CSSProperties;
}

export default function Painel({
  titulo,
  aberto,
  aoAlternar,
  resumo,
  info,
  children,
  comPadding = true,
  estiloSecao,
}: PainelProps) {
  const [infoAberta, setInfoAberta] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!infoAberta) return;
    function aoClicarFora(e: MouseEvent) {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) setInfoAberta(false);
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setInfoAberta(false);
    }
    window.addEventListener("mousedown", aoClicarFora);
    window.addEventListener("keydown", aoTeclar);
    return () => {
      window.removeEventListener("mousedown", aoClicarFora);
      window.removeEventListener("keydown", aoTeclar);
    };
  }, [infoAberta]);

  const paddingHeader = comPadding ? undefined : "var(--espaco-3) var(--espaco-4) 0";
  const paddingResumo = comPadding ? undefined : "0 var(--espaco-4) var(--espaco-3)";

  return (
    <section
      className={comPadding ? "vidro painel" : "vidro"}
      style={{
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        alignSelf: "start",
        overflow: comPadding ? "auto" : "hidden",
        ...estiloSecao,
      }}
    >
      <div className="painel-cabecalho" style={{ padding: paddingHeader }}>
        <h2 className="titulo-painel">{titulo}</h2>
        <div ref={infoRef} style={{ marginLeft: "auto", display: "flex", gap: 6, position: "relative" }}>
          {info ? (
            <>
              <button
                type="button"
                className="botao-icone"
                aria-label={`Como ler: ${titulo}`}
                aria-expanded={infoAberta}
                onClick={() => setInfoAberta((v) => !v)}
              >
                i
              </button>
              {infoAberta ? (
                <div className="painel-popover-info" role="tooltip">
                  {info}
                </div>
              ) : null}
            </>
          ) : null}
          <button
            type="button"
            className="botao-icone"
            aria-label={aberto ? `Recolher ${titulo}` : `Expandir ${titulo}`}
            aria-expanded={aberto}
            onClick={aoAlternar}
          >
            {aberto ? "▲" : "▼"}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {aberto ? (
          <motion.div
            key="conteudo"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: "hidden", minHeight: 0, flex: 1, display: "flex", flexDirection: "column" }}
          >
            {children}
          </motion.div>
        ) : (
          <motion.div
            key="resumo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="painel-resumo"
            style={{ padding: paddingResumo }}
          >
            {resumo}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/ui/Painel.tsx
git commit -m "feat(ui): componente Painel generico com collapse e popover de info"
```

---

## Task 5: Lógica pura dos resumos por painel

**Files:**
- Create: `demo/src/ui/resumosPainel.ts`
- Test: `demo/src/ui/resumosPainel.test.ts`

**Interfaces:**
- Produces: `resumirEstacoes`, `resumirAgentes`, `resumirAlertas`, `contarBloqueados`, `moduloAtivoRecente` — usados pelas Tasks 6, 7, 8 e 10.

- [ ] **Step 1: Escrever os testes (ainda falhando)**

```ts
// demo/src/ui/resumosPainel.test.ts
import { describe, expect, it } from "vitest";
import {
  contarBloqueados,
  moduloAtivoRecente,
  resumirAgentes,
  resumirAlertas,
  resumirEstacoes,
} from "./resumosPainel";

describe("resumirEstacoes", () => {
  it("conta operantes e silenciosas separadamente", () => {
    const estacoes = [
      { situacao: "operante" as const },
      { situacao: "operante" as const },
      { situacao: "silenciosa" as const },
      { situacao: "degradada" as const },
    ];
    expect(resumirEstacoes(estacoes)).toEqual({ operantes: 2, silenciosas: 1 });
  });

  it("retorna zeros para lista vazia", () => {
    expect(resumirEstacoes([])).toEqual({ operantes: 0, silenciosas: 0 });
  });
});

describe("resumirAgentes", () => {
  it("agrupa trabalhando+alerta, bloqueado+falha e ociosos", () => {
    const agentes = [
      { status: "trabalhando" as const },
      { status: "alerta" as const },
      { status: "bloqueado" as const },
      { status: "falha" as const },
      { status: "ocioso" as const },
      { status: "ocioso" as const },
    ];
    expect(resumirAgentes(agentes)).toEqual({ trabalhando: 2, bloqueado: 2, ociosos: 2 });
  });
});

describe("resumirAlertas", () => {
  it("conta candidatos como aguardando validacao e expedido+atualizado como expedidos", () => {
    const alertas = [
      { estado: "candidato" as const },
      { estado: "candidato" as const },
      { estado: "expedido" as const },
      { estado: "atualizado" as const },
      { estado: "encerrado" as const },
    ];
    expect(resumirAlertas(alertas)).toEqual({ aguardandoValidacao: 2, expedidos: 2 });
  });
});

describe("contarBloqueados", () => {
  it("conta somente status bloqueado, nao falha", () => {
    const agentes = [{ status: "bloqueado" as const }, { status: "falha" as const }];
    expect(contarBloqueados(agentes)).toBe(1);
  });
});

describe("moduloAtivoRecente", () => {
  it("retorna o modulo do agente que publicou o evento mais recente", () => {
    const eventos = [{ agenteId: "agente-limiar" }];
    const agentes = [
      { id: "agente-limiar", modulo: "ALT" as const },
      { id: "agente-rede", modulo: "NET" as const },
    ];
    expect(moduloAtivoRecente(eventos, agentes)).toBe("ALT");
  });

  it("retorna null quando nao ha eventos recentes", () => {
    expect(moduloAtivoRecente([], [])).toBeNull();
  });

  it("retorna null quando o agente do evento nao e encontrado", () => {
    expect(moduloAtivoRecente([{ agenteId: "desconhecido" }], [])).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/ui/resumosPainel.test.ts`
Expected: FAIL — `Cannot find module './resumosPainel'`.

- [ ] **Step 3: Implementar `resumosPainel.ts`**

```ts
// demo/src/ui/resumosPainel.ts
import type { Agente, ModuloAgente, StatusAgente } from "@/agentes/tipos";
import type { EstadoAlerta, SituacaoEstacao } from "@/dominio/tipos";
import type { Evento } from "@/simulacao/barramento";

export interface ResumoEstacoes {
  readonly operantes: number;
  readonly silenciosas: number;
}

export function resumirEstacoes(
  estacoes: readonly { situacao: SituacaoEstacao }[],
): ResumoEstacoes {
  return {
    operantes: estacoes.filter((e) => e.situacao === "operante").length,
    silenciosas: estacoes.filter((e) => e.situacao === "silenciosa").length,
  };
}

export interface ResumoAgentes {
  readonly trabalhando: number;
  readonly bloqueado: number;
  readonly ociosos: number;
}

export function resumirAgentes(agentes: readonly { status: StatusAgente }[]): ResumoAgentes {
  return {
    trabalhando: agentes.filter((a) => a.status === "trabalhando" || a.status === "alerta").length,
    bloqueado: agentes.filter((a) => a.status === "bloqueado" || a.status === "falha").length,
    ociosos: agentes.filter((a) => a.status === "ocioso").length,
  };
}

export interface ResumoAlertas {
  readonly aguardandoValidacao: number;
  readonly expedidos: number;
}

export function resumirAlertas(alertas: readonly { estado: EstadoAlerta }[]): ResumoAlertas {
  return {
    aguardandoValidacao: alertas.filter((a) => a.estado === "candidato").length,
    expedidos: alertas.filter((a) => a.estado === "expedido" || a.estado === "atualizado").length,
  };
}

export function contarBloqueados(agentes: readonly { status: StatusAgente }[]): number {
  return agentes.filter((a) => a.status === "bloqueado").length;
}

/** Modulo do agente que publicou o evento mais recente, ou null se nao houver nenhum. */
export function moduloAtivoRecente(
  eventosRecentes: readonly Pick<Evento, "agenteId">[],
  agentes: readonly Pick<Agente, "id" | "modulo">[],
): ModuloAgente | null {
  const ultimo = eventosRecentes[0];
  if (!ultimo) return null;
  return agentes.find((a) => a.id === ultimo.agenteId)?.modulo ?? null;
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/ui/resumosPainel.test.ts`
Expected: PASS (9 testes).

- [ ] **Step 5: Commit**

```bash
git add src/ui/resumosPainel.ts src/ui/resumosPainel.test.ts
git commit -m "feat(ui): logica pura dos resumos exibidos quando um painel esta colapsado"
```

---

## Task 6: Integrar `<Painel>` em Saúde da Rede

**Files:**
- Modify: `demo/src/ui/PainelSaudeRede.tsx`

**Interfaces:**
- Consumes: `Painel` (Task 4), `resumirEstacoes` (Task 5).

- [ ] **Step 1: Substituir o conteúdo de `PainelSaudeRede.tsx`**

```tsx
import { useState } from "react";
import { useSimulacao } from "@/estado/store";
import type { SituacaoEstacao } from "@/dominio/tipos";
import Painel from "./Painel";
import { resumirEstacoes } from "./resumosPainel";

const COR: Record<SituacaoEstacao, string> = {
  operante: "var(--cor-ok)",
  degradada: "var(--cor-atencao)",
  silenciosa: "var(--cor-critica)",
  desativada: "var(--cor-texto-fraco)",
};

export default function PainelSaudeRede() {
  const motor = useSimulacao((s) => s.motor);
  useSimulacao((s) => s.versao);
  const [aberto, setAberto] = useState(true);

  const estacoes = motor.estado.estacoes;
  const { operantes, silenciosas } = resumirEstacoes(estacoes);

  return (
    <Painel
      titulo="Saude da rede de observacao"
      aberto={aberto}
      aoAlternar={() => setAberto((v) => !v)}
      info={
        <>
          Cada bloco e uma estacao de monitoramento. <b style={{ color: "var(--cor-ok)" }}>Verde</b> = transmitindo
          normalmente. <b style={{ color: "var(--cor-critica)" }}>Vermelho pulsante</b> = sem leitura ha mais de 3
          periodos (silenciosa). Passe o mouse sobre um bloco para ver o nome da estacao e a situacao atual.
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 5 }}>
        {estacoes.map((estacao) => (
          <div
            key={estacao.estacaoId}
            title={`${estacao.nome} — ${estacao.situacao}`}
            className={estacao.situacao === "silenciosa" ? "pulsando" : undefined}
            style={{
              height: 22,
              borderRadius: 5,
              background: COR[estacao.situacao],
              opacity: estacao.situacao === "operante" ? 0.75 : 1,
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: 11, color: "var(--cor-texto-fraco)", marginTop: "var(--espaco-3)" }}>
        Cada bloco e uma estacao. Vermelho pulsante = silenciosa ha mais de 3 periodos.
      </p>
    </Painel>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/ui/PainelSaudeRede.tsx
git commit -m "feat(ui): saude da rede ganha collapse, resumo e botao de info"
```

---

## Task 7: Integrar `<Painel>` em Agentes Especialistas

**Files:**
- Modify: `demo/src/ui/PainelAgentes.tsx`

**Interfaces:**
- Consumes: `Painel` (Task 4), `resumirAgentes` (Task 5).

- [ ] **Step 1: Substituir o conteúdo de `PainelAgentes.tsx`**

```tsx
import { useState } from "react";
import type { StatusAgente } from "@/agentes/tipos";
import { useSimulacao } from "@/estado/store";
import Painel from "./Painel";
import { resumirAgentes } from "./resumosPainel";

const COR: Record<StatusAgente, string> = {
  ocioso: "var(--cor-texto-fraco)",
  trabalhando: "var(--cor-acento)",
  alerta: "var(--cor-alta)",
  bloqueado: "var(--cor-critica)",
  falha: "var(--cor-critica)",
};

export default function PainelAgentes() {
  const motor = useSimulacao((s) => s.motor);
  useSimulacao((s) => s.versao);
  const [aberto, setAberto] = useState(true);

  const agentes = motor.agentes;
  const { trabalhando, bloqueado, ociosos } = resumirAgentes(agentes);

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
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
        {agentes.map((agente) => (
          <li
            key={agente.id}
            style={{
              display: "grid",
              gridTemplateColumns: "8px 1fr auto",
              gap: 9,
              alignItems: "center",
              padding: "6px 8px",
              borderRadius: 8,
              background: "var(--superficie-fraca)",
            }}
            title={agente.descricao}
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
            <span style={{ fontFamily: "var(--fonte-mono)", fontSize: 10, color: "var(--cor-texto-fraco)" }}>
              {agente.contadorTrabalho}
            </span>
          </li>
        ))}
      </ul>
    </Painel>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/ui/PainelAgentes.tsx
git commit -m "feat(ui): agentes especialistas ganha collapse e resumo"
```

---

## Task 8: Integrar `<Painel>` em Fila de Alertas

**Files:**
- Modify: `demo/src/ui/FilaAlertas.tsx`

**Interfaces:**
- Consumes: `Painel` (Task 4), `resumirAlertas` (Task 5). `CartaoAlerta` (função interna do arquivo) não muda.

- [ ] **Step 1: Adicionar os novos imports no topo de `FilaAlertas.tsx`**

```diff
 import { useState } from "react";
 import { motion, AnimatePresence } from "motion/react";
 import { useShallow } from "zustand/react/shallow";
 import type { Alerta, Severidade } from "@/dominio/tipos";
 import { selecionarAlertasAtivos, useSimulacao } from "@/estado/store";
+import Painel from "./Painel";
+import { resumirAlertas } from "./resumosPainel";
```

- [ ] **Step 2: Substituir a função `FilaAlertas` (mantendo `CartaoAlerta` intacta)**

```tsx
export default function FilaAlertas() {
  // useShallow evita o loop de renderizacao infinito do useSyncExternalStore:
  // selecionarAlertasAtivos cria um array novo a cada chamada, e sem cache
  // por igualdade rasa o React nunca considera o snapshot estavel.
  const alertas = useSimulacao(useShallow(selecionarAlertasAtivos));
  useSimulacao((s) => s.versao);
  const [aberto, setAberto] = useState(true);

  const visiveis = alertas.filter((a) => a.estado !== "encerrado" && a.estado !== "descartado");
  const { aguardandoValidacao, expedidos } = resumirAlertas(alertas);

  return (
    <Painel
      titulo="Fila de alertas — decisao do plantao"
      aberto={aberto}
      aoAlternar={() => setAberto((v) => !v)}
      resumo={
        <>
          <span className="titulo-resumo">Fila de alertas</span>
          {aguardandoValidacao > 0 ? (
            <span className="chip pulsando" style={{ borderColor: "var(--sev-muito-alta)" }}>
              <span className="chip-ponto" style={{ background: "var(--sev-muito-alta)" }} />
              <b>{aguardandoValidacao}</b>&nbsp;aguardando validacao
            </span>
          ) : (
            <span className="chip">0 ativos</span>
          )}
          <span className="chip">
            <span className="chip-ponto" style={{ background: "var(--cor-ok)" }} />
            <b>{expedidos}</b>&nbsp;expedido{expedidos !== 1 ? "s" : ""}
          </span>
        </>
      }
    >
      {visiveis.length === 0 ? (
        <p style={{ fontSize: 11.5, color: "var(--cor-texto-fraco)" }}>
          Nenhum alerta ativo. Os agentes seguem monitorando.
        </p>
      ) : (
        <ul style={{ margin: 0, padding: 0, display: "grid", gap: "var(--espaco-3)" }}>
          <AnimatePresence initial={false}>
            {visiveis.map((alerta) => (
              <CartaoAlerta key={alerta.alertaId} alerta={alerta} />
            ))}
          </AnimatePresence>
        </ul>
      )}

      <p style={{ fontSize: 10, color: "var(--cor-texto-fraco)", marginTop: "var(--espaco-4)" }}>
        Nenhum alerta e expedido sem esta validacao. O agente de expedicao permanece
        bloqueado ate um operador identificado decidir (RNF-18).
      </p>
    </Painel>
  );
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Rodar a suíte de testes completa (regressão do RNF-18)**

Run: `npm test`
Expected: PASS — `store.test.ts` continua validando `validarAlerta`/`descartarAlerta` sem alteração de comportamento.

- [ ] **Step 5: Commit**

```bash
git add src/ui/FilaAlertas.tsx
git commit -m "feat(ui): fila de alertas ganha collapse com chip pulsante de pendencias"
```

---

## Task 9: Integrar `<Painel>` em Trilha de Auditoria

**Files:**
- Modify: `demo/src/ui/TrilhaAuditoria.tsx`

**Interfaces:**
- Consumes: `Painel` (Task 4).

- [ ] **Step 1: Substituir o conteúdo de `TrilhaAuditoria.tsx`**

```tsx
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { selecionarEventosRecentes, useSimulacao } from "@/estado/store";
import type { TipoEvento } from "@/simulacao/barramento";
import Painel from "./Painel";

const COR: Partial<Record<TipoEvento, string>> = {
  "leitura.reprovada": "var(--cor-atencao)",
  "estacao.silenciosa": "var(--cor-critica)",
  "limiar.atingido": "var(--cor-alta)",
  "alerta.criado": "var(--cor-alta)",
  "expedicao.bloqueada": "var(--cor-critica)",
  "alerta.validado": "var(--cor-ok)",
  "alerta.expedido": "var(--cor-ok)",
  "alerta.encerrado": "var(--cor-ok)",
  "boletim.aprovado": "var(--cor-ok)",
  "mancha.gerada": "var(--cor-acento)",
};

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TrilhaAuditoria() {
  const motor = useSimulacao((s) => s.motor);
  // useShallow evita o loop de renderizacao infinito do useSyncExternalStore:
  // selecionarEventosRecentes cria um array novo a cada chamada, e sem cache
  // por igualdade rasa o React nunca considera o snapshot estavel.
  const eventos = useSimulacao(useShallow((s) => selecionarEventosRecentes(s, 40)));
  useSimulacao((s) => s.versao);
  const [aberto, setAberto] = useState(true);

  const totalEventos = motor.barramento.historico().length;
  const ultimo = eventos[0];

  return (
    <Painel
      titulo="Trilha de auditoria (RF-GOV-02)"
      aberto={aberto}
      aoAlternar={() => setAberto((v) => !v)}
      resumo={
        <>
          <span className="titulo-resumo">Trilha de auditoria</span>
          <span className="chip">
            <b>{totalEventos}</b>&nbsp;eventos
          </span>
          {ultimo ? (
            <span
              style={{
                fontSize: 11,
                color: COR[ultimo.tipo] ?? "var(--cor-texto)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {"●"} ultimo: {ultimo.titulo}
            </span>
          ) : null}
          {ultimo ? (
            <span
              style={{
                fontSize: 10,
                color: "var(--cor-texto-fraco)",
                fontFamily: "var(--fonte-mono)",
                marginLeft: "auto",
              }}
            >
              {hora(ultimo.ts)}
            </span>
          ) : null}
        </>
      }
    >
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 5 }}>
        {eventos.map((evento) => (
          <li
            key={evento.eventoId}
            style={{
              display: "grid",
              gridTemplateColumns: "42px 1fr",
              gap: 8,
              fontSize: 10.5,
              paddingBottom: 5,
              borderBottom: "1px solid var(--divisor-fraco)",
            }}
          >
            <span style={{ fontFamily: "var(--fonte-mono)", color: "var(--cor-texto-fraco)" }}>
              {hora(evento.ts)}
            </span>
            <span>
              <span style={{ color: COR[evento.tipo] ?? "var(--cor-texto)" }}>{evento.titulo}</span>
              <span style={{ display: "block", color: "var(--cor-texto-fraco)", fontSize: 9.5 }}>
                {evento.agenteId}
                {evento.correlacaoId ? ` · ${evento.correlacaoId}` : ""}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </Painel>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/ui/TrilhaAuditoria.tsx
git commit -m "feat(ui): trilha de auditoria ganha collapse com resumo em formato ticker"
```

---

## Task 10: Renomear e integrar `<Painel>` em Fluxo do Dado (ex-Enxame de agentes)

**Files:**
- Modify: `demo/src/ui/GrafoAgentes.tsx`

**Interfaces:**
- Consumes: `Painel` (Task 4, com `comPadding={false}` e `estiloSecao`), `contarBloqueados` e `moduloAtivoRecente` (Task 5).
- Nenhuma mudança em `grafo.ts` ou `nosDoGrafo.tsx` além do comentário da Task 2 — nós, arestas, layout e cores do canvas ficam exatamente como estão.

- [ ] **Step 1: Substituir o conteúdo de `GrafoAgentes.tsx`**

```tsx
import { useMemo, useState } from "react";
import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useShallow } from "zustand/react/shallow";
import { selecionarEventosRecentes, useSimulacao } from "@/estado/store";
import { arestasAtivas, chaveAresta, LIGACOES, posicaoDoAgente } from "./grafo";
import { TIPOS_DE_NO, type DadosNoAgente } from "./nosDoGrafo";
import Painel from "./Painel";
import { contarBloqueados, moduloAtivoRecente } from "./resumosPainel";

const SEQUENCIA_MODULOS = ["ING", "NET", "MOD", "ALT", "LLM", "EXP", "GOV"] as const;

export default function GrafoAgentes() {
  const motor = useSimulacao((s) => s.motor);
  const versao = useSimulacao((s) => s.versao);
  // useShallow evita o loop de renderizacao infinito do useSyncExternalStore:
  // o seletor cria um array novo a cada chamada, e sem cache por igualdade
  // rasa o React nunca considera o snapshot estavel (RNF-06 correcao de bug).
  const eventos = useSimulacao(useShallow((s) => selecionarEventosRecentes(s, 14)));
  const [aberto, setAberto] = useState(true);

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
        // As cores do canvas (aresta inativa, fundo pontilhado) sao fixas de
        // proposito: o usuario pediu para nao mudar a aparencia deste
        // conteudo sem avisar antes, entao elas nao viram tokens de tema
        // nesta Fundacao (ver plano/spec do redesenho de UI, subprojeto
        // "Fluxo do dado").
        style: {
          stroke: ativa ? "rgba(56,189,248,0.95)" : "rgba(255,255,255,0.14)",
          strokeWidth: ativa ? 2 : 1,
        },
      };
    });
  }, [eventos]);

  const moduloAtivo = moduloAtivoRecente(eventos, motor.agentes);
  const bloqueados = contarBloqueados(motor.agentes);

  return (
    <Painel
      titulo="Fluxo do dado"
      aberto={aberto}
      aoAlternar={() => setAberto((v) => !v)}
      comPadding={false}
      estiloSecao={aberto ? { height: 305 } : undefined}
      info={
        <>
          Cada no e um agente especialista; a coluna indica seu modulo (ING, NET, MOD, ALT, LLM, EXP, GOV). Uma
          aresta acende quando um agente acabou de publicar um evento para o proximo. No vermelho pulsante =
          bloqueado aguardando decisao humana (RNF-18).
        </>
      }
      resumo={
        <>
          <span className="titulo-resumo">Fluxo do dado</span>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            {SEQUENCIA_MODULOS.map((modulo, i) => (
              <span key={modulo} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span
                  className="chip"
                  style={
                    modulo === moduloAtivo
                      ? { background: "rgba(56,189,248,0.22)", borderColor: "var(--cor-acento)", color: "#fff" }
                      : undefined
                  }
                >
                  {modulo}
                </span>
                {i < SEQUENCIA_MODULOS.length - 1 ? (
                  <span style={{ color: "var(--cor-texto-fraco)", fontSize: 10 }}>{"→"}</span>
                ) : null}
              </span>
            ))}
          </div>
          {bloqueados > 0 ? (
            <span className="chip" style={{ marginLeft: "auto" }}>
              <b>{bloqueados}</b>&nbsp;bloqueado{bloqueados > 1 ? "s" : ""}
            </span>
          ) : null}
        </>
      }
    >
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
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
          <Background color="rgba(255,255,255,0.07)" gap={22} />
          <Controls />
        </ReactFlow>
      </div>
    </Painel>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Rodar `grafo.test.ts` (garantir que a lógica pura do grafo não foi tocada)**

Run: `npx vitest run src/ui/grafo.test.ts`
Expected: PASS — nenhuma mudança em `grafo.ts`, então os testes existentes continuam passando inalterados.

- [ ] **Step 4: Commit**

```bash
git add src/ui/GrafoAgentes.tsx
git commit -m "feat(ui): renomeia para Fluxo do dado e adiciona collapse/info sem tocar no canvas"
```

---

## Task 11: Ajustar `App.tsx` para o novo Fluxo do Dado

**Files:**
- Modify: `demo/src/App.tsx`

**Interfaces:**
- Consumes: `GrafoAgentes` agora controla sua própria altura via `estiloSecao` (Task 10) e todo `<Painel>` já se auto-limita com `alignSelf: "start"` (Task 4) — nenhum outro painel precisa de ajuste no grid.

- [ ] **Step 1: Remover a altura fixa do wrapper do Fluxo do Dado**

```diff
-            <div style={{ pointerEvents: "auto", height: 305 }}>
+            <div style={{ pointerEvents: "auto" }}>
               <GrafoAgentes />
             </div>
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "fix(ui): remove altura fixa do wrapper do Fluxo do Dado, agora controlada pelo Painel"
```

---

## Task 12: Seletor puro de notificações

**Files:**
- Create: `demo/src/ui/notificacoes.ts`
- Test: `demo/src/ui/notificacoes.test.ts`

**Interfaces:**
- Produces: `TIPOS_NOTIFICAVEIS: readonly TipoEvento[]`, `filtrarNotificacoes(eventos, tipos?): Evento[]` — usado por `Cabecalho.tsx` (Task 13).

- [ ] **Step 1: Escrever os testes (ainda falhando)**

```ts
// demo/src/ui/notificacoes.test.ts
import { describe, expect, it } from "vitest";
import { filtrarNotificacoes, TIPOS_NOTIFICAVEIS } from "./notificacoes";
import type { Evento } from "@/simulacao/barramento";

function evento(tipo: Evento["tipo"], eventoId: string): Evento {
  return { eventoId, tipo, agenteId: "agente-x", ts: "2026-01-01T00:00:00Z", titulo: tipo, carga: null };
}

describe("filtrarNotificacoes", () => {
  it("mantem apenas os tipos notificaveis por padrao", () => {
    const eventos = [
      evento("alerta.criado", "1"),
      evento("leitura.ingerida", "2"),
      evento("estacao.silenciosa", "3"),
    ];
    const resultado = filtrarNotificacoes(eventos);
    expect(resultado.map((e) => e.eventoId)).toEqual(["1", "3"]);
  });

  it("aceita uma lista customizada de tipos", () => {
    const eventos = [evento("boletim.aprovado", "1"), evento("alerta.criado", "2")];
    const resultado = filtrarNotificacoes(eventos, ["boletim.aprovado"]);
    expect(resultado.map((e) => e.eventoId)).toEqual(["1"]);
  });

  it("retorna lista vazia quando nada corresponde", () => {
    expect(filtrarNotificacoes([evento("leitura.ingerida", "1")])).toEqual([]);
  });

  it("TIPOS_NOTIFICAVEIS inclui os tipos criticos para o operador", () => {
    expect(TIPOS_NOTIFICAVEIS).toContain("alerta.expedido");
    expect(TIPOS_NOTIFICAVEIS).toContain("expedicao.bloqueada");
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/ui/notificacoes.test.ts`
Expected: FAIL — `Cannot find module './notificacoes'`.

- [ ] **Step 3: Implementar `notificacoes.ts`**

```ts
// demo/src/ui/notificacoes.ts
import type { Evento, TipoEvento } from "@/simulacao/barramento";

/** Tipos de evento relevantes para o operador no popover de notificacoes da barra superior. */
export const TIPOS_NOTIFICAVEIS: readonly TipoEvento[] = [
  "alerta.criado",
  "alerta.expedido",
  "estacao.silenciosa",
  "expedicao.bloqueada",
];

export function filtrarNotificacoes(
  eventos: readonly Evento[],
  tipos: readonly TipoEvento[] = TIPOS_NOTIFICAVEIS,
): Evento[] {
  const permitidos = new Set(tipos);
  return eventos.filter((e) => permitidos.has(e.tipo));
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/ui/notificacoes.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/ui/notificacoes.ts src/ui/notificacoes.test.ts
git commit -m "feat(ui): seletor puro para o popover de notificacoes da barra superior"
```

---

## Task 13: Redesenhar `Cabecalho.tsx` (Opção A)

**Files:**
- Modify: `demo/src/ui/Cabecalho.tsx`

**Interfaces:**
- Consumes: `alternarTema`, `lerTemaSalvo`, `salvarTema`, `aplicarTemaNoElemento`, `type Tema` (Task 1); `filtrarNotificacoes` (Task 12); `OPERADOR_DEMO`, `selecionarEventosRecentes`, `VELOCIDADES` (já existentes em `store.ts`); `descreverModo` (já existente em `mapa/config.ts`); classes `.cabecalho-*` (Task 3).

- [ ] **Step 1: Substituir o conteúdo de `Cabecalho.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { CENARIOS } from "@/simulacao/cenarios";
import { OPERADOR_DEMO, selecionarEventosRecentes, useSimulacao, VELOCIDADES } from "@/estado/store";
import { descreverModo } from "@/mapa/config";
import { alternarTema, aplicarTemaNoElemento, lerTemaSalvo, salvarTema, type Tema } from "@/estado/tema";
import { filtrarNotificacoes } from "./notificacoes";

function horaLocal(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function horaCurta(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function iniciais(nome: string): string {
  return nome
    .split(".")
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

type Menu = "cenario" | "notificacoes" | "perfil" | null;

export default function Cabecalho() {
  const { motor, cenarioId, rodando, velocidadeIndice, portalAutenticado } = useSimulacao();
  const { alternarExecucao, definirVelocidade, trocarCenario, passo } = useSimulacao();
  useSimulacao((s) => s.versao);
  const eventosRecentes = useSimulacao(useShallow((s) => selecionarEventosRecentes(s, 40)));

  const [tema, setTema] = useState<Tema>(() => lerTemaSalvo(localStorage));
  const [menuAberto, setMenuAberto] = useState<Menu>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    aplicarTemaNoElemento(document.documentElement, tema);
  }, [tema]);

  useEffect(() => {
    if (!menuAberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(null);
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuAberto(null);
    }
    window.addEventListener("mousedown", aoClicarFora);
    window.addEventListener("keydown", aoTeclar);
    return () => {
      window.removeEventListener("mousedown", aoClicarFora);
      window.removeEventListener("keydown", aoTeclar);
    };
  }, [menuAberto]);

  function aoAlternarTema() {
    setTema((atual) => {
      const proximo = alternarTema(atual);
      salvarTema(localStorage, proximo);
      return proximo;
    });
  }

  const cenario = CENARIOS.find((c) => c.id === cenarioId);
  const notificacoes = filtrarNotificacoes(eventosRecentes).slice(0, 8);

  return (
    <header
      className="vidro-forte"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--espaco-3)",
        padding: "0 var(--espaco-4)",
        margin: "var(--espaco-3)",
        height: 56,
      }}
    >
      <div style={{ whiteSpace: "nowrap", lineHeight: 1.3 }}>
        <div style={{ fontWeight: 700, letterSpacing: "0.02em" }}>Sala de Situacao</div>
        <div style={{ fontSize: 10, color: "var(--cor-texto-fraco)", letterSpacing: "0.04em" }}>
          ALERTA DE CHEIAS
        </div>
      </div>

      <div className="cabecalho-separador" />

      <button
        type="button"
        className="botao-icone"
        style={{ width: 30, height: 30, fontSize: 13 }}
        aria-label={rodando ? "Pausar" : "Executar"}
        onClick={alternarExecucao}
      >
        {rodando ? "⏸" : "▶"}
      </button>
      <button className="botao" onClick={passo} disabled={rodando} style={{ padding: "5px 10px", fontSize: 11.5 }}>
        Passo
      </button>
      <button
        type="button"
        className="cabecalho-pill"
        onClick={() => definirVelocidade((velocidadeIndice + 1) % VELOCIDADES.length)}
        aria-label="Alternar velocidade da simulacao"
      >
        {VELOCIDADES.map((v, i) => (
          <span
            key={v.rotulo}
            style={
              i === velocidadeIndice
                ? { fontWeight: 700, color: "var(--cor-texto)" }
                : { color: "var(--cor-texto-fraco)" }
            }
          >
            {v.rotulo}
            {i < VELOCIDADES.length - 1 ? " · " : ""}
          </span>
        ))}
      </button>

      <div ref={menuAberto === "cenario" ? menuRef : undefined} style={{ position: "relative" }}>
        <button
          type="button"
          className="cabecalho-pill"
          onClick={() => setMenuAberto((m) => (m === "cenario" ? null : "cenario"))}
          aria-expanded={menuAberto === "cenario"}
        >
          {cenario?.nome ?? "Cenario"} {"▾"}
        </button>
        {menuAberto === "cenario" ? (
          <div className="cabecalho-popover">
            {CENARIOS.map((c) => (
              <button
                key={c.id}
                type="button"
                className="botao"
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  marginBottom: 6,
                  borderColor: c.id === cenarioId ? "var(--cor-acento)" : undefined,
                }}
                onClick={() => {
                  trocarCenario(c.id);
                  setMenuAberto(null);
                }}
              >
                {c.nome}
              </button>
            ))}
            {cenario ? (
              <p style={{ fontSize: 10, color: "var(--cor-texto-fraco)", margin: "6px 0 0" }}>
                Requisitos em foco: {cenario.requisitosDestacados.join(" · ")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="cabecalho-separador" />

      <div
        style={{ fontFamily: "var(--fonte-mono)", fontSize: 18, fontVariantNumeric: "tabular-nums" }}
        aria-label="Horario simulado"
      >
        {horaLocal(motor.relogio.iso)}
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <span className="cabecalho-status" title="Nenhum dado real e usado nesta demonstracao">
          DADOS SIMULADOS
        </span>

        <div ref={menuAberto === "notificacoes" ? menuRef : undefined} style={{ position: "relative" }}>
          <button
            type="button"
            className="botao-icone"
            style={{ width: 30, height: 30, fontSize: 14, position: "relative" }}
            aria-label="Notificacoes"
            aria-expanded={menuAberto === "notificacoes"}
            onClick={() => setMenuAberto((m) => (m === "notificacoes" ? null : "notificacoes"))}
          >
            {"🔔"}
            {notificacoes.length > 0 ? <span className="cabecalho-badge" /> : null}
          </button>
          {menuAberto === "notificacoes" ? (
            <div className="cabecalho-popover">
              {notificacoes.length === 0 ? (
                <p style={{ fontSize: 11, color: "var(--cor-texto-fraco)", margin: 0 }}>
                  Nenhuma notificacao recente.
                </p>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
                  {notificacoes.map((n) => (
                    <li key={n.eventoId} style={{ fontSize: 11 }}>
                      <span
                        style={{ fontFamily: "var(--fonte-mono)", color: "var(--cor-texto-fraco)", marginRight: 6 }}
                      >
                        {horaCurta(n.ts)}
                      </span>
                      {n.titulo}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="botao-icone"
          style={{ width: 30, height: 30, fontSize: 14 }}
          aria-label={tema === "escuro" ? "Mudar para tema claro" : "Mudar para tema escuro"}
          onClick={aoAlternarTema}
        >
          {tema === "escuro" ? "☀" : "☽"}
        </button>

        <div className="cabecalho-separador" />

        <div ref={menuAberto === "perfil" ? menuRef : undefined} style={{ position: "relative" }}>
          <button
            type="button"
            className="cabecalho-pill"
            style={{ paddingLeft: 6 }}
            onClick={() => setMenuAberto((m) => (m === "perfil" ? null : "perfil"))}
            aria-expanded={menuAberto === "perfil"}
          >
            <span className="cabecalho-avatar">{iniciais(OPERADOR_DEMO)}</span>
            {OPERADOR_DEMO}
            <span style={{ color: "var(--cor-texto-fraco)" }}>{"▾"}</span>
          </button>
          {menuAberto === "perfil" ? (
            <div className="cabecalho-popover" style={{ width: 260 }}>
              <p style={{ fontSize: 11.5, margin: "0 0 6px", fontWeight: 600 }}>{OPERADOR_DEMO}</p>
              <p style={{ fontSize: 10.5, color: "var(--cor-texto-fraco)", margin: 0 }}>
                {descreverModo(portalAutenticado)}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/ui/Cabecalho.tsx
git commit -m "feat(ui): redesenha a barra superior — sem marca H1, com tema/notificacoes/perfil"
```

---

## Task 14: Ensaio manual final e regressão

**Files:** nenhum (apenas verificação — nenhum código novo é esperado a menos que o ensaio encontre um problema real, caso em que a correção deve ser um commit adicional descrevendo o que foi corrigido).

- [ ] **Step 1: Rodar a suíte completa**

Run: `npm run verificar`
Expected: PASS — todos os testes (`tema.test.ts`, `resumosPainel.test.ts`, `notificacoes.test.ts` incluídos), `tsc --noEmit` sem erros, `vite build` sem erros.

- [ ] **Step 2: Iniciar o servidor de desenvolvimento**

Run: `npm run dev` (em background)

- [ ] **Step 3: Abrir a aplicação no navegador e rodar o checklist de ensaio**

Verificar, com a simulação rodando em pelo menos um cenário com alertas (ex.: "convectiva"):

1. Barra superior: nome "Sala de Situação — Alerta de Cheias" visível, sem qualquer menção a "H1"; todos os controles (executar/pausar, passo, velocidade, cenário, relógio, status, notificações, tema, perfil) alinhados na mesma linha de 56px.
2. Botão de tema alterna a paleta inteira (fundo, texto, bordas, vidro dos 5 painéis e do cabeçalho) sem afetar as cores de severidade no mapa nem no grafo; recarregar a página mantém o tema escolhido (persistência via `localStorage`).
3. Cada um dos 5 painéis (Saúde da Rede, Agentes Especialistas, Fila de Alertas, Trilha de Auditoria, Fluxo do Dado) colapsa e expande corretamente; o resumo colapsado mostra números condizentes com o conteúdo expandido.
4. Fila de Alertas: gerar um alerta (avançar o cenário "convectiva" até surgir um candidato) e confirmar que o chip vermelho pulsante "N aguardando validação" aparece colapsado e desaparece após validar/descartar todos os pendentes.
5. Trilha de Auditoria: o "ticker" colapsado mostra o mesmo evento mais recente e a mesma cor que a lista expandida.
6. Fluxo do Dado: renomeado para "Fluxo do dado"; canvas do React Flow (nós, arestas, posições, cores) idêntico ao comportamento anterior; collapse funciona; botão de info explica nós/arestas/bloqueio.
7. Botão de informação em Saúde da Rede e Fluxo do Dado abre/fecha ao clicar e ao pressionar Escape, e fecha ao clicar fora.
8. Notificações: o popover da barra superior lista eventos recentes (`alerta.criado`, `alerta.expedido`, `estacao.silenciosa`, `expedicao.bloqueada`) com badge vermelho quando há itens.
9. **RNF-18 (crítico):** com um alerta em estado "candidato", confirmar que ele NÃO é expedido automaticamente — só após clicar "Validar e expedir" no cartão dentro do painel expandido. Nenhum atalho de UI nova permite pular essa validação.
10. `prefers-reduced-motion: reduce` (emular no DevTools): as transições de collapse e os elementos pulsantes deixam de animar.

- [ ] **Step 4: Corrigir quaisquer divergências encontradas**

Se o ensaio revelar um problema, corrigi-lo com um commit específico descrevendo o problema e a correção (não silenciosamente dentro deste texto de plano).

- [ ] **Step 5: Parar o servidor de desenvolvimento**

Encerrar o processo do `npm run dev` iniciado no Step 2.
