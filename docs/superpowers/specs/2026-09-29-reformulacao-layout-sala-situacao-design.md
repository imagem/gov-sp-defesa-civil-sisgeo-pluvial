# Design — Reformulação de layout da Sala de Situação (H1)

- **Data:** 2026-09-29
- **Projeto:** `demo/` (Demonstração H1 — Sala de Situação Multi-Agente)
- **Status:** aprovado em conversa; aguardando revisão do spec
- **Origem:** 15 apontamentos de layout/UX do cliente interno após a demo funcional

---

## 1. Contexto e objetivo

A demo hoje é uma **tela única** ([`src/App.tsx`](../../../src/App.tsx)): mapa ArcGIS de
fundo + cabeçalho + três colunas de painéis (esquerda: Saúde da rede, Desempenho,
Agentes; centro: KPIs, Fluxo do dado; direita: Fila de alertas, Trilha de
auditoria, Gêmeo digital). Não há roteamento — é um SPA de uma vista só.

O objetivo desta reformulação é **fazer o dashboard principal ser a sala de
situação operacional** (mapa, alerta, situação), tirando do primeiro plano a
maquinaria de agentes/fluxo (que é excelente, mas desvia o foco para
"desempenho de modelo/agentes" em vez da operação descrita na hipótese-âncora).
Junto, corrige uma série de defeitos visuais e de terminologia que confundem o
cliente durante a apresentação.

### Decisões estruturais (aprovadas)
1. **Multi-página com navegação no topo** — três vistas (Operacional, Agentes &
   Fluxo, Alertas & Deliberações), trocadas por estado no store, **sem
   biblioteca de router**.
2. **Resumo compacto de agentes** permanece no Operacional; detalhes na página
   de Agentes.
3. **Animação no mapa + página** de Alertas & Deliberações.
4. **Linguagem operacional em PT**; códigos técnicos (`RF-…`, `H1`) escondidos
   por padrão atrás de um **modo técnico**.

### Não-objetivos (YAGNI)
- Não introduzir router (`react-router`) — o switch de páginas é estado no store.
- Não conectar dados reais nem Enterprise (fora do escopo deste lote).
- Não refatorar domínio/agentes/motor — a lógica de simulação permanece intacta.
- Não tornar a interface responsiva para telefone — segue mirando ~1600×900
  (mas os controles novos não devem quebrar em larguras menores).

---

## 2. Arquitetura

### 2.1 Casca de navegação (shell)
- Store ganha `pagina: Pagina` (`"operacional" | "agentes" | "alertas"`) e
  `irPara(p)`, e `modoTecnico: boolean` + `alternarModoTecnico()`.
- `App.tsx` mantém `MapaSalaSituacao` **sempre montado** como fundo (preserva
  estado do mapa e evita re-init/`AbortError`). Sobre ele:
  - Cabeçalho + **Navegação** (sempre visíveis).
  - Um contêiner de conteúdo que renderiza a página ativa. Operacional deixa o
    mapa visível (painéis flutuantes com `pointer-events`); Agentes e Alertas
    cobrem o mapa com uma superfície de vidro opaca.
- Componentes novos: `src/ui/Navegacao.tsx`, `src/ui/paginas/PaginaOperacional.tsx`,
  `src/ui/paginas/PaginaAgentes.tsx`, `src/ui/paginas/PaginaAlertas.tsx`.

### 2.2 Terminologia
- Módulo puro `src/ui/textos.ts`: mapa de rótulos operacionais + função que,
  conforme `modoTecnico`, anexa ou omite o código técnico. Ex.:
  `rotulo("auditoria", modoTecnico)` → "Rastreabilidade da decisão" ou
  "Rastreabilidade da decisão · RF-GOV-02".
- Renomeações principais: Trilha de auditoria → **Rastreabilidade da decisão**;
  Desempenho — modelo e alerta → **Confiabilidade do sistema**; remover "H1",
  "Métricas de H1", "requisitos em foco" da UI padrão.
- **Testável:** `textos.ts` recebe testes unitários (mapa completo, com/sem
  modo técnico).

---

## 3. Design por item (os 15 apontamentos)

| # | Apontamento | Solução |
|---|---|---|
| 1 | Popovers da barra superior abrem atrás dos painéis | Cabeçalho e seus popovers em camada de `z-index` acima das superfícies de painel; revisar contexto de empilhamento. |
| 2 | Ícone do sino colorido | Sino monocromático (herda `currentColor`). |
| 3 | Perfil `coord.plantao` | **Renata Vasques · Coordenadora de Plantão**, codinome **SENTINELA-1**; usado na assinatura de validação (`OPERADOR_DEMO`) e no cabeçalho. |
| 4 | Barra de título "rachada", botões desalinhados | `.painel-cabecalho`: altura fixa, borda inferior definida, botões info/collapse alinhados à direita e verticalmente centrados. |
| 5 | Controles do Fluxo (React Flow) brancos no dark | CSS para `.react-flow__controls` (fundo, borda, `fill` do ícone) no tema escuro. |
| 6 | Jargão técnico (H1, RF-…) confunde | Ver §2.2 (terminologia + modo técnico). |
| 7 | Info aberta "racha" ao recolher | Popover de info **absoluto** (fora do fluxo); fecha automaticamente ao recolher o painel. Verificar em todos os painéis. |
| 8 | Faltam controles de camadas/basemap | `src/ui/ControlesMapa.tsx`: botões **quadrados flutuantes** sobre o mapa, logo abaixo dos KPIs; abrem minipainéis para alternar camadas (mancha, zonas, estações, ativos, sub-bacias) e basemap (Ruas/Satélite/Topográfico). Estado de visibilidade no store; `GerenciadorCamadas` respeita a visibilidade. |
| 9 | Painéis da direita não empilham ao minimizar | Espelhar o comportamento da coluna esquerda: colapsados viram `auto` alinhados ao topo (respeitando o recuo), o aberto ocupa `1fr`. |
| 10 | KPIs não centralizados, larguras diferentes | `PainelKPI`: linha centralizada, cartões de **largura igual** (grid de colunas iguais). |
| 11 | Foco desviado para agentes/desempenho | Mover Agentes + Fluxo para **página Agentes & Fluxo**; Operacional mantém indicador compacto do enxame. |
| 12 | Agentes pouco didáticos (só números) | Cada agente com **frase do que faz agora** + papel + status; legenda do conceito de enxame. Função pura de descrição por agente/estado, testável. |
| 13 | Sem feedback ao emitir/validar alerta | **Animação** de realce pulsante da zona no mapa ao surgir/validar alerta; **notificação** de confirmação; **página Alertas & Deliberações** com histórico. |

