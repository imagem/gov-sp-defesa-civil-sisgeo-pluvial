# Guia de Demonstração — Sala de Situação: Alerta Precoce de Cheias

> Roteiro operacional para apresentar a demo da **Plataforma de Alerta Precoce
> e Gêmeo Digital de Bacia** (hipótese-âncora de
> [`fv/02-hipoteses-valor.md`](../fv/02-hipoteses-valor.md)).
>
> **Esta demo usa dados 100% sintéticos.** Nenhuma fonte real é consultada. A
> previsão de nível é uma curva de resposta paramétrica (não um modelo
> hidrológico); o boletim é composto por template (não por LLM). Ao apresentar,
> reforce isso verbalmente — a moldura de honestidade é falada, não é uma tela.

---

## 1. Como enquadrar a demo (fala de abertura)

> "O que vocês vão ver é a **sala de situação de alerta precoce de cheias** —
> o mesmo objetivo que o empréstimo **BIRD Pró-Resiliência (US$ 359,6 mi)**
> declara: *sistemas e infraestrutura para monitoramento climático, alerta
> precoce e mitigação de enchentes*. A demonstração é uma **simulação com
> dados fictícios**: ela mostra como a sala se comporta e como a decisão é
> tomada, não dados reais chegando agora. Cada peça foi construída para ser
> levada a um público técnico sem ressalvas escondidas."

Dois níveis de viabilidade a situar a plateia:

- **Nível JÁ** — geodashboard com dados públicos + limiar simples (PoC 30-60 dias).
- **Nível Robusto** — Velocity tempo real + modelagem hidráulica + gêmeo digital + alerta preditivo.

**A demo encena o comportamento do nível Robusto** (previsão → mancha →
geofencing preditivo → validação humana → expedição → auditoria), porém **com
dados sintéticos** — ainda não realiza o nível JÁ, porque nenhuma fonte pública
real está conectada. Diga isso se perguntarem "posso conectar ao CEMADEN agora?".

---

## 2. Mapa de cobertura — o que o escopo pleno pede × o que a demo faz hoje

| Elemento do escopo pleno | Estado na demo | Onde aparece |
|---|---|---|
| Previsão + telemetria + modelo → **alerta espacializado por zona** | ✅ Encenado ponta a ponta (sintético) | fluxo completo |
| **ArcGIS Dashboards** — painel da sala de situação | ✅ É a própria interface | toda a tela |
| **Velocity** — ingestão IoT + **geofencing** (limiar na zona, não global) | 🟡 Simulado por agentes | painel Agentes / grafo |
| Modelo hidrológico + **mancha de inundação** | 🟡 Curva paramétrica; mancha animada | mapa + `src/dominio/previsao.ts` |
| **Validação humana antes de expedir** (RNF-18) | ✅ Aplicado em código, com testes | Fila de alertas |
| **Camada LLM** — resume situação + gera boletim | 🟡 Boletim por template, aprovado por humano | Modal do boletim |
| LLM — consulta em linguagem natural + chamar tools ArcGIS | ❌ Ausente | — (ver roadmap) |
| **Gêmeo digital** — cenários de cheia | 🟡 Cenários fixos | seletor de cenário |
| Gêmeo digital — **operação de comportas** (what-if) | 🟡 Modo what-if (sintético) | painel Gêmeo digital + mapa |
| **Métricas de desempenho** — NSE/RMSE (RF-MOD-03), POD/FAR/CSI (RF-ALT-06) | 🟡 Sintéticas, rotuladas | painel Desempenho |
| **Image Analyst** — MDT/LiDAR, detecção de mudança | ❌ Ausente | — |
| Ligação a **dados reais** (SEMA, CEMADEN, ANA, INMET, SGB) | ❌ 100% sintético | por design |
| Publicação **OGC/ISO** / Enterprise Data Store | ❌ Ausente (estático) | ver `docs/CONEXAO-ENTERPRISE.md` |
| **Trilha de auditoria** (RF-GOV-02) | ✅ Presente | Trilha de auditoria |

