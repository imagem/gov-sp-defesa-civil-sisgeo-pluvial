# Reformulação de layout da Sala de Situação — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestruturar a demo H1 em três páginas (Operacional, Agentes & Fluxo, Alertas & Deliberações), corrigir os defeitos de layout/terminologia e adicionar controles de mapa e feedback de alerta.

**Architecture:** SPA sem router — a página ativa é estado no store e o `App` renderiza a vista correspondente sobre um mapa sempre montado. Lógica de apresentação (textos, descrição didática de agentes, linhas de deliberação, visibilidade de camadas) fica em módulos puros testáveis; os componentes React são verificados no navegador.

**Tech Stack:** React 19, Zustand, @arcgis/core 5, @xyflow/react, motion, Vite, Vitest, TypeScript.

**Spec:** [`docs/superpowers/specs/2026-09-29-reformulacao-layout-sala-situacao-design.md`](../specs/2026-09-29-reformulacao-layout-sala-situacao-design.md)

## Global Constraints

- Diretório de trabalho do projeto: `demo/`. Comandos rodam a partir de `demo/`.
- Português nos identificadores e na UI (convenção do repo). Testes com `describe/it` (vitest).
- Domínio puro (`src/dominio/`) não importa React/ArcGIS/rede; lógica de apresentação nova vai em `src/ui/*.ts` ou `src/estado/*.ts` puros.
- Portão de qualidade ao fim de cada task: `npx vitest run`, `npx tsc --noEmit` e `npx vite build` verdes. Único erro de console tolerado no navegador: `Basemap AbortError` (StrictMode em dev).
- Mira de tela ~1600×900; não quebrar em larguras menores, mas sem exigir responsividade de telefone.
- Não adicionar dependências novas (sem `react-router`). Não alterar domínio/agentes/motor de simulação.
- Perfil do operador (copy exato): nome **Renata Vasques**, cargo **Coordenadora de Plantão**, codinome **SENTINELA-1**.
- Basemaps sem API key apenas: `osm` (Ruas), `satellite` (Satélite), `topo-vector` (Topográfico) — remover da UI qualquer um que não carregue sem credencial (verificar no navegador).

## Review Focus

- **Mapa coberto ainda captura cliques:** nas páginas Agentes/Alertas a superfície de conteúdo deve bloquear interação com o mapa; no Operacional o mapa segue clicável. (Task 3 — verificação no navegador.)
- **Popover de info aberto ao recolher painel:** recolher deve fechar o info em TODOS os painéis com info, sem "rachar" o cartão. (Task 6.)
- **Vazamento de jargão:** com modo técnico desligado, nenhum código `RF-…`/`H1` aparece nas telas padrão. (Task 1 fixa isso na fonte via `rotulo`; teste em `textos.test.ts`.)
- **Visibilidade de camada persiste:** desligar uma camada e depois avançar tick/trocar cenário mantém a camada desligada. (Task 15 — teste puro de `aplicarVisibilidade`; Task 16 — verificação no navegador.)
- **Deliberações de alertas descartados/encerrados:** o histórico inclui alertas descartados (com motivo) e encerrados, não só ativos. (Task 12 — `montarDeliberacoes.test.ts`.)

---

## Bloco 1 — Casca de navegação + terminologia

### Task 1: Módulo de textos operacionais (`textos.ts`)

**Files:**
- Create: `src/ui/textos.ts`
- Test: `src/ui/textos.test.ts`

**Interfaces:**
- Produces: `type ChaveTexto`; `interface Texto { readonly rotulo: string; readonly codigo?: string }`; `const TEXTOS: Record<ChaveTexto, Texto>`; `function rotulo(chave: ChaveTexto, modoTecnico: boolean): string`.