### 3.1 Controles de mapa (item 8) — detalhe
- Store: `camadasVisiveis: Record<CamadaId, boolean>` e `basemapId: BasemapId`,
  com ações. `GerenciadorCamadas.sincronizar` e `desenharAtivos` respeitam a
  visibilidade; `MapaSalaSituacao` troca o basemap ao mudar `basemapId`.
- Basemaps sem chave de API: `osm` (Ruas), `satellite`/`hybrid` e
  `topo-vector` (todos disponíveis via `Basemap.fromId`, sem API key).
- **Testável:** o default de visibilidade e a normalização de estados (pura).

### 3.2 Página Agentes & Fluxo (itens 11, 12) — detalhe
- Reaproveita `PainelAgentes` e o grafo (`GrafoAgentes`), agora com espaço para
  respirar (o Fluxo já está ótimo).
- `src/ui/agentesDidatico.ts` (puro): dado um agente + estado da simulação,
  devolve uma **frase operacional** ("Recebendo chuva de 24 estações",
  "Projetando cota para as próximas 12 h", "Cruzando mancha com zonas de
  risco") + papel curto. Testável por agente/estado.
- Operacional: componente `ResumoEnxame` compacto ("Enxame saudável · 12
  agentes ativos"), com ação de ir para a página.

### 3.3 Página Alertas & Deliberações + animação (item 13) — detalhe
- **Animação:** ao detectar um alerta novo (candidato) e ao validar, o mapa
  destaca a zona com um pulso/realce animado. Reusa a camada de pulsos
  (`GerenciadorCamadas`), estendida para pulsar zonas além de estações.
- **Feedback de ação:** validar/expedir gera uma notificação visível
  (reusa/estende `notificacoes`) e a animação; o cartão muda de estado (já
  ocorre) com transição perceptível.
- **Página:** `src/ui/deliberacoes.ts` (puro) monta as linhas do histórico a
  partir de `estado.alertas` (zona, severidade, estado, operador, motivo de
  descarte, lead time, horários, vínculo de boletim). `PaginaAlertas` renderiza
  a lista/tabela. Testável (a montagem das linhas).

---

## 4. Estratégia de testes

- **Lógica pura (TDD, primeiro o teste):** `textos.ts`, `agentesDidatico.ts`,
  `deliberacoes.ts`, defaults/normalização de `camadasVisiveis`, e qualquer
  seletor novo. Padrão do repo: `describe/it` (vitest), pt-BR, funções puras.
- **Componentes React (.tsx):** verificados no navegador (convenção do repo —
  não há testes de componente), conferindo render, ausência de erros novos no
  console e o comportamento de cada item.
- **Portão de qualidade:** ao fim de cada bloco, `npx vitest run`, `tsc
  --noEmit` e `vite build` devem ficar verdes; o único erro de console tolerado
  é o `Basemap AbortError` já documentado (StrictMode em dev).

---

## 5. Ordem de execução (blocos)

1. **Shell + terminologia** — estado de página/modo técnico, `Navegacao`,
   `textos.ts`, mover Agentes/Fluxo e Alertas para páginas; Operacional com
   `ResumoEnxame`.
2. **Correções bounded** — itens 1, 2, 3, 4, 5, 7, 9, 10.
3. **Agentes didáticos** — item 12 (`agentesDidatico.ts` + página).
4. **Alertas** — item 13 (animação no mapa + feedback + página de deliberações).
5. **Controles de mapa** — item 8 (camadas + basemap).

Cada bloco entra verde (testes + tsc + build) e é verificado no navegador antes
do próximo.

---

## 6. Riscos e mitigações

- **Mapa montado sob páginas que o cobrem:** garantir `pointer-events`/`z-index`
  corretos para o mapa não capturar cliques quando coberto, e continuar
  recebendo cliques no Operacional.
- **Empilhamento (item 9):** a coluna direita hoje usa `1fr 1fr auto`; replicar o
  padrão da esquerda exige cuidado para o painel aberto crescer e os colapsados
  ficarem compactos no topo.
- **Basemap satélite sem API key:** confirmar no navegador que `satellite`/
  `topo-vector` carregam sem credencial; se algum exigir chave, manter só os que
  não exigem.
- **Regressão silenciosa:** manter a suíte e o `tsc` verdes a cada bloco.
