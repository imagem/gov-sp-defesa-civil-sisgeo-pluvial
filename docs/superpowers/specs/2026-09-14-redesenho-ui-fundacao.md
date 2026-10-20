# Redesenho de UI/UX — Fundação (Sala de Situação — Alerta de Cheias)

**Data:** 2026-09-14
**Branch de origem:** `main` (pós-merge de `demo-h1`)
**Autoridade vinculante:** `SPEC-H1-alerta-precoce-digital-twin-bacia.md` — nenhuma decisão aqui pode enfraquecer RNF-18 (nenhum alerta chega a `expedido` sem validação humana).

## Contexto

A demo H1 foi implementada e mesclada em `main` (17 tarefas, 30 commits). O usuário revisou a aplicação rodando e pediu um redesenho de UI/UX: a barra superior está desalinhada e "não fica legal ainda", a marca "H1" deve sumir (o cliente não sabe o que significa), faltam controles de perfil/tema/notificações, e os cinco painéis flutuantes (Saúde da rede, Agentes especialistas, Fila de Alertas, Trilha de Auditoria, e o grafo "Enxame de agentes") devem ganhar collapse com resumo, mais alguns enriquecimentos pontuais.

Este documento cobre apenas o subprojeto **1 — Fundação**: tema, sistema de collapse compartilhado e nova barra superior. Os subprojetos 2 a 5 (controles de mapa; enriquecimento de Saúde da Rede; enriquecimento de Agentes Especialistas + vínculo com o grafo; "análise" no Fluxo do Dado) ficam fora de escopo e exigem seu próprio ciclo de brainstorm — ver seção "Fora de escopo".

## Objetivo

Dar à demo uma casca visual coerente e profissional (sem a marca "H1"), com uma barra superior alinhada e funcional (perfil, tema, notificações) e um padrão de collapse único, reutilizável nos cinco painéis, que resuma cada painel com informação real (não apenas "colapsado") quando o operador quiser recuperar espaço na tela.

## Fora de escopo (subprojetos futuros)

- **Subprojeto 2 — Controles de mapa**: botão de foco no mapa, toggle de camadas (pop-on/pop-off), seletor de basemap Esri.
- **Subprojeto 3 — Saúde da Rede**: legenda/glossário completo, efeito de hover mostrando o motivo detalhado de uma estação estar fora de serviço, controles/parâmetros/lista adicionais. (O botão de informação genérico definido nesta Fundação é reaproveitado ali, mas o conteúdo rico de hover fica para esse subprojeto.)
- **Subprojeto 4 — Agentes Especialistas**: mais controles/funcionalidade no painel e o vínculo funcional (clicar num agente destaca o nó correspondente no grafo, e vice-versa).
- **Subprojeto 5 — Fluxo do Dado ("análise")**: qualquer funcionalidade de análise além de renomear, colapsar e explicar via botão de informação. Confirmado explicitamente pelo usuário: **"Só collapse + info agora"**.

Nenhum destes é implementado nesta rodada; apenas o wrapper `<Painel>` e o botão de informação são construídos de forma genérica o suficiente para que esses subprojetos os reaproveitem depois.

## Decisões já aprovadas pelo usuário (mockups no companheiro visual)

| Decisão | Escolha | Mockup |
|---|---|---|
| Local do collapse | No próprio lugar do painel (não uma gaveta lateral) | `painel-colapsavel.html` |
| Nome da aplicação | "Sala de Situação — Alerta de Cheias" (sem "H1") | `header-layout.html` |
| Estratégia de tema | Funcional: paleta clara real, não só um filtro | (discussão em texto) |
| Identidade do perfil | O operador real da simulação (`coord.plantao`, já existente na store) | (discussão em texto) |
| Layout da barra superior | Opção A — linha única de 56px, detalhes em popover | `header-layout.html` |
| Densidade do resumo (collapse) | Opção B — rica: chips com números reais + mini-visualização animada | `painel-colapsavel.html` |
| Resumo da Fila de Alertas | Chip vermelho pulsante "N aguardando validação" (some quando não há pendências) + chip verde "N expedidos" | `resumos-restantes.html` |
| Resumo da Trilha de Auditoria | "Ticker": contagem total + título do último evento (cor herdada do mapa `COR` existente) + horário | `resumos-restantes.html` |
| Botão de informação | Ícone "i" genérico no `<Painel>`, conteúdo por painel (mostrado para Saúde da Rede e Fluxo do Dado) | `resumos-restantes.html` |
| Escopo do Fluxo do Dado nesta rodada | Renomear + collapse + botão de info. Nada de "análise" ou vínculo com Agentes | (AskUserQuestion, resposta: "Só collapse + info agora") |

## Arquitetura

### 1. Sistema de tema

