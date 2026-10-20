# Sala de Situação — Alerta Precoce de Cheias

Demonstração web interativa de uma **sala de situação multi-agente** para
**alerta precoce de cheias** e **gêmeo digital de bacia hidrográfica**, voltada
à Defesa Civil do Estado de São Paulo.

> **Esta é uma demonstração com dados sintéticos.** Nenhuma fonte real é
> consultada. A previsão de nível é uma curva de resposta paramétrica — não um
> modelo hidrológico. O boletim é composto por template — não por LLM. Nada
> aqui deve ser apresentado como capacidade preditiva operacional.

---

## Sumário

- [Visão geral](#visão-geral)
- [O que a demonstração mostra](#o-que-a-demonstração-mostra)
- [Páginas e navegação](#páginas-e-navegação)
- [Cenários](#cenários)
- [Honestidade deliberada sobre cada peça](#honestidade-deliberada-sobre-cada-peça)
- [Divergências em relação ao escopo pleno](#divergências-em-relação-ao-escopo-pleno)
- [Estrutura do código](#estrutura-do-código)
- [Rodar localmente](#rodar-localmente)
- [Publicar](#publicar)
- [Conectar ao ArcGIS Enterprise](#conectar-ao-arcgis-enterprise)
- [Licenças de terceiros](#licenças-de-terceiros)

---

## Visão geral

A aplicação encena, com dados fictícios porém coerentes, o ciclo completo de uma
sala de situação de defesa civil para enchentes:

**ingestão → qualidade do dado → modelagem → limiar → geofencing preditivo →
validação humana → expedição multicanal → auditoria.**

A ênfase não é visualização — é **governança da decisão**: nenhum alerta sai
sem a validação explícita de um operador identificado, e isso é garantido em
código (não apenas na interface), com testes em três camadas.

A ferramenta serve a dois públicos:

- **Gestores e lideranças institucionais** — para enxergar a forma do produto e
  o fluxo de decisão sem precisar de jargão técnico.
- **Equipes técnicas (hidrologia, TI, GIS)** — para conferir a arquitetura, os
  critérios de qualidade do dado, as métricas de desempenho e os pontos de
  integração com um ArcGIS Enterprise.

---

## O que a demonstração mostra

**Doze agentes especialistas**, cada um com um papel claro na cadeia, operando
sobre uma bacia sintética gerada proceduralmente:

| Agente | Módulo | Requisitos (código técnico) |
|---|---|---|
| Ingestão CEMADEN / ANA / INMET | ING | RF-ING-01/02/05 |
| Controle de qualidade | ING | RF-ING-04 |
| Saúde da rede | NET | RF-NET-01 |
| Modelagem hidrológica | MOD | RF-MOD-02/04 |
| Motor de limiares | ALT | RF-ALT-01/02/05 |
| Geofencing preditivo | ALT | RF-ALT-03 |
| Antifadiga de alerta | ALT | RF-ALT-05 |
| Assistente de plantão | LLM | RF-LLM-01/03/05 |
| Expedição multicanal | EXP | RF-EXP-02, **RNF-18** |
| Trilha de auditoria | GOV | RF-GOV-02 |

> **O ponto central da demonstração** é que o agente de expedição permanece
> *bloqueado* até um operador identificado validar o alerta. Isso não é uma
> limitação da demo — é o **RNF-18** da especificação funcionando. A função
> `expedir()` lança exceção se chamada sobre alerta não validado, e há teste
> automatizado garantindo isso.

### Painéis adicionais

- **Desempenho — modelo e alerta** (RF-MOD-03 e RF-ALT-06): calcula
  NSE/RMSE/MAE/viés e POD/FAR/CSI com as fórmulas reais sobre as séries da
  própria simulação (previsto × realizado; zonas alertadas × zonas inundadas).
  Os valores ficam rotulados como **sintéticos** — demonstram a métrica, não
  são medição operacional. Ver `src/dominio/metricas.ts`,
  `src/dominio/desempenho.ts` e `src/estado/desempenho.ts`.
- **Gêmeo digital — simulação de operação** (RF-TWN): modo *what-if* que
  permite operar comportas/EBAPs e ver o efeito sistêmico (rede de influência)
  sobre a cota por zona e a população exposta, com os ativos recoloridos no
  mapa por estado. É simulação — não dispara nem expede alerta; coeficientes
  sintéticos. Ver `src/dominio/twin.ts` e `src/estado/gemeo.ts`.

---

## Páginas e navegação

A interface tem três páginas, trocadas pela navegação no topo (estado no store,
sem router); o mapa fica sempre montado ao fundo:

1. **Operacional** — a sala de situação propriamente dita: mapa, KPIs, Saúde
   da rede, Confiabilidade do sistema, resumo do enxame, Fila de alertas,
   Rastreabilidade da decisão, Gêmeo digital (what-if de comportas), e os
   botões flutuantes de Camadas e Mapa base.
2. **Agentes & Fluxo** — os 12 agentes especialistas com a atividade atual em
   linguagem natural, e o grafo do Fluxo do dado.
3. **Alertas & Deliberações** — o histórico de alertas (operador, estado,
   motivo, horários, boletim).

**Terminologia:** por padrão a UI usa linguagem operacional em português; o
toggle **Modo técnico** (menu de perfil) revela os códigos de requisito
(`RF-…`) para público técnico.

---

## Cenários

| Cenário | O que demonstra |
|---|---|
| Céu limpo | Sistema em repouso, rede saudável |
| Chuva convectiva localizada | Limiar observado e antifadiga (agrupamento) |
| Evento extremo prolongado | Mancha crescendo, geofencing preditivo, lead time |
| Falha na rede de estações | Detecção de estação silenciosa e degradação graciosa |
| Leitura implausível | Controle de qualidade impedindo alerta a partir de dado sujo |

Todos os cenários são **reproduzíveis**: mesma semente, mesmo resultado.

No cenário "Leitura implausível" o KPI de leituras rejeitadas legitimamente
mostra uma contagem maior que zero — isso é o agente de controle de qualidade
barrando um dado sujo antes que ele vire alerta, não um erro da demo.

---

## Honestidade deliberada sobre cada peça

Estas três propriedades foram verificadas durante a construção e são a razão de
a demo poder ser levada a um público técnico sem ressalvas escondidas:

- **`agenteRedator` não é um LLM.** Ele compõe o boletim (`redigirBoletim` em
  `src/dominio/boletim.ts`) a partir de um template preenchido com valores já
  presentes no estado da simulação. Nenhum número pode aparecer no boletim que
  não tenha sido lido de uma fonte da simulação. É uma propriedade de
  honestidade deliberada, não um atalho por falta de chave de API.

- **`preverNivel` não é um modelo hidrológico.** É uma curva de resposta
  chuva-nível paramétrica (`src/dominio/previsao.ts`), suficiente para
  demonstrar o fluxo previsão → mancha → alerta espacial. A chuva já caída
  (`chuvaAcumulada6hMm`) só entra no incremento previsto uma vez — pelo motor
  da simulação, que já usa essa mesma chuva para subir `nivelAtualM` a cada
  tick. `preverNivel` soma só a chuva que ainda vai cair; o pico do cenário
  extremo fica por volta de 5,5 m — acima do recorde histórico do Guaíba
  (5,35 m, maio/2024) porque é um "evento extremo", mas um número de cota que
  não soa absurdo a um hidrólogo, e continua sintético.

- **RNF-18 é aplicado em código, não apenas representado na interface.**
  `expedir()` (`src/dominio/alerta.ts`) lança exceção se o alerta não estiver
  validado por um operador identificado. `validar()` não tem nenhum chamador
  no código de produção fora da ação humana (`FilaAlertas.tsx` →
  `motor.validarAlerta()`, disparado por clique). O agente de expedição fica
  visivelmente bloqueado até uma pessoa validar. Testes cobrem isso em três
  camadas: domínio (`describe("expedir")` em `dominio/alerta.test.ts`), agente
  (`describe("agenteExpedicao — RNF-18")` em `agentes/agentesAlerta.test.ts`)
  e motor ponta a ponta (`"nao expede alerta sem validacao humana — RNF-18
  ponta a ponta"` em `simulacao/motor.test.ts`).

---

## Divergências em relação ao escopo pleno

Decisões deliberadas, para que o escopo caiba numa demonstração estática sem
backend:

| Item | Escopo pleno | Demonstração | Motivo |
|---|---|---|---|
| CRS | EPSG:4674 | EPSG:4326 | Geometria sintética; ArcGIS reprojeta na renderização |
| Modelo hidrológico | Físico acoplado + ML | Curva de resposta paramétrica | Sem backend; suficiente para o fluxo |
| Camada LLM | Provedor agnóstico | Template determinístico | Sem backend e sem chave de API |
| Design system | Calcite (padrão Esri) | CSS próprio | Glassmorfismo brigaria com Calcite |
| Persistência | Enterprise Data Store | Memória do navegador | Demo sem backend |

Dois requisitos seguem sem implementação nesta demo:
- `RF-EXP-01` (destinatários e matriz de expedição)
- `RF-EXP-03` (retentativa com recuo exponencial)

O agente de expedição publica um array fixo de canais, sem destinatários,
matriz ou retentativa — cobre `RF-EXP-02`, não os outros dois.

---

## Estrutura do código

```
src/dominio/      lógica pura, testável sem React/ArcGIS/rede
src/simulacao/    mundo procedural, cenários, barramento, motor de tick
src/agentes/      os 12 agentes especialistas
src/estado/       ponte Zustand entre motor mutável e React (páginas, camadas, gêmeo)
src/mapa/         ArcGIS Maps SDK: config, simbologia, camadas animadas, visibilidade
src/ui/           painéis, páginas (ui/paginas/), navegação, textos, controles de mapa
```

Repositório inclui também:

```
pics/             capturas de tela da demonstração
```

### Layout e limites de tela

A interface foi desenhada para uma tela de apresentação e foi medida em
**1600 × 900**. Ela não é responsiva: em larguras estreitas a grade de colunas
da página Operacional fica apertada. Para apresentar, prefira um monitor ou
projetor próximo dessa resolução.

---

## Rodar localmente

```bash
npm install
npm run dev
```

Ao rodar `npm run dev` pode aparecer no console um `Basemap AbortError`
benigno. Ele vem do duplo-montagem deliberado do React `StrictMode` em
desenvolvimento e não ocorre no build de produção.

### Verificar antes de publicar

```bash
npm run verificar
```

Roda testes, checagem de tipos e build.

---

## Publicar

O projeto é estático, sem backend, e pode ser publicado em qualquer host
estático (Vercel, Netlify, GitHub Pages, etc.). Para a Vercel:

```bash
npx vercel --prod
```

Ou conecte o repositório na Vercel apontando o *root directory* para `demo/`.
O `vercel.json` já define framework, comando de build e reescrita de SPA.
**Nenhuma variável de ambiente é necessária para publicar.**

Após publicar, confirme na URL publicada:
- o mapa carrega (com o basemap OpenStreetMap);
- os cenários trocam pelo seletor;
- o agente de expedição fica bloqueado enquanto o alerta é candidato;
- a validação humana (clique em "Validar" na fila de alertas) destrava a
  expedição e o agente passa a "trabalhando".

---

## Conectar ao ArcGIS Enterprise

A demo funciona integralmente **sem** credencial. Para apontar para o portal
`https://saopaulo.img.com.br/portal`:

1. Registre a aplicação no portal (*Content > New item > Application > Other
   application*) e anote o **App ID (Client ID)**. Em *Settings > Redirect URIs*
   adicione `http://localhost:5173` (dev) e a URL de produção.
2. Preencha o `.env` (ou as variáveis no host de publicação):
   ```
   VITE_ARCGIS_PORTAL_URL=https://saopaulo.img.com.br/portal
   VITE_ARCGIS_APP_ID=<App ID registrado>
   VITE_MODO_ENTERPRISE=true
   ```
   `modoEnterprise()` só liga com **flag E App ID** presentes (ver
   `src/mapa/config.ts`), evitando que um deploy com a flag ligada e sem
   credencial quebre a apresentação.
3. Troque os mocks de `src/simulacao/mundo.ts` por `FeatureLayer` do portal e,
   se desejar, substitua o basemap OSM por um webmap do portal em
   `src/mapa/MapaSalaSituacao.tsx` (`Basemap({ portalItem: { id: … } })`).

> O contrato de dados esperado está nas interfaces de `src/dominio/tipos.ts`.
> Mapeie os campos do serviço real em um adaptador — **não altere os tipos do
> domínio para caber no serviço**, porque isso propagaria o formato do serviço
> por toda a aplicação. O domínio, os agentes, o motor e os testes não dependem
> de ArcGIS nem de rede: conectar ao Enterprise é uma troca na borda de dados
> e na borda de renderização.

---

## Licenças de terceiros

- `@xyflow/react` (React Flow) — MIT, uso livre inclusive comercial.
- `@arcgis/core` — segue os termos da Esri; o basemap padrão é OpenStreetMap,
  que não exige chave de API.
