# Roadmap — Estudos de Evolução da Demonstração

> Estudos e caminhos de arquitetura para aproximar a demonstração do escopo
> pleno de **Alerta Precoce de Cheias e Gêmeo Digital de Bacia**
> ([`fv/02-hipoteses-valor.md`](../fv/02-hipoteses-valor.md)). Complementa o
> [Guia de Demonstração](GUIA-DEMONSTRACAO.md) e a
> [Conexão Enterprise](CONEXAO-ENTERPRISE.md).
>
> **Princípio de arquitetura preservado em todos os estudos:** o domínio
> (`src/dominio/`), os agentes, o motor e os testes são **puros** — não dependem
> de React, ArcGIS nem rede. Toda integração externa entra como **adaptador na
> borda de dados e na borda de renderização**, sem contaminar os tipos do
> domínio. Isso é o que torna cada evolução abaixo barata e testável.

Índice:
- [B1 — Configuração ao Enterprise via MCP (geo-enable)](#b1)
- [B2 — Simulação semântica / Gêmeo Digital (RF-TWN)](#b2)
- [B3 — Conexão a fonte pública real](#b3)
- [B4 — Painel de métricas de desempenho (RF-MOD-03 / RF-ALT-06)](#b4)

---

<a id="b1"></a>
## B1 — Exemplo de configuração ao Enterprise via MCP "geo-enable" do ArcGIS

### O que significa aqui
Há **duas superfícies de integração distintas** com o ArcGIS, e "MCP geo-enable"
toca principalmente a segunda:

1. **Borda de dados/renderização** — consumir camadas do portal (FeatureLayer +
   OAuth) e renderizá-las no mapa. Isso **já está esboçado** no projeto
   (`src/mapa/config.ts`, `src/mapa/portal.ts`, `docs/CONEXAO-ENTERPRISE.md`) e é
   detalhado em [B3](#b3).
2. **Borda de ferramentas do assistente (MCP)** — expor o **geoprocessamento
   ArcGIS como *tools* chamáveis por um LLM**, que é exatamente o que a
   "camada IA/LLM" do escopo pleno promete: *"assistente que chama as tools de
   geoprocessamento ArcGIS (rodar cenário, gerar boletim, listar
   municípios/bairros sob limiar)"*. Hoje a demo **não tem** essa camada (o
   boletim é template determinístico).

> Nota de honestidade: não assuma a existência de um "MCP oficial ArcGIS" de
> primeira parte. O caminho abaixo descreve **construir um servidor MCP próprio**
> que embrulha as APIs ArcGIS — padrão bem estabelecido (ver skill
> `mcp-builder`). Se a Esri publicar/você já usar um MCP pronto, ele substitui a
> etapa de implementação do servidor, mas o **aparato de backend** (conta de
> serviço, serviços publicados) continua o mesmo.

### Aparato necessário
| Componente | Papel | Já existe hoje? |
|---|---|---|
| ArcGIS Enterprise (Portal + Server + Data Store) **ou** ArcGIS Online / Location Platform | Hospedar camadas e serviços de geoprocessamento (GP) | ❌ (portal `saopaulo.img.com.br` ainda hipotético) |
| **App registration** (OAuth Client ID) | Autenticar o app e o servidor MCP | ⚙️ scaffolding pronto (`.env` + `portal.ts`), falta o App ID real |
| **FeatureServices** publicados (zonas, estações, mancha, ativos) | Fonte das camadas GeoIA | ❌ |
| **GP Services / ArcGIS Notebooks / ArcGIS API for Python** | Rotinas de geoprocessamento invocáveis (rodar cenário de cheia, interceptar mancha × zonas, listar zonas sob limiar) | ❌ |
| **Servidor MCP** (Node/TS ou Python) com conta de serviço | Expor as rotinas GP como tools MCP para o LLM | ❌ (net-new) |
| **LLM agnóstico** (Azure OpenAI / Claude / local) | Orquestrar as tools e redigir o boletim | ❌ (hoje é template) |

### Exemplo de configuração (esboço)
Servidor MCP (Python, `arcgis` API) expondo três tools alinhadas ao escopo:

```python
# mcp_arcgis_defesacivil.py  (esboço — requer conta de serviço do portal)
from mcp.server.fastmcp import FastMCP
from arcgis.gis import GIS
from arcgis.features import FeatureLayer

gis = GIS("https://saopaulo.img.com.br/portal", client_id=APP_ID)  # OAuth app login
mcp = FastMCP("arcgis-defesa-civil")

@mcp.tool()
def listar_zonas_sob_limiar(variavel: str, valor: float) -> list[dict]:
    """Retorna zonas de risco cujo limiar da variável foi ultrapassado."""
    fl = FeatureLayer(f"{SERVER}/ZonasRisco/FeatureServer/0")
    q = fl.query(where=f"{variavel} >= {valor}", out_fields="zona_id,nome,populacao")
    return [f.attributes for f in q.features]

@mcp.tool()
def rodar_cenario_cheia(cota_m: float) -> dict:
    """Dispara um GP service que projeta a mancha para uma cota e intercepta zonas."""
    ...  # chama GP service / notebook, devolve área e população interceptada

@mcp.tool()
def gerar_boletim(alerta_id: str) -> str:
    """Compõe o boletim a partir do estado do alerta e das camadas."""
    ...
```

O front-end da demo continua estático; o **LLM + MCP vivem no backend**. A demo
chamaria o assistente por um endpoint fino (serverless), e o assistente decide
quais tools MCP chamar.

### Esforço estimado (dado o cenário de hoje)
- **Borda de dados** (B3, sem MCP): **baixo** — o scaffolding existe; falta o
  portal e os serviços.
- **Servidor MCP + tools GP**: **médio-alto** — depende de existir Enterprise com
  serviços publicados e uma conta de serviço; é código novo + publicação de GP
  services.
- **Integrar o assistente LLM na UI** (substituir o template do boletim por
  chamadas de tool): **médio**.
- **Pré-requisito bloqueante:** sem um ArcGIS Enterprise/Online real e serviços
  publicados, o MCP não tem o que embrulhar. Antes disso, dá para **prototipar o
  MCP contra mocks** (as mesmas estruturas de `src/simulacao/mundo.ts`) para
  demonstrar a *forma* da interação sem backend real.

---

<a id="b2"></a>
## B2 — Estudo: simulação semântica / Gêmeo Digital (RF-TWN-01/02/03)

### Estado atual
Hoje o mundo é **estático após a criação** (`criarMundo` em
`src/simulacao/mundo.ts`): comportas e EBAPs têm `situacaoProntidao`
(`pronto`/`manutencao`), mas **nada propaga** — mudar o estado de um ativo não
influencia zonas, mancha ou cota. O motor (`tick`) só sobe/escoa o nível a partir
da chuva do cenário. Isso é uma **sala de situação**, não ainda um **gêmeo
digital operável**.

### O que faria a demo virar "Digital Twin"
Um gêmeo digital é um modelo que você pode **operar e rodar cenários "e se"**. O
diferencial pedido — *"com a mudança de estado de um item, influenciar outros
itens"* — é uma **rede de influência semântica** entre entidades.

Proposta: um módulo **puro** `src/dominio/twin.ts` com um **grafo de influência
tipado**:

- **Nós:** sub-bacia, corredor fluvial, comporta, EBAP, trecho de dique, zona de
  risco. (Todos já existem como tipos em `src/dominio/tipos.ts`.)
- **Arestas tipadas com função de transferência** (coeficientes lineares,
  determinísticos, fictícios porém coerentes):
  - `comporta.fechada → reduz afluxo à zona protegida a jusante` (baixa a cota
    efetiva / atrasa a mancha ali) **e** `eleva ligeiramente o nível a montante`;
  - `EBAP.operante → reduz acúmulo na célula de drenagem que ela serve`;
  - `dique.rompido → transfere a mancha para as zonas atrás dele`.
- **Propagação:** ao mudar o estado de um nó, percorre-se o grafo recalculando as
  grandezas derivadas por zona (**cota efetiva**, **tempo até a mancha**,
  **população exposta**). Determinístico e testável isoladamente.

### Como isso aparece na demo
- Um **modo "what-if"** que **bifurca o estado** (não expede nada — é simulação):
  o operador clica numa **comporta no mapa** (as `AtivoProtecao` já são
  renderizadas em `src/mapa/camadas.ts`) e alterna `aberta/fechada/inoperante`.
- A **mancha e os KPIs recalculam** ao vivo: "fechar a Comporta CP-03 tira ~2.400
  pessoas da zona alcançada, mas eleva 12 cm a montante".
- Isso legitima chamar a demonstração de **Digital Twin**: você **opera o ativo e
  vê o efeito sistêmico**, mesmo com números fictícios rotulados.

### Realização ArcGIS-nativa (para o discurso do produto)
A "rede de influência" tem correspondentes diretos no stack Esri, o que fortalece
a narrativa: **ArcGIS Utility Network** (conectividade e tracing de rede de
ativos — ver skill `arcgis-utility-network`) e/ou **ArcGIS Knowledge** (grafo
desastre↔ativo↔zona). Na demo, um grafo tipado em TS; no produto, Utility
Network/Knowledge.

### Esforço
- **Médio.** Módulo puro `dominio/twin.ts` + testes (encaixa no padrão de domínio
  puro); estender `AtivoProtecao` com estado operável (`aberta`/`fechada`);
  interação no mapa ou um "Painel de Ativos"; um "modo what-if" no store que
  clona o estado. Mapeia **RF-TWN-01** (modelo da bacia), **RF-TWN-02** (COP) e
  **RF-TWN-03**.
- Risco baixo: é aditivo e isolado; não mexe no fluxo de alerta existente.

---

<a id="b3"></a>
## B3 — Caminho para conectar a uma fonte pública real

### Precisamos de ArcGIS Enterprise? — Resposta direta
**Não obrigatoriamente.** Consumir uma fonte pública **não exige** Enterprise.
O que se ganha com Enterprise é a **camada GeoIA completa** do escopo pleno
(tempo real, OGC/ISO, segurança, gêmeo). Há três opções, em ordem crescente
de custo e de aderência ao escopo:

#### Opção 1 — Fetch direto no navegador (⚠️ geralmente inviável)
A demo é estática; em tese poderia chamar a API pública direto. **Bloqueador:
CORS** — a maioria das APIs gov (CEMADEN, ANA, INMET) não envia cabeçalhos CORS,
então o navegador recusa a chamada. Formatos também variam (JSON/CSV/XML). **Não
recomendado.**

#### Opção 2 — Adaptador serverless (✅ caminho mais barato para virar PoC)
Uma **função serverless** (ex.: Vercel, onde a demo já publica) busca a fonte
pública **no servidor**, normaliza para o **contrato de domínio** e serve à demo:

```
[CEMADEN / ANA / nível do Guaíba]  →  função serverless (fetch + normalização)
      →  adaptador → tipos de src/dominio/tipos.ts  →  demo (substitui o mock)
```

- **Sem Enterprise.** Resolve CORS (chamada é server-side) e esconde formatos.
- **Regra de ouro:** mapear os campos do serviço real para as interfaces do
  domínio **em um adaptador** — *não* alterar os tipos do domínio para caber no
  serviço (isso propagaria o formato do serviço por toda a aplicação).
- **Resultado:** trazer **uma** fonte real (ex.: nível do Guaíba ou uma estação
  CEMADEN) já converte a percepção de "simulação" para "**PoC com dado real**" —
  o maior salto de credibilidade pelo menor esforço.
- Manter o QC (`src/dominio/qc.ts`) e a poda de observações valendo para o dado
  real; manter o selo do cabeçalho honesto (**DADOS REAIS/SIMULADOS**).

#### Opção 3 — ArcGIS Enterprise/Online (caminho de produto, escopo pleno)
Publicar a fonte pública como **Hosted FeatureService** (via ETL / Data
Interoperability; **Velocity** para tempo real e geofencing) e consumir com
`FeatureLayer` + OAuth — **scaffolding já pronto** na demo. Necessário quando você
quer a história completa da camada GeoIA e os requisitos **RF-PUB** (OGC/ISO) e
**RF-GOV-03/04**.

### Configurações necessárias dado o app de hoje
Já existe no projeto (ver `docs/CONEXAO-ENTERPRISE.md` e `src/mapa/config.ts`):

```
VITE_ARCGIS_PORTAL_URL=https://saopaulo.img.com.br/portal
VITE_ARCGIS_APP_ID=<App ID registrado no portal>
VITE_MODO_ENTERPRISE=true
```

- `modoEnterprise()` só liga com **flag E App ID** presentes — evita que um deploy
  com a flag ligada e sem credencial quebre a apresentação.
- **App registration** no portal com **Redirect URIs** (`http://localhost:5173` +
  URL de produção), senão o OAuth falha silenciosamente.
- Trocar os mocks de `src/simulacao/mundo.ts` por `FeatureLayer` (borda de dados)
  e o basemap OSM por um webmap do portal (borda de renderização).
- Para **tempo real e geofencing de verdade** (o "Velocity" do escopo pleno): feed → ArcGIS
  Velocity → FeatureService de saída → demo. Isso **exige Enterprise/Online**.

### Recomendação
- **Para elevar a demo agora:** Opção 2 (adaptador serverless) com **uma** fonte
  real. Baixo custo, alto ganho de credibilidade.
- **Para o produto/PoC contratável do escopo pleno:** Opção 3 (Enterprise + Velocity).

---

<a id="b4"></a>
## B4 — Painel de métricas de desempenho (RF-MOD-03 e RF-ALT-06)

> O escopo pleno lista como KPI a **acurácia do modelo** (NSE/RMSE) e a
> **eficácia do alerta** (POD/FAR/CSI). Este é o desenho para incluí-los,
> **mesmo com números sintéticos rotulados**. Já implementado — ver estado
> abaixo.

### As duas famílias de métricas
| Família | Requisito | Métricas | Base de cálculo |
|---|---|---|---|
| Acurácia do modelo | RF-MOD-03 | **NSE, RMSE, MAE, viés** | série *previsto × observado* de nível |
| Eficácia do alerta | RF-ALT-06 | **POD, FAR, CSI** (+ lead time) | tabela de contingência (acertos / perdas / falsos alarmes) |

### Honestidade: derivar do que a simulação já sabe (preferível a inventar)
Onde possível, calcular a métrica de **grandezas que a simulação já produz** —
isso é honesto e não é número fabricado:

- **RMSE/MAE/NSE/viés:** comparar a curva `preverNivel` (`src/dominio/previsao.ts`)
  com a série `nivelAtualM` que o motor de fato realizou tick a tick. A
  divergência entre "o que previ" e "o que aconteceu na simulação" é uma métrica
  legítima **dentro do mundo sintético**.
- **POD/FAR/CSI:** montar a tabela de contingência a partir de **alertas
  expedidos × zonas que a mancha de fato tocou** (a interceptação já é calculada
  em `src/dominio/mancha.ts`): acerto = alertou e inundou; falso alarme = alertou
  e não inundou; perda = inundou sem alerta.
- Onde não houver base (ex.: métricas que exigiriam histórico longo), usar
  **constantes plausíveis explicitamente rotuladas "sintético"** — nunca
  apresentadas como medição real.

### Onde colocar na tela (atenção ao layout)
O layout atual é 3 colunas apertadas em 1600×900 e **os ajustes de layout estão
adiados**. Opções:
- **(a)** Novo **painel colapsável** `PainelDesempenho` (o componente `Painel` já
  suporta `aberto`/`resumo`), encaixado na coluna esquerda ou direita.
- **(b)** Uma **aba** dentro de um painel existente.
- **(c)** Deixar o desenho pronto e **posicionar na passada de layout**.

Recomendação: implementar a **lógica pura + selector agora** (não depende de
layout) e decidir o encaixe visual **(a/b)** durante a passada de layout.

### Implementação (encaixe na arquitetura atual)
1. `src/dominio/metricas.ts` — funções puras `nse()`, `rmse()`, `mae()`,
   `vies()`, `contingencia()→{pod,far,csi}`. **Com testes** (padrão do projeto).
2. Estender `EstadoSimulacao` para acumular as séries necessárias (previsto ×
   realizado; acertos/perdas/falsos alarmes) no `tick`.
3. `selecionarDesempenho(s)` no `src/estado/store.ts` (irmão de `selecionarKpis`).
4. `src/ui/PainelDesempenho.tsx` — cartões com rótulo **"sintético"** visível e
   as tags de requisito **RF-MOD-03 / RF-ALT-06**.
5. Atualizar o `README` (hoje declara esses dois requisitos fora de escopo) e a
   tabela de cobertura do [Guia](GUIA-DEMONSTRACAO.md).

### Esforço
- **Baixo-médio.** É aditivo, isolado e testável; o único ponto de atrito é onde
  encaixar visualmente — por isso a lógica pode ir agora e o painel na passada de
  layout.

---

## Priorização sugerida (custo × impacto de percepção)

| # | Item | Impacto | Esforço | Estado |
|---|---|---|---|---|
| 1 | **B4** métricas de desempenho | Alto (fecha 2 KPIs do escopo) | Baixo-médio | ✅ **Implementado** (painel Desempenho, sintético) |
| 2 | **B2** gêmeo digital semântico | Muito alto (vira "Digital Twin") | Médio | ✅ **Implementado** (painel Gêmeo digital + mapa, what-if) |
| 3 | **B3 opção 2** uma fonte pública real | Muito alto (vira "PoC") | Médio | ⬜ pendente (serverless) |
| 4 | **B1/B3 opção 3** Enterprise + MCP + LLM | Máximo (escopo pleno) | Alto | ⬜ pendente (Enterprise real) |

### Estado da implementação (B4 e B2)

**B4 — implementado.** Lógica pura em `src/dominio/metricas.ts` (NSE/RMSE/MAE/viés,
POD/FAR/CSI) e `src/dominio/desempenho.ts` (acumulação previsto×realizado e
contingência); acumulação no `Motor.tick`; visão em `src/estado/desempenho.ts`;
UI em `src/ui/PainelDesempenho.tsx`. Números **sintéticos**, rotulados. O
encaixe fino de layout fica para a passada de layout.

**B2 — implementado.** Núcleo semântico em `src/dominio/twin.ts` (rede de
influência, `cotaEfetivaPorZona`, `construirRedeInfluencia`,
`populacaoExpostaSobCota`); estado what-if no store; visão em
`src/estado/gemeo.ts`; UI em `src/ui/PainelGemeoDigital.tsx`; ativos recoloridos
no mapa por estado (`src/mapa/camadas.ts` + `simbologia.ts`). A "população
protegida" só fica > 0 quando a cota prevista está alta o bastante (perto do pico
do cenário extremo) — comportamento correto e honesto.

**Pendências conscientes (passada de layout):** posicionamento visual definitivo
dos dois painéis; opcional: clique direto no ativo do mapa (hoje a operação é
pelo painel); construção da rede de influência a partir de topologia real
(ArcGIS Utility Network) no lugar da heurística de proximidade.