- Novo arquivo `demo/src/styles/temas.css` (ou bloco adicional em `tokens.css`) define duas paletas via atributo `data-tema` na raiz (`<html data-tema="escuro">` / `data-tema="claro"`), com `escuro` como valor padrão quando o atributo está ausente (preserva o comportamento atual).
- Tokens afetados: todos os `--cor-*` de `tokens.css`, mais os hardcodes de superfície hoje fixos em `glass.css` (`.vidro`, `.vidro-forte`, `.botao`, `.botao-primario`, `.botao-perigo`, `.selo-demo`) — essas regras passam a referenciar variáveis (`--vidro-fundo-1`, `--vidro-fundo-2`, `--vidro-borda`, etc.) em vez de `rgba(...)` literais.
- Os 12 `rgba` inline encontrados em `GrafoAgentes.tsx`, `ModalBoletim.tsx`, `nosDoGrafo.tsx`, `PainelAgentes.tsx`, `TrilhaAuditoria.tsx` (overlays de baixa opacidade branco/preto) são convertidos para as mesmas variáveis semânticas, para que não "vazem" preto-sobre-preto no tema claro.
- **Cores de domínio não mudam com o tema**: a simbologia do mapa (severidade, situação de estação, tipo de evento) mantém os mesmos valores em ambos os temas — são cores semânticas de dado, não de superfície de UI. Apenas fundo, texto, bordas e vidro trocam.
- Preferência persistida em `localStorage` (`demo.tema`); alternância pelo botão de tema na barra superior. Sem detecção de `prefers-color-scheme` automática nesta rodada — o padrão é sempre escuro até o operador trocar.
- `@media (prefers-reduced-motion: reduce)` e o fallback `@supports not (backdrop-filter: blur(1px))` já existentes em `glass.css` continuam válidos para os dois temas.

### 2. Componente `<Painel>` compartilhado

Novo arquivo `demo/src/ui/Painel.tsx` — wrapper usado pelos cinco painéis (`PainelSaudeRede`, `PainelAgentes`, `FilaAlertas`, `TrilhaAuditoria`, `GrafoAgentes`). **`PainelKPI` fica fora**: já é um resumo por natureza, não ganha collapse nesta rodada.

Contrato:
```tsx
type PainelProps = {
  titulo: string;
  aberto: boolean;
  aoAlternar: () => void;
  resumo: React.ReactNode;   // conteúdo mostrado quando colapsado (chips, mini-viz)
  info?: React.ReactNode;    // conteúdo do popover de informação (opcional)
  children: React.ReactNode; // conteúdo completo quando expandido
};
```
- Estado de aberto/fechado é local a cada painel-pai (`useState`), seguindo o mesmo padrão já usado em `CartaoAlerta` (estado local por instância, sem entrar na store/Zustand — collapse é puramente de apresentação, não afeta o motor de simulação nem RNF-18).
- Cabeçalho do `<Painel>` sempre mostra: título, botão de info (se `info` for passado) e botão de colapsar/expandir (seta). Quando `aberto=false`, o corpo é substituído pela linha de `resumo` — altura da tira entre 44–52px conforme aprovado ("Opção B").
- Transição de altura/opacidade via `motion` (já é dependência do projeto), respeitando `prefers-reduced-motion`.
- Botão de info abre um popover simples (`position: absolute`, fecha ao clicar fora ou em Escape) — sem biblioteca nova.

### 3. Resumos por painel (conteúdo do `resumo`)

| Painel | Resumo colapsado |
|---|---|
| Saúde da rede | Chips "N operantes" (verde) / "N silenciosa" (vermelho, só aparece se > 0) + mini-tira de blocos coloridos (6–8 primeiras estações, mesma paleta do grid expandido) |
| Agentes especialistas | Chips "N trabalhando" / "N bloqueado" (só se > 0) / "N ociosos", contagem total no título ("Agentes (12)") |
| Fila de Alertas | Chip vermelho pulsante "N aguardando validação" (some quando N=0) + chip verde "N expedidos" |
| Trilha de Auditoria | Chip "N eventos" + título do último evento (cor do mapa `COR` existente em `TrilhaAuditoria.tsx`) + horário, formato ticker de uma linha |
| Fluxo do dado | Sequência dos módulos (ING → NET → MOD → ALT → LLM → EXP → GOV) como tags; a tag do módulo que acabou de publicar um evento pisca brevemente (mesmo sinal que already anima o grafo expandido); chip "N bloqueado" se houver algum agente em bloqueio RNF-18 |

Todos os números vêm de seletores já existentes ou triviais de derivar da store (`motor.estado.estacoes`, `motor.agentes`, fila de alertas por estado, `selecionarEventosRecentes`) — nenhum dado novo é inventado.

### 4. Botão de informação — conteúdo desta rodada

Populado apenas onde já foi aprovado:
- **Saúde da Rede**: explica verde = transmitindo, vermelho pulsante = silenciosa (sem leitura há mais de 3 períodos), hover mostra nome + tempo no estado atual.
- **Fluxo do Dado**: explica que cada nó é um agente especialista, a coluna indica o módulo, uma aresta acende quando um agente publica evento para o próximo, nó vermelho pulsante = bloqueado aguardando decisão humana (RNF-18).

