# Redesenho de UI/UX — Controles de Mapa, Saúde da Rede, Agentes e Análise

**Data:** 2026-09-26
**Branch de origem:** `main` (pós-merge da Fundação do redesenho de UI/UX)
**Autoridade vinculante:** `SPEC-H1-alerta-precoce-digital-twin-bacia.md` — nenhuma decisão aqui pode enfraquecer RNF-18. `docs/superpowers/specs/2026-09-14-redesenho-ui-fundacao.md` documenta a base (tema, `<Painel>`, painéis colapsáveis) sobre a qual este spec constrói.

## Contexto

Com a Fundação do redesenho mesclada, o backlog restante do redesenho de UI/UX tem quatro itens. Este spec cobre os quatro juntos porque dois deles (Agentes Especialistas e Fluxo do Dado) compartilham um único mecanismo de destaque no grafo, e o conjunto todo toca área suficiente do código (9 arquivos existentes, 4 novos) para justificar um plano de implementação único em vez de quatro ciclos separados.

## Objetivo

1. **Controles de mapa**: dar ao operador foco/reset de câmera, controle de visibilidade de camadas e escolha de basemap — hoje o mapa não tem nenhum controle além do zoom nativo do ArcGIS.
2. **Saúde da Rede**: enriquecer o painel existente com legenda sempre visível, hover detalhado por estação, alternância grid/lista e ordenação.
3. **Agentes Especialistas**: adicionar filtro e detalhes expandidos ao painel, e um vínculo bidirecional clicável com o Fluxo do Dado (selecionar um agente destaca seu nó no grafo, e vice-versa).
4. **Fluxo do Dado — "análise"**: permitir que o operador veja a trilha causal completa de um alerta específico (do limiar atingido até a expedição) destacada no grafo, reaproveitando `Barramento.porCorrelacao` — já usado internamente para auditoria (RF-GOV-02) mas nunca exposto ao operador.

## Fora de escopo

- Qualquer basemap do portal ArcGIS Enterprise de São Paulo (`VITE_ARCGIS_BASEMAP_ID`) — só basemaps públicos sem chave de API.
- Replay passo a passo da trilha causal (animação sequencial) — o destaque é instantâneo, todos os nós/arestas da cadeia juntos.
- Mudança de aparência do canvas do grafo além do necessário para o destaque de seleção (cores de status, posições de nó, arestas continuam como estão).
- Métricas agregadas por módulo (throughput, gargalos) e histórico/scrubber temporal do fluxo — descartados na conversa em favor da trilha causal.

## Arquitetura

### 1. Estado compartilhado de destaque do grafo (store)

`demo/src/estado/store.ts` ganha:

```ts
agentesDestacados: readonly string[]; // [] = nada destacado
sinalAbrirFluxoDoDado: number; // incrementado para pedir que o painel se abra

alternarAgenteDestacado(id: string): void; // clique simples: [id] se diferente, [] se igual
definirTrilhaDestacada(ids: readonly string[]): void; // substitui a selecao e incrementa o sinal de abertura
limparDestaque(): void;
```

`alternarAgenteDestacado` é usado pelo clique num agente (painel) ou num nó (grafo): se a seleção atual for exatamente `[id]`, limpa; senão vira `[id]`. `definirTrilhaDestacada` é usado pelo botão "Ver trilha" (Fila de Alertas / Trilha de Auditoria): substitui a seleção pelo conjunto de agentes da cadeia e incrementa `sinalAbrirFluxoDoDado`, sinal que `GrafoAgentes.tsx` observa para forçar `setAberto(true)` — sem tirar do painel o controle local do seu próprio estado de collapse (os outros 4 painéis continuam com `useState` local, sem mudança).

Este destaque é puramente de apresentação — não altera `motor`, não publica eventos, não interage com RNF-18.

### 2. Controles de mapa

**Arquivo novo:** `demo/src/mapa/ControlesMapa.tsx` — cluster de botões-ícone com `.vidro`, ancorado no canto inferior-direito do mapa (`position: absolute`, ao lado do zoom nativo do ArcGIS que fica por padrão no canto superior-esquerdo do `MapView`, configurado via `ui: { components: ["zoom"] }` em `MapaSalaSituacao.tsx`).

Recebe como props os *objetos ref* (não seus valores) já existentes em `MapaSalaSituacao.tsx`: `viewRef`, `mapaRef`, `camadasRef`. `MapaSalaSituacao.tsx` passa a renderizar `<ControlesMapa .../>` como filho, condicionado a um novo estado local `montado: boolean` (setado `true` ao fim do efeito de montagem da view) — refs são estáveis entre renders, então `ControlesMapa` lê `.current` dentro dos handlers de clique sem precisar de re-render a cada tick.