- [ ] **Step 1: Write the failing test** (`src/ui/textos.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { rotulo } from "./textos";

describe("rotulo", () => {
  it("usa o nome operacional quando o modo tecnico esta desligado", () => {
    expect(rotulo("auditoria", false)).toBe("Rastreabilidade da decisao");
  });
  it("anexa o codigo tecnico quando o modo tecnico esta ligado", () => {
    expect(rotulo("auditoria", true)).toBe("Rastreabilidade da decisao · RF-GOV-02");
  });
  it("nao anexa nada quando a chave nao tem codigo", () => {
    expect(rotulo("filaAlertas", true)).toBe(rotulo("filaAlertas", false));
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — Run: `npx vitest run src/ui/textos.test.ts` — Expected: FAIL (módulo ausente).

- [ ] **Step 3: Implement `textos.ts`** — Defina `ChaveTexto` (pelo menos: `auditoria`, `confiabilidade`, `filaAlertas`, `saudeRede`, `gemeoDigital`, `fluxoDado`, `agentes`, `operacional`, `alertas`), `TEXTOS` (auditoria → {rotulo:"Rastreabilidade da decisao", codigo:"RF-GOV-02"}; confiabilidade → {rotulo:"Confiabilidade do sistema"}; etc.) e `rotulo` que devolve `t.codigo && modoTecnico ? \`${t.rotulo} · ${t.codigo}\` : t.rotulo`.

- [ ] **Step 4: Run test to verify it passes** — Run: `npx vitest run src/ui/textos.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit** — `git add src/ui/textos.ts src/ui/textos.test.ts && git commit -m "feat: modulo de textos operacionais com modo tecnico"`

---

### Task 2: Estado de página e modo técnico no store

**Files:**
- Modify: `src/estado/store.ts` (interface `EstadoLoja`, initializer, ações)
- Test: `src/estado/store.test.ts`

**Interfaces:**
- Produces: `pagina: "operacional" | "agentes" | "alertas"` (default `"operacional"`); `irPara(p): void`; `modoTecnico: boolean` (default `false`); `alternarModoTecnico(): void`. Reexporta `type Pagina`.

- [ ] **Step 1: Write the failing test** — em `src/estado/store.test.ts`, testes: `irPara("agentes")` muda `pagina` para `"agentes"`; `alternarModoTecnico()` inverte `modoTecnico`. Use `useSimulacao.getState()` / `.getState().irPara(...)`.

- [ ] **Step 2: Run test to verify it fails** — Run: `npx vitest run src/estado/store.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement** — adicione os campos e ações ao `EstadoLoja` e ao initializer; `irPara(p)` → `set({ pagina: p })`; `alternarModoTecnico` → `set(s => ({ modoTecnico: !s.modoTecnico }))`. Exporte `export type Pagina`.

- [ ] **Step 4: Run test to verify it passes** — Run: `npx vitest run src/estado/store.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat: estado de pagina e modo tecnico no store"`

---

### Task 3: Casca de navegação e páginas (mover Agentes/Fluxo e Alertas)

**Files:**
- Create: `src/ui/Navegacao.tsx`, `src/ui/ResumoEnxame.tsx`, `src/ui/paginas/PaginaOperacional.tsx`, `src/ui/paginas/PaginaAgentes.tsx`, `src/ui/paginas/PaginaAlertas.tsx`
- Modify: `src/App.tsx`, `src/styles/componentes.css`

**Interfaces:**
- Consumes: `pagina`, `irPara`, `modoTecnico` (Task 2); `rotulo` (Task 1).
- Produces: `PaginaOperacional`/`PaginaAgentes`/`PaginaAlertas` (componentes sem props); `Navegacao` (sem props); `ResumoEnxame` (sem props).

- [ ] **Step 1: Implement páginas movendo os componentes existentes** — `PaginaOperacional` contém o grid atual do Operacional (mapa clicável ao fundo): coluna esquerda (Saúde da rede, Confiabilidade/Desempenho) + `ResumoEnxame`; centro (KPIs); direita (Fila de alertas, Rastreabilidade/Trilha, Gêmeo digital). `PaginaAgentes` contém `PainelAgentes` + `GrafoAgentes` (Fluxo do dado). `PaginaAlertas` é um placeholder de conteúdo por enquanto (título via `rotulo("alertas", modoTecnico)`), a ser preenchido na Task 14.

- [ ] **Step 2: Implement `ResumoEnxame`** — indicador compacto: "Enxame saudavel · N agentes ativos" (N = `motor.agentes.filter(a => a.status !== "falha").length`), botão que chama `irPara("agentes")`.

- [ ] **Step 3: Implement `Navegacao`** — três botões (Operacional / Agentes & Fluxo / Alertas & Deliberacoes), o ativo destacado, `onClick` → `irPara(...)`. Rótulos via `rotulo`.

- [ ] **Step 4: Rewire `App.tsx`** — manter `MapaSalaSituacao` sempre montado como fundo; renderizar `Cabecalho`, `Navegacao`, e a página conforme `pagina`. Páginas Agentes/Alertas cobrem o mapa com uma superfície `.vidro` opaca com `pointer-events: auto`; Operacional mantém `pointer-events` seletivo (mapa clicável). `ModalBoletim` continua no topo.

- [ ] **Step 5: Verify build/type** — Run: `npx tsc --noEmit && npx vite build` — Expected: sem erros.

- [ ] **Step 6: Verify no navegador** — `npm run dev`; confirmar: (a) as três abas trocam de página; (b) no Operacional o mapa recebe cliques (zoom) e os painéis funcionam; (c) em Agentes/Alertas o mapa fica coberto e NÃO recebe cliques; (d) sem novos erros de console além do `Basemap AbortError`.

- [ ] **Step 7: Commit** — `git commit -am "feat: casca de navegacao e paginas operacional/agentes/alertas"`

---

## Bloco 2 — Correções pontuais de layout

### Task 4: z-index dos popovers da barra superior + sino monocromático (itens 1, 2)

**Files:**
- Modify: `src/ui/Cabecalho.tsx`, `src/styles/componentes.css`

- [ ] **Step 1: Implement** — garantir que o `<header>` e os `.cabecalho-popover` fiquem em `z-index` acima das superfícies de painel (definir uma escala de z-index em `componentes.css`: mapa < painéis < cabeçalho < popovers < modal). Sino: remover cor do emoji — usar um ícone monocromático que herde `currentColor` (SVG inline ou máscara), mantendo o `.cabecalho-badge` para não-lidas.

- [ ] **Step 2: Verify build/type** — Run: `npx tsc --noEmit && npx vite build` — Expected: sem erros.

- [ ] **Step 3: Verify no navegador** — abrir os três menus do cabeçalho (cenário, notificações, perfil) no Operacional e confirmar que aparecem ACIMA dos painéis; sino monocromático.

- [ ] **Step 4: Commit** — `git commit -am "fix: popovers do cabecalho acima dos paineis e sino monocromatico"`

---

### Task 5: Perfil do operador — codinome e cargo (item 3)

**Files:**
- Modify: `src/estado/store.ts` (`OPERADOR_DEMO` e metadados), `src/ui/Cabecalho.tsx`
- Test: `src/estado/store.test.ts`

**Interfaces:**
- Produces: `OPERADOR_DEMO = "Renata Vasques"`; `const OPERADOR_CARGO = "Coordenadora de Plantao"`; `const OPERADOR_CODINOME = "SENTINELA-1"`.

- [ ] **Step 1: Write the failing test** — em `store.test.ts`, teste que ao validar um alerta o `operadorValidador` do alerta passa a ser `"Renata Vasques"` (via `OPERADOR_DEMO`). (Cria motor de cenário, injeta/gera um alerta candidato ou usa um cenário que gere; se difícil, testar apenas que `OPERADOR_DEMO === "Renata Vasques"`.)

- [ ] **Step 2: Run test to verify it fails** — Run: `npx vitest run src/estado/store.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement** — definir as constantes; usar nome/cargo/codinome no popover de perfil e no avatar (iniciais de "Renata Vasques" → "RV") do `Cabecalho`.

- [ ] **Step 4: Run test + build** — Run: `npx vitest run src/estado/store.test.ts && npx tsc --noEmit` — Expected: PASS / sem erros.

- [ ] **Step 5: Verify no navegador** — perfil mostra "Renata Vasques · Coordenadora de Plantao" e codinome SENTINELA-1.

- [ ] **Step 6: Commit** — `git commit -am "feat: perfil do operador com nome, cargo e codinome"`

---

### Task 6: Barra de título dos painéis + info popover (itens 4, 7)

**Files:**
- Modify: `src/ui/Painel.tsx`, `src/styles/componentes.css`

- [ ] **Step 1: Implement** — `.painel-cabecalho`: altura fixa, `border-bottom` definido, `align-items: center`, título à esquerda e botões (info, collapse) à direita alinhados. O popover de info passa a `position: absolute` (não empurra o conteúdo). No `Painel`, fechar o info automaticamente quando `aberto` muda para `false` (efeito reagindo a `aberto`).

- [ ] **Step 2: Verify build/type** — Run: `npx tsc --noEmit && npx vite build` — Expected: sem erros.

- [ ] **Step 3: Verify no navegador** — em cada painel com info: abrir info, recolher o painel → info fecha e o cartão não "racha"; barra de título com linha definida e botões alinhados.

- [ ] **Step 4: Commit** — `git commit -am "fix: barra de titulo dos paineis e comportamento do popover de info"`

---

### Task 7: Controles do Fluxo (React Flow) legíveis no tema escuro (item 5)

**Files:**
- Modify: `src/styles/componentes.css` (ou o CSS que estiliza o grafo)

- [ ] **Step 1: Implement** — regras para `.react-flow__controls` e `.react-flow__controls-button` no tema escuro: fundo do botão, borda e `fill`/cor do ícone contrastantes (ícones hoje brancos sobre branco).

- [ ] **Step 2: Verify no navegador** — na página Agentes & Fluxo, os controles de zoom/lock do Fluxo ficam visíveis no dark.

- [ ] **Step 3: Commit** — `git commit -am "fix: contraste dos controles do react-flow no tema escuro"`

---

### Task 8: KPIs centralizados e de largura igual (item 10)

**Files:**
- Modify: `src/ui/PainelKPI.tsx`

- [ ] **Step 1: Implement** — trocar o `flex`/`flexWrap` por um layout centralizado com cartões de largura igual (grid de colunas iguais, ex.: `grid-template-columns: repeat(7, 1fr)` com `justify-content: center`, ou flex com `flex: 1 1 0` e `max-width` por cartão). Manter os 7 KPIs.

- [ ] **Step 2: Verify build + navegador** — Run: `npx tsc --noEmit` — e conferir no navegador que os KPIs ficam centralizados no topo com larguras iguais.

- [ ] **Step 3: Commit** — `git commit -am "style: KPIs centralizados e de largura uniforme"`

---

### Task 9: Empilhamento dos painéis da coluna direita ao minimizar (item 9)

**Files:**
- Modify: `src/ui/paginas/PaginaOperacional.tsx` (grid da coluna direita)

- [ ] **Step 1: Implement** — espelhar o comportamento da coluna esquerda: painéis colapsados viram `auto` alinhados ao topo (respeitando o recuo/gutter), o(s) aberto(s) ocupa(m) `1fr`. Se necessário, derivar `gridTemplateRows` do estado aberto/fechado dos três painéis (Fila, Rastreabilidade, Gêmeo) como a esquerda faz, ou usar `align-content: start` com painéis `auto`/`1fr` conforme aberto.

- [ ] **Step 2: Verify no navegador** — minimizar os três painéis da direita → empilham no topo, alinhados à barra superior, sem espaços mortos; abrir um → ele cresce.

- [ ] **Step 3: Commit** — `git commit -am "fix: empilhamento dos paineis da direita ao minimizar"`

---

## Bloco 3 — Agentes didáticos

### Task 10: Descrição didática por agente (`agentesDidatico.ts`)

**Files:**
- Create: `src/ui/agentesDidatico.ts`
- Test: `src/ui/agentesDidatico.test.ts`

**Interfaces:**
- Consumes: `Agente`, `EstadoSimulacao` (`@/agentes/tipos`).
- Produces: `function descreverAtividade(agente: Agente, estado: EstadoSimulacao): string`.

- [ ] **Step 1: Write the failing test** — casos: agente de ingestão (`agente.modulo === "ING"`, id começando com ingestão) → frase contendo o nº de estações operantes; agente hidrológico (`id === "agente-hidrologico"`) → frase mencionando "cota" e o valor de `estado.cotaPrevistaM`; agente sem caso específico → devolve `agente.descricao`.

- [ ] **Step 2: Run test to verify it fails** — Run: `npx vitest run src/ui/agentesDidatico.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement** — `switch`/mapa por `agente.id` (ou `modulo`) montando frases em linguagem natural a partir de `estado` (estações operantes, cota prevista, zonas alcançadas, alertas aguardando, leituras reprovadas); default `agente.descricao`.

- [ ] **Step 4: Run test to verify it passes** — Run: `npx vitest run src/ui/agentesDidatico.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat: descricao didatica de atividade por agente"`

---

### Task 11: Página de Agentes mais didática

**Files:**
- Modify: `src/ui/PainelAgentes.tsx` e/ou `src/ui/paginas/PaginaAgentes.tsx`

**Interfaces:**
- Consumes: `descreverAtividade` (Task 10); `rotulo`/`modoTecnico` (Tasks 1–2).

- [ ] **Step 1: Implement** — cada agente exibe nome, papel curto e a **frase de atividade atual** (`descreverAtividade`) e status; adicionar uma legenda explicando o conceito de "enxame atuando sobre o dado". Requisitos `RF-…` só com modo técnico. Aproveitar o espaço da página dedicada.

- [ ] **Step 2: Verify build + navegador** — Run: `npx tsc --noEmit` — e conferir a página Agentes: frases fazem sentido e mudam com a simulação; legenda presente.

- [ ] **Step 3: Commit** — `git commit -am "feat: pagina de agentes didatica com atividade em linguagem natural"`

---

## Bloco 4 — Alertas: animação e página de deliberações

### Task 12: Montagem das deliberações (`deliberacoes.ts`)

**Files:**
- Create: `src/ui/deliberacoes.ts`
- Test: `src/ui/deliberacoes.test.ts`

**Interfaces:**
- Consumes: `EstadoSimulacao` (`@/agentes/tipos`), `Mundo` (`@/simulacao/mundo`).
- Produces: `interface LinhaDeliberacao { alertaId; zonaNome; severidade; estado; operador: string|null; motivoDescarte: string|null; leadTimeHoras: number|null; tsDeteccao; tsValidacao: string|null; tsExpedicao: string|null; temBoletim: boolean }`; `function montarDeliberacoes(estado: EstadoSimulacao, mundo: Mundo): LinhaDeliberacao[]`.

- [ ] **Step 1: Write the failing test** — casos: resolve `zonaNome` a partir de `mundo.zonas`; `temBoletim` true quando existe boletim para o `alertaId` em `estado.boletins`; **inclui** alertas com `estado === "descartado"` (com `motivoDescarte`) e `"encerrado"`; ordena por `tsDeteccao` desc.

- [ ] **Step 2: Run test to verify it fails** — Run: `npx vitest run src/ui/deliberacoes.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement** — mapear `estado.alertas` → `LinhaDeliberacao`, resolvendo zona e boletim; ordenar por `tsDeteccao` desc.

- [ ] **Step 4: Run test to verify it passes** — Run: `npx vitest run src/ui/deliberacoes.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat: montagem do historico de deliberacoes de alertas"`

---

### Task 13: Animação de alerta no mapa + feedback ao validar/expedir

**Files:**
- Modify: `src/mapa/camadas.ts`, `src/mapa/simbologia.ts`, `src/mapa/MapaSalaSituacao.tsx`, e o gatilho de notificação (`src/ui/notificacoes.ts` / `Cabecalho`)

**Interfaces:**
- Consumes: `GerenciadorCamadas`; `estado.alertas`.
- Produces: `GerenciadorCamadas.pulsarZona(centro, agoraMs)` (ou extensão de `pulsar`), desenhado no laço de animação.

- [ ] **Step 1: Implement animação** — estender `GerenciadorCamadas` para pulsar a ZONA quando um alerta novo (candidato) surge e ao validar: realce animado (anel/preenchimento) sobre o polígono da zona, reutilizando o laço de `desenharPulsos`/`requestAnimationFrame`. `MapaSalaSituacao` detecta alertas novos comparando `estado.alertas` entre versões (ou por `tsDeteccao`/`tsValidacao === relogio.iso`).

- [ ] **Step 2: Implement feedback de ação** — validar/expedir gera uma notificação visível (via `notificacoes`/badge do sino) e a animação; garantir que o cartão muda de estado perceptivelmente (já ocorre).

- [ ] **Step 3: Verify build + navegador** — Run: `npx tsc --noEmit && npx vite build` — e no cenário "Evento extremo": ao surgir alerta, a zona pulsa no mapa; ao "Validar e expedir", há confirmação visível.

- [ ] **Step 4: Commit** — `git commit -am "feat: animacao de alerta no mapa e feedback ao validar"`

---

### Task 14: Página Alertas & Deliberações

**Files:**
- Modify: `src/ui/paginas/PaginaAlertas.tsx`

**Interfaces:**
- Consumes: `montarDeliberacoes` (Task 12); `abrirBoletim` (store); `rotulo`/`modoTecnico`.

- [ ] **Step 1: Implement** — lista/tabela das deliberações: zona, severidade, estado (rótulo operacional), operador, motivo de descarte, lead time, horários; ação para abrir o boletim quando `temBoletim`. Cabeçalho/vazios em linguagem operacional.

- [ ] **Step 2: Verify build + navegador** — Run: `npx tsc --noEmit` — e conferir a página com alertas gerados (validar/descartar alguns e ver refletido).

- [ ] **Step 3: Commit** — `git commit -am "feat: pagina de alertas e deliberacoes"`

---

## Bloco 5 — Controles de camadas e basemap

### Task 15: Estado de camadas/basemap no store + aplicação de visibilidade

**Files:**
- Modify: `src/estado/store.ts`
- Create: `src/mapa/visibilidade.ts`
- Test: `src/estado/store.test.ts`, `src/mapa/visibilidade.test.ts`

**Interfaces:**
- Produces (store): `type CamadaId = "mancha"|"zonas"|"estacoes"|"ativos"|"subBacias"`; `type BasemapId = "osm"|"satellite"|"topo-vector"`; `camadasVisiveis: Record<CamadaId, boolean>` (todas `true`); `alternarCamada(id: CamadaId): void`; `basemapId: BasemapId` (default `"osm"`); `definirBasemap(id: BasemapId): void`.
- Produces (`visibilidade.ts`): `function visibilidadePadrao(): Record<CamadaId, boolean>` e helper puro que valida/normaliza um estado de visibilidade.

- [ ] **Step 1: Write the failing tests** — `store.test.ts`: `alternarCamada("zonas")` inverte só `zonas`; `definirBasemap("satellite")` seta `basemapId`. `visibilidade.test.ts`: `visibilidadePadrao()` retorna todas as camadas `true`.

- [ ] **Step 2: Run tests to verify they fail** — Run: `npx vitest run src/estado/store.test.ts src/mapa/visibilidade.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement** — adicionar estado/ações ao store (usar `visibilidadePadrao()` no init e ao trocar cenário); implementar `visibilidade.ts`.

- [ ] **Step 4: Run tests to verify they pass** — Run: `npx vitest run src/estado/store.test.ts src/mapa/visibilidade.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat: estado de camadas e basemap no store"`

---

### Task 16: Controles de mapa (camadas + basemap) e aplicação no mapa

**Files:**
- Create: `src/ui/ControlesMapa.tsx`
- Modify: `src/mapa/camadas.ts` (aplicar visibilidade), `src/mapa/MapaSalaSituacao.tsx` (trocar basemap; passar visibilidade), `src/ui/paginas/PaginaOperacional.tsx` (posicionar os controles)

**Interfaces:**
- Consumes: `camadasVisiveis`, `alternarCamada`, `basemapId`, `definirBasemap` (Task 15).
- Produces: `GerenciadorCamadas.aplicarVisibilidade(v: Record<CamadaId, boolean>): void` (mapeia `subBacias` → camada `estaticas`; demais 1:1) e chamada no ciclo de sincronização; `ControlesMapa` (botões quadrados flutuantes).

- [ ] **Step 1: Implement `aplicarVisibilidade`** — setar `.visible` de cada GraphicsLayer conforme o estado; chamar em `MapaSalaSituacao` no efeito de versão/estado e após `montar`.

- [ ] **Step 2: Implement troca de basemap** — helper `basemapPorId(id)` e efeito em `MapaSalaSituacao` que troca `map.basemap` ao mudar `basemapId`, sem perder as GraphicsLayers sintéticas.

- [ ] **Step 3: Implement `ControlesMapa`** — dois botões **quadrados flutuantes** sobre o mapa, logo abaixo dos KPIs (posicionado na `PaginaOperacional`): um abre o painel de camadas (checkbox por `CamadaId`), outro o de basemap (Ruas/Satélite/Topográfico). Responsivo.

- [ ] **Step 4: Verify build/type** — Run: `npx tsc --noEmit && npx vite build` — Expected: sem erros.

- [ ] **Step 5: Verify no navegador** — alternar cada camada some/aparece no mapa e a escolha persiste ao avançar tick; trocar basemap carrega Satélite/Topográfico SEM API key (se algum falhar, remover da UI e ajustar `BasemapId`); as GraphicsLayers sintéticas continuam sobre o novo basemap.

- [ ] **Step 6: Commit** — `git commit -am "feat: controles flutuantes de camadas e basemap sobre o mapa"`

---

## Encerramento

- [ ] **Verificação final** — Run: `npx vitest run && npx tsc --noEmit && npx vite build` — tudo verde.
- [ ] **Atualizar docs** — refletir a nova estrutura de páginas e a terminologia no `README.md`, no `docs/GUIA-DEMONSTRACAO.md` (fluxo por página) e marcar os itens no `docs/ROADMAP-H1.md` se aplicável.
- [ ] **Revisão de branch** — revisão final (fresh reviewer) do conjunto.