Os demais painéis recebem o botão de info vazio/omitido nesta rodada (o `info` prop do `<Painel>` é opcional) — texto para eles é decidido nos subprojetos 3/4 quando esse conteúdo for definido.

### 5. Renomeação do grafo

`GrafoAgentes.tsx`: título muda de "Enxame de agentes — fluxo do dado" para apenas **"Fluxo do dado"**. Nenhuma outra mudança de comportamento ou aparência do conteúdo interno do grafo (nós, arestas, layout, `fitViewOptions`, `Controls`) — por instrução explícita do usuário ("Não muda nada desse conteúdo, só melhora").

### 6. Barra superior (Opção A)

Nova `Cabecalho.tsx`, layout de linha única (~56px), da esquerda para a direita:
1. **Marca**: "Sala de Situação" / subtítulo pequeno "ALERTA DE CHEIAS" — substitui o bloco de 2 linhas atual, sem "H1".
2. Separador.
3. **Transporte**: botão ícone Executar/Pausar, um único pill com "1x · 4x · 12x" (velocidade atual em negrito, clique cicla ou abre popover — reaproveita `VELOCIDADES` da store).
4. **Cenário**: um pill "▾" que abre popover com a lista de cenários (reaproveita o `<select>` atual, agora fora da barra visível).
5. Separador.
6. **Relógio simulado** (`horaLocal()`, sem mudança de lógica).
7. Espaço flexível.
8. **Chip de status de dados simulados** (mantém `DEMONSTRACAO` / "dado sintético" como popover, não mais como bloco de 3 linhas).
9. **Notificações**: ícone de sino com badge, abre popover listando os eventos mais recentes via `selecionarEventosRecentes(s, N)` — mesma fonte de dados da Trilha de Auditoria, filtrados para os tipos de evento mais relevantes ao operador (ex.: `alerta.criado`, `alerta.expedido`, `estacao.silenciosa`).
10. **Tema**: ícone de sol/lua, alterna `data-tema` e persiste em `localStorage`.
11. Separador.
12. **Perfil**: avatar com iniciais + nome do operador real da simulação (`OPERADOR_DEMO` = "coord.plantao"), pill que abre popover mostrando o status de `portalAutenticado` (reaproveitando `descreverModo` de `demo/src/mapa/config.ts`, já com os três estados existentes: verificando/não autenticado/autenticado).

Nenhum controle novo introduz estado na store além do que já existe (`portalAutenticado`, `OPERADOR_DEMO`, `VELOCIDADES`) — tema e notificações lidas/tema são estado de apresentação local (`localStorage` + `useState`), não passam pelo motor de simulação.

## Layout (`App.tsx`)

A grade de três colunas é preservada. Cada um dos cinco painéis (exceto KPI) passa a ser renderizado dentro de `<Painel>`. Como o collapse reduz a altura de um painel para uma tira fina, as colunas que hoje usam altura fixa (`height: 305` no `GrafoAgentes`) passam a ter altura mínima quando expandido e altura fixa da tira quando colapsado — sem introduzir scroll adicional na coluna. O espaçador `1fr` com `pointerEvents:"none"` entre `PainelKPI` e `GrafoAgentes` continua existindo para não bloquear cliques no mapa.

## Testes

- Lógica pura extraível para `.ts` e testável via Vitest: a função que filtra/seleciona eventos para o popover de notificações (variação de `selecionarEventosRecentes` com filtro de tipos), e qualquer cálculo de contagem usado nos resumos que não seja um simples `.filter().length` inline.
- `<Painel>`, `Cabecalho` e os cinco painéis atualizados permanecem `.tsx` não testados por convenção — verificados por ensaio manual no navegador (padrão já estabelecido no projeto).
- Ensaio manual cobre: alternância de tema (persiste após reload), collapse/expand de cada um dos cinco painéis com resumo correto, popover de notificações refletindo eventos reais gerados pela simulação, botão de info abrindo/fechando nos dois painéis com conteúdo definido, e confirmação de que RNF-18 continua bloqueando expedição sem validação humana (nenhuma mudança de comportamento esperada, apenas checagem de regressão).

## Riscos e mitigrações

- **Regressão visual do tema claro**: por haver cores hardcoded espalhadas (12 ocorrências), o risco é sobras pretas-sobre-pretas. Mitigração: grep de `rgba(255` e `rgba(0` em `src/ui` e `src/mapa` como checklist de conversão, revisado no ensaio manual em ambos os temas.
- **Quebra de RNF-18**: nenhuma mudança nesta Fundação toca `validar()`/`expedir()` ou o fluxo de eventos do motor — collapse e tema são puramente de apresentação. Verificado no ensaio manual como item explícito.
- **Divergência entre resumo e conteúdo expandido**: os resumos usam os mesmos seletores/dados que os painéis expandidos já usam, não uma cópia paralela — reduz risco de os números do chip e da lista divergirem.