Botões:
- **🏠 Início** — `viewRef.current.goTo({ center: motor.mundo.centro, zoom: 11 }, { animate: true })`. Diferente do `goTo` sem animação usado na troca de cenário (que existe só para não atrasar o load inicial): este é um gesto do operador, então anima.
- **🎯 Focar em ativos** — chama um novo método `camadasRef.current.graficosParaFoco(estado)` (ver abaixo) e, se a lista não for vazia, `viewRef.current.goTo(graficos, { animate: true })` (o SDK do ArcGIS calcula a extensão automaticamente a partir de uma lista de `Graphic`). Se a lista vier vazia, o botão fica `disabled` com `title="Nenhuma zona em alerta, mancha ativa ou estacao fora do ar no momento"`.
- **🗺️ Camadas** (popover ao clicar, mesmo padrão `.cabecalho-popover`) — 4 checkboxes: Base sintética / Mancha de inundação / Zonas de risco / Rede de observação. Cada toggle chama `camadasRef.current.definirVisibilidade(nome, valor)`. "Atividade" (pulsos) não aparece — fica sempre visível, por ser efeito visual e não camada de dado.
- **🌐 Basemap** (popover ao clicar) — 3 opções: OSM (`Basemap.fromId("osm")`, padrão atual), Esri Streets Vector (`"streets-vector"`), Esri Dark Gray Vector (`"dark-gray-vector"`). Ao escolher: `mapaRef.current.basemap = Basemap.fromId(id)`.

**`demo/src/mapa/camadas.ts` (`GerenciadorCamadas`) ganha dois métodos:**

```ts
definirVisibilidade(nome: "estaticas" | "mancha" | "zonas" | "estacoes", visivel: boolean): void
graficosParaFoco(estado: EstadoSimulacao): Graphic[] // zonas com alerta ativo + mancha (se houver) + estacoes nao-operantes
```

Ambos ficam sem teste unitário, mesma convenção do restante de `camadas.ts` (dependente do SDK do ArcGIS, verificado por ensaio manual).

### 3. Saúde da Rede

**Arquivo novo:** `demo/src/ui/saudeRede.ts` — lógica pura testável:

```ts
motivoSituacao(estacao: EstacaoMonitoramento, agoraIso: string): string
ordenarEstacoes(estacoes: readonly EstacaoMonitoramento[], criterio: "padrao" | "situacao" | "atraso", agoraIso: string): EstacaoMonitoramento[]
filtrarPorSituacao(estacoes: readonly EstacaoMonitoramento[], situacao: SituacaoEstacao | null): EstacaoMonitoramento[]
```

`motivoSituacao` reaproveita `minutosDesde` (já existe em `dominio/relogio.ts`, usado por `agenteRede.ts`) para calcular o atraso e formatar texto como `"Sem leitura ha 47 min — limite e 45 min (periodicidade 15 min x 3)"` para silenciosa, `"Transmitindo normalmente"` para operante; para degradada/desativada (estados hoje inalcançados pela simulação, mas presentes no tipo `SituacaoEstacao`), retorna um texto genérico por estado.

**`PainelSaudeRede.tsx`:**
- **Legenda fixa** abaixo do grid: 4 chips (● operante ● degradada ● silenciosa ● desativada) com contagem, sempre visíveis (não dependem do popover de info, que continua existindo e inalterado). Clicar num chip filtra o grid via `filtrarPorSituacao`; clicar de novo no mesmo chip limpa o filtro. Estado local `filtro: SituacaoEstacao | null`.
- **Hover card**: substitui o `title` nativo por um card `.vidro` posicionado (mesmo padrão do popover de info) mostrando nome, `fonteId`, `tipo` e o texto de `motivoSituacao`. Estado local `emFoco: string | null` (id da estação em hover).
- **Alternar grid ↔ lista**: botão-ícone no cabeçalho (ao lado dos botões de info/collapse que `<Painel>` já injeta) alterna `modoLista: boolean`. No modo lista, cada estação vira uma linha (nome · fonte · tipo · situação · atraso), reaproveitando as mesmas cores e o mesmo `motivoSituacao`.
- **Ordenação**: um `<select>` pequeno, visível só quando `modoLista === true` (no grid a posição é espacial, ordenar não faz sentido visualmente), usando `ordenarEstacoes`.

O grid original e seu significado visual (cores, opacidade, `pulsando`) permanecem exatamente como estão — filtro e hover são camadas adicionadas por cima, nunca substituição.

### 4. Agentes Especialistas + vínculo com o grafo

**Arquivo novo:** `demo/src/ui/filtrosAgentes.ts`:

```ts
filtrarAgentes(agentes: readonly Agente[], modulo: ModuloAgente | null, status: "trabalhando" | "bloqueado" | "ocioso" | null): Agente[]
```

O filtro de status usa os mesmos agrupamentos de `resumirAgentes` (Fundação): "trabalhando" cobre `trabalhando`+`alerta`; "bloqueado" cobre `bloqueado`+`falha`; "ocioso" cobre só `ocioso`.