**Resumo honesto:** a demo cobre o **coração do escopo** — o loop de decisão
da sala de situação com alerta preditivo espacializado e governança humana.
Ela **não** é um PoC com dados reais nem o gêmeo digital com operação de
comportas em produção.

---

## 3. A tela — o que é cada coisa

Layout medido em **1600×900** (não responsivo; use monitor/projetor nessa
resolução). De fundo, o **mapa ArcGIS** (sempre montado) com a bacia sintética.

**Cabeçalho (topo):** `▶/⏸` executar/pausar · **Passo** (avança 1 tick com a
simulação pausada) · pílula de **velocidade** (1x / 4x / 12x) · pílula de
**cenário** (abre a lista dos 5) · **relógio simulado** · selo **DADOS
SIMULADOS** · sino de notificações (monocromático) · tema claro/escuro · perfil
**Renata Vasques · Coordenadora de Plantão** (codinome SENTINELA-1; é o operador
que assina a validação). O menu de perfil traz o toggle **Modo técnico** (ver
abaixo).

**Navegação (logo abaixo do cabeçalho) — três páginas:**

1. **Operacional** — a sala de situação. É a tela que fica sobre o mapa:
   - *Coluna esquerda:* **Saúde da rede** · **Confiabilidade do sistema**
     (métricas de modelo e alerta) · **resumo do enxame** ("Enxame saudável · N
     agentes ativos", com atalho para a página de Agentes).
   - *Centro:* **KPIs** (7 cartões, centralizados) e, logo abaixo, os **botões
     flutuantes de mapa** (quadrados): **Camadas** (liga/desliga mancha, zonas,
     estações, ativos, sub-bacias) e **Mapa base** (Ruas / Satélite /
     Topográfico).
   - *Coluna direita:* **Fila de alertas** (decisão do plantão) ·
     **Rastreabilidade da decisão** (a trilha de auditoria) · **Gêmeo digital**
     (modo what-if de operação de comportas/EBAPs). Painéis minimizados
     empilham no topo.
2. **Agentes & Fluxo** — os **12 agentes especialistas**, cada um com a
   **descrição do que está fazendo agora** (ex.: "Recebendo leituras de 24
   estações operantes"), e o **Fluxo do dado** (grafo na ordem ingestão →
   qualidade → rede → modelagem → limiar/geofencing → antifadiga → redator →
   expedição → auditoria). É a página que mostra a maquinaria "atuando sobre o
   dado" — deixe-a para quando o público pedir o "como funciona".
3. **Alertas & Deliberações** — o **histórico**: cada alerta com zona,
   severidade, situação, operador que validou/descartou, motivo, antecedência,
   horários e o **boletim** (abre o modal).

**Modal do Boletim:** abre ao clicar em "Revisar rascunho"/"Ver boletim" (na
Fila ou na página de Alertas).

**Modo técnico** (menu de perfil): por padrão a interface usa **linguagem
operacional** (sem códigos). Ligue o modo técnico para revelar os requisitos
`RF-…` nos títulos e nos agentes — útil para público técnico, mantenha
desligado para gestores.

**Os 7 KPIs:** Lead time médio · Rede operante (%) · Aguardando validação ·
Alertas expedidos · Cota prevista 12 h · População nas zonas alcançadas ·
Leituras reprovadas.

> Detalhe de tempo: cada *tick* = **10 minutos simulados**. Em 4x um tick leva
> ~0,5 s de relógio real. Use **Passo** para narrar os momentos de clímax.

---

## 4. Roteiro por cenário

Ordem sugerida de apresentação: **1 → 2 → 3 (clímax) → 4 → 5**. Todos são
**reprodutíveis** (mesma semente → mesmo resultado), então você pode ensaiar.

### Cenário 1 — "Céu limpo" (abertura, ~1 min)
- **Demonstra:** sistema em repouso, rede saudável. (RF-ING-02, RF-NET-01)
- **Passos:** cabeçalho → cenário **Céu limpo** → `▶`.
  1. Aponte **Saúde da rede** (esquerda) próxima de 100% e o KPI **REDE OPERANTE**.
  2. Mostre o **resumo do enxame** ("Enxame saudável · 12 agentes ativos"). Se
     quiser mostrar a maquinaria, abra **Agentes & Fluxo** e volte ao Operacional.
- **Fala + âncora:** "Em tempo seco o enxame monitora continuamente e não fabrica
  alerta. É o estado normal de uma **sala 24/7** — o que o TCE-RS cobra da
  operação de Porto Alegre."

### Cenário 2 — "Chuva convectiva localizada" (~1-2 min)
- **Demonstra:** limiar observado dispara; o **antifadiga agrupa** a reincidência
  em vez de criar alerta novo. (RF-ALT-02, RF-ALT-05)
- **Passos:** cenário **Chuva convectiva** → `▶` (velocidade 4x).
  1. Quando surgir o alerta na **Fila de Alertas** (direita), aponte o rótulo
     **"N atualização(ões) agrupada(s) — antifadiga ativa"**.
- **Fala + âncora:** "O sistema **não sobrecarrega o plantão**: a mesma célula
  reincidente vira atualização do mesmo alerta, não dez alertas. Eficácia de
  alerta é exatamente uma das **40 recomendações + 8 determinações do TCE-RS**."

### Cenário 3 — "Evento extremo prolongado" — **CLÍMAX** (~4-5 min)
- **Demonstra:** cota sobe, mancha alcança as zonas, **geofencing preditivo**
  antecipa o alerta com **lead time**, e a **validação humana** libera a
  expedição. (RF-MOD-02/04, RF-ALT-03, RNF-18, RF-GOV-02)
- **Passos (fluxo completo — ensaie este):**
  1. Cenário **Evento extremo** → `▶`. No **mapa**, a mancha sintética cresce em
     direção às zonas de risco (bairros de POA: Partenon, Sarandi, Restinga…).
  2. Nos **KPIs** (centro), acompanhe **COTA PREVISTA 12 H**, **LEAD TIME MÉDIO**
     e **POPULAÇÃO NAS ZONAS ALCANÇADAS** subindo.
  3. Na **Fila de alertas**, surge o cartão pulsando (**aguardando validação**),
     com **"Antecedência de X h (origem: previsão)"** e a lista de **evidências**.
     No **mapa**, a zona alertada **pulsa em vermelho** — é o alerta aparecendo
     espacialmente.
  4. **Momento-chave (validação humana):** o alerta **não sai sozinho**. Diga:
     *"Repare que nada foi expedido — nenhum alerta é expedido sem uma pessoa
     decidir."* (garantido em código.)
  5. Clique **"Revisar rascunho do boletim"** → abre o **Modal**: mostre o selo
     **"RASCUNHO GERADO POR AGENTE"**, as **fontes consultadas**, edite uma linha,
     **"Aprovar como revisado"** (assina como *Renata Vasques*).
  6. Clique **"Validar e expedir"** no cartão. No **mapa**, a zona **pulsa em
     verde** (confirmação da decisão); o KPI **ALERTAS EXPEDIDOS** sobe.
  7. Aponte a **Rastreabilidade da decisão** (direita): registro carimbado com
     operador e horário. Abra **Alertas & Deliberações** para ver o **histórico
     completo** — cada alerta, quem validou/descartou, boletim e horários.
- **Fala de fechamento + âncora:** "Ganho de **tempo de evacuação** por alerta
  preditivo e espacializado, com **uma pessoa no comando** e **cada decisão
  auditável**. É o objetivo literal do **BIRD Pró-Resiliência** e do eixo de
  Adaptação Climática de POA (**R$ 2,6 mi/ano em medição e alerta**)."
- **Nota técnica se perguntarem sobre a cota:** o pico do cenário fica ~5,5 m —
  de propósito acima do **recorde histórico do Guaíba (5,35 m, maio/2024)**,
  porque é um "evento extremo", mas ainda um número que não soa absurdo a um
  hidrólogo. É sintético.

### Cenário 4 — "Falha na rede de estações" (~1-2 min)
- **Demonstra:** estações silenciam durante o evento; o painel expõe a lacuna e o
  sistema **degrada graciosamente**. (RF-NET-01, RNF-06)
- **Passos:** cenário **Falha na rede** → `▶`. Após ~12 ticks (minuto 120), aponte
  no **Painel Saúde da Rede** as estações silenciosas e o KPI **REDE OPERANTE**
  caindo (fica em "atenção"); o sistema continua operando com o que resta.
- **Fala + âncora:** "Rede real falha — e há **1 servidor** no setor de cheias do
  DMAE, com o quadro do órgão em ~29% de vacância. O painel **não esconde a
  lacuna**: ele a torna visível para o plantão decidir com o que tem."

### Cenário 5 — "Leitura implausível" (~1 min)
- **Demonstra:** um sensor envia 2000 mm/h; o **controle de qualidade reprova**,
  mantém o registro e **impede que o dado sujo vire alerta**. (RF-ING-04)
- **Passos:** cenário **Leitura implausível** → `▶`. Após ~4 ticks (minuto 40),
  aponte o KPI **LEITURAS REPROVADAS > 0**.
- **Fala + âncora:** "Confiabilidade: dado absurdo é **barrado antes de
  contaminar o alerta**, mas fica **registrado e sinalizado** — rastreabilidade,
  não descarte silencioso. É a base auditável que o controle externo exige."

---

## 5. Perguntas prováveis e respostas honestas

| Pergunta | Resposta |
|---|---|
| "Isso está lendo o CEMADEN/ANA agora?" | Não. Tudo é sintético e reprodutível. O caminho para conectar uma fonte real está desenhado em `docs/ROADMAP.md` e `docs/CONEXAO-ENTERPRISE.md`. |
| "O boletim é escrito por IA?" | Hoje é um **template** preenchido com valores lidos da simulação — nenhum número aparece que não tenha sido lido de uma fonte da simulação. A camada LLM agnóstica é o próximo passo. |
| "A previsão é um modelo hidrológico?" | Não — é uma **curva de resposta chuva-nível paramétrica**, suficiente para o fluxo previsão → mancha → alerta. O modelo físico/ML é o nível Robusto. |
| "Posso operar as comportas / rodar cenário 'e se'?" | Sim — na página **Operacional**, painel **Gêmeo digital**: feche uma comporta e veja a **população protegida** e a cota por zona mudarem (what-if, sintético; não expede nada). Perto do pico do extremo o efeito fica visível. |
| "Consigo trocar o mapa de fundo / esconder camadas?" | Sim — botões flutuantes abaixo dos KPIs: **Mapa base** (Ruas/Satélite/Topográfico) e **Camadas**. |
| "E esses códigos RF?" | Ficam escondidos por padrão; ligue **Modo técnico** no menu de perfil se o público for técnico. |
| "Precisa de ArcGIS Enterprise?" | Para a demo, não. Para o produto (tempo real, OGC/ISO, segurança), sim. Ver `docs/ROADMAP.md`. |
| "Nada é expedido sem validação mesmo?" | Sim, é garantido **em código** (`expedir()` lança exceção sobre alerta não validado) e coberto por testes em três camadas. |

---

## 6. Checklist pré-apresentação

- [ ] `npm install && npm run dev` e confirmar que o **mapa carrega** (ruas e
      corpos d'água sob a geometria sintética — ver "Item em aberto" no README).
- [ ] Trocar os 5 cenários pelo seletor e confirmar que rodam.
- [ ] Percorrer as **3 páginas** (Operacional / Agentes & Fluxo / Alertas).
- [ ] No cenário extremo: confirmar a **zona pulsando** ao surgir o alerta, que
      **nada é expedido sem validação**, e o **pulso verde** ao validar.
- [ ] Testar os botões de **Camadas** e **Mapa base** (Satélite/Topográfico).
- [ ] No **Gêmeo digital**, fechar uma comporta perto do pico e ver a **população
      protegida** mudar.
- [ ] Confirmar o **Modo técnico** desligado (sem códigos RF na tela).
- [ ] Resolução da tela próxima de **1600×900**.
- [ ] Ter em mente as **âncoras de evidência** (BIRD, TCE-RS, recorde do Guaíba).