**`PainelAgentes.tsx`:**
- Duas fileiras de chips: por módulo (ING/NET/MOD/ALT/LLM/EXP/GOV) e por status (trabalhando/bloqueado/ocioso) — combináveis (E lógico), clicar de novo no mesmo chip limpa aquele filtro. Estado local `filtroModulo`/`filtroStatus`.
- Clique na linha do agente chama `alternarAgenteDestacado(agente.id)` (store). Linha cujo id está em `agentesDestacados` ganha borda `var(--cor-acento)`; as demais caem de opacidade quando `agentesDestacados.length > 0`.
- Botão "▾" à direita de cada linha (separado do clique de seleção) expande a linha para mostrar `descricao` completa e `requisitos` — estado local `expandido: Set<string>`.

**`GrafoAgentes.tsx` / `nosDoGrafo.tsx`:**
- `<ReactFlow onNodeClick={(_, no) => alternarAgenteDestacado(no.id)} onPaneClick={limparDestaque} .../>` — não precisa de `elementsSelectable` (continua `false`; isso só controla o outline nativo do React Flow, os handlers de clique funcionam independentemente).
- `nos` (no `useMemo`) ganha `agentesDestacados` na lista de dependências; cada nó recebe `data.destacado: agentesDestacados.length === 0 || agentesDestacados.includes(agente.id)`.
- `arestas` ganha a mesma lógica: uma aresta é "destacada" se `agentesDestacados` estiver vazio OU se origem E destino estiverem ambos em `agentesDestacados`; aresta não-destacada cai de opacidade (`style.opacity`).
- `NoAgente` usa `d.destacado` só para opacidade do card inteiro (`opacity: d.destacado ? 1 : 0.35`) — cor de borda/status não muda.

### 5. Fluxo do Dado — trilha causal

**Arquivo novo:** `demo/src/ui/trilhaCausal.ts`:

```ts
agentesDaTrilha(eventosDaCorrelacao: readonly Evento[]): string[] // agenteId unicos, na ordem de ocorrencia
```

**`FilaAlertas.tsx` (`CartaoAlerta`):** novo botão "Ver trilha" (ícone, ao lado de "Validar e expedir"/"Descartar" quando `aguardando`, ou sozinho nos demais estados) que chama:

```ts
const eventos = motor.barramento.porCorrelacao(alerta.alertaId);
definirTrilhaDestacada(agentesDaTrilha(eventos));
```

**`TrilhaAuditoria.tsx`:** o texto de `correlacaoId` (hoje `<span>{evento.correlacaoId}</span>`) vira um `<button>` pequeno com a mesma ação, usando `evento.correlacaoId` como o id de correlação.

**`GrafoAgentes.tsx`:** `useEffect` que observa `sinalAbrirFluxoDoDado` (store) — guarda o valor anterior num `useRef`; quando o valor muda (não na montagem inicial), chama `setAberto(true)`.

Nada disso altera `CartaoAlerta`'s fluxo de validação/descarte (RNF-18) — o botão "Ver trilha" é puramente informativo, não side-effect no `motor`.

## Testes

- `.ts` puros e testáveis: `saudeRede.ts` (3 funções), `filtrosAgentes.ts` (1 função), `trilhaCausal.ts` (1 função), e a nova ação `alternarAgenteDestacado`/`definirTrilhaDestacada` no `store.ts` (testável como as demais ações do store, seguindo o padrão de `store.test.ts`).
- `.tsx` e `camadas.ts` continuam sem teste unitário por convenção do projeto — verificados por ensaio manual (Esri/ReactFlow/DOM).
- Ensaio manual cobre: os 3 botões de mapa (home, focar em ativos com e sem nada ativo, troca de basemap, toggle de cada camada); legenda/hover/grid-lista/ordenação em Saúde da Rede; filtro combinado + expansão de linha + clique-para-destacar em Agentes Especialistas, nos dois sentidos (painel→grafo e grafo→painel); botão "Ver trilha" na Fila de Alertas e na Trilha de Auditoria, incluindo o caso do painel Fluxo do Dado estar colapsado no momento do clique; confirmação de que RNF-18 continua bloqueando expedição sem validação humana (regressão, sem mudança esperada).

## Riscos e mitigações

- **`agentesDestacados` interfere com o destaque de módulo ativo já existente no resumo do Fluxo do Dado** (chip do módulo que acabou de publicar, do Fundação): são mecanismos independentes — um é sobre o resumo colapsado (`moduloAtivoRecente`), o outro sobre o canvas expandido (`agentesDestacados`) — não competem pelo mesmo elemento visual.
- **Múltiplos triggers de destaque em sequência** (clicar num agente, depois "Ver trilha", depois noutro agente): cada ação chama `alternarAgenteDestacado` ou `definirTrilhaDestacada`, que sempre *substituem* a seleção anterior — não há acúmulo nem necessidade de "limpar antes de trocar".
- **`sinalAbrirFluxoDoDado` disparando em falso na montagem inicial**: mitigado pelo `useRef` que só reage a *mudanças* do contador, não ao valor inicial.
- **Botão "Focar em ativos" com o mapa ainda carregando** (`viewRef.current` nulo): `ControlesMapa` só é renderizado depois que `MapaSalaSituacao` sinaliza `montado`, então `viewRef.current` já existe em qualquer clique possível.
