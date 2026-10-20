---
orgao: Defesa Civil (SINPDEC) — três esferas
esfera: municipal / estadual / federal
etapa: 2
titulo: Geração de Hipóteses de Valor Público
data: 2026-08-11
status: concluído
proxima_etapa: 03-narrativa-executiva
---

# Hipóteses de Valor Público — Defesa Civil (três esferas)

> Toda hipótese nasce de uma **evidência pública** do Dossiê da Etapa 1 e carrega o caminho de contratação calibrado pelo momento político da esfera. Sem inventário de licenças ArcGIS do cliente → a cobertura de licença (✅/🛒) é apresentada como **hipótese de aquisição**, não como fato. Legenda de evidência: 🟢 ancorada · 🟡 indício · 🔴 dedução.

## Portfólio de Hipóteses

### H1 — Alerta precoce e Digital Twin de bacia (mun + est + fed) ⭐ hipótese-âncora

| Campo | Detalhe |
|---|---|
| **Demanda / obrigação legal** | Modernizar monitoramento hidrometeorológico e alerta precoce; mitigar enchentes. |
| **Evidência-âncora** | 🟢 **BIRD "Pró-Resiliência" US$ 359,6 mi** — objetivo explícito: *"sistemas e infraestrutura aprimorados para monitoramento climático, alerta precoce e mitigação de enchentes"* ([World Bank, 29/04/2025](https://www.worldbank.org/pt/news/press-release/2025/04/29/brazil-world-bank-supports-disaster-preparedness-resource-management-rio-grande-sul)). 🟢 POA — eixo Adaptação Climática: R$ 2,6 mi/ano medição e alerta + R$ 3,6 mi/ano centro de monitoramento. 🟢 CEMADEN meta 2.095 municípios até 2026. |
| **Impacto (cidadão/gestão)** | Vidas salvas por maior *lead time*; base para evacuação e operação de comportas; cumpre objetivo do empréstimo e do PNPDC. |
| **Dimensão territorial** | Bacia hidrográfica (Taquari-Antas, Caí, Sinos, Gravataí, Guaíba) e bacia urbana (arroios de POA). |
| **Hipótese analítica** | Acoplar previsão meteorológica + telemetria de estações + modelo hidrológico/hidráulico da bacia para prever nível/vazão e disparar alerta espacializado por zona de risco. |
| **Solução — camada GeoIA (ArcGIS)** | **ArcGIS Pro + Spatial Analyst / hidrologia** modela a bacia e a mancha de inundação; **ArcGIS Velocity** ingere estações/pluviômetros (IoT) em tempo real e faz **geofencing** (alerta quando chuva acumulada/nível ultrapassa limiar *na zona de risco*, não no valor global); **Image Analyst** para MDT/LiDAR e detecção de mudança; **ArcGIS Dashboards** como painel da sala de situação. Digital twin da bacia = cenários de cheia e operação de comportas. |
| **Solução — camada IA/LLM (agnóstica)** | Assistente que resume a situação hidrometeorológica em linguagem natural para o coordenador de plantão e **chama as tools de geoprocessamento ArcGIS** (rodar cenário, gerar boletim, listar municípios/bairros sob limiar). LLM agnóstico (Azure OpenAI / Claude / agente local). |
| **Ligação aos dados** | Estações SEMA/CMDEC (~400), CEMADEN, ANA (telemetria), INMET, MDT SGB/LiDAR, níveis do Guaíba (DMAE), previsão numérica. |
| **Cobertura de licença (hipótese)** | 🛒 Velocity, Image Analyst, Spatial Analyst; ✅/🛒 Enterprise+Pro conforme base instalada (a confirmar em inventário). |
| **Viabilidade — (1) JÁ** | Com Enterprise+Pro+Dashboards: geodashboard unificado da sala de situação com dados públicos (estações, CEMADEN, ANA) e alertas por limiar simples. PoC em 30-60 dias. |
| **Viabilidade — (2) Robusta** | + Velocity (tempo real/geofencing) + Spatial Analyst/Image Analyst (modelagem hidráulica e digital twin de bacia) → alerta preditivo e cenários. |
| **Viabilidade contratual** | **Est:** trilho **BIRD/BID** (regras do Banco, imune à trava eleitoral) via Sefaz/SERG; ata PROCERGS para nuvem. **Mun:** convênio/Novo PAC + ata + dispensa p/ PoC (ano 2, sem trava). **Fed:** TED MIDR↔MCTI/CEMADEN + PDTIC. |
| **Dados necessários** | Público: CEMADEN, ANA, INMET, SGB. Interno: telemetria das estações, níveis, cadastro de risco. |
| **Dificuldade / Quick win / PoC** | Difícil (twin completo); mas **PoC de sala de situação com dados públicos = quick win** de alto valor. |
| **Caso análogo** | SC "Protegida e Resiliente" (Banco Mundial); MUN-RECIFE-CENTROOPERACOES. |

### H2 — Plataforma de conformidade e planos de contingência dos 497 municípios (est)

| Campo | Detalhe |
|---|---|
| **Demanda / obrigação legal** | Padronizar, digitalizar e monitorar os planos de contingência e o mapeamento de risco municipais. |
| **Evidência-âncora** | 🟢 **TCE-RS (2025)** — 87 municípios sem plano, 215 desatualizados, **22 recomendações à Casa Militar/CEPDEC** ([TCE-RS](https://tcers.tc.br/noticia/tce-rs-conclui-auditoria-sobre-a-estrutura-das-defesas-civis-nos-municipios-gauchos/)). 🟢 Lei 12.608 (plano de contingência obrigatório). 🟢 PNPDC — Planos Estaduais alinhados. |
| **Impacto (cidadão/gestão)** | Responde diretamente à auditoria; eleva a prontidão dos 497 municípios; base para reconhecimento federal ágil. |
| **Dimensão territorial** | 497 municípios / 10 CREPDECs; áreas de risco por município. |
| **Hipótese analítica** | Plataforma georreferenciada de planos de contingência com painel de conformidade (vigência, cobertura, lacunas) por CREPDEC. |
| **Solução — camada GeoIA (ArcGIS)** | **ArcGIS Enterprise** como repositório central; **Field Maps/Survey123** para os municípios cadastrarem áreas de risco e atualizarem planos; **Dashboards** de conformidade por CREPDEC; **Experience Builder** como portal do município. |
| **Solução — camada IA/LLM** | Assistente que gera minuta de plano de contingência a partir de template + dados de risco do município; verifica completude vs. exigências da Lei 12.608. |
| **Ligação aos dados** | Setorização SGB/CPRM, S2ID, cadastro municipal, camadas da IEDE-RS. |
| **Cobertura de licença (hipótese)** | ✅/🛒 Enterprise; 🛒 Field Maps/Survey123 (licenças de campo por município). |
| **Viabilidade — (1) JÁ** | Painel de conformidade com dados do S2ID e da setorização SGB (públicos) — PoC endereça o TCE. |
| **Viabilidade — (2) Robusta** | + coleta de campo (Field Maps) e portal por município → plataforma estadual viva. |
| **Viabilidade contratual** | **Est (ano 4):** cooperação técnica / PoC agora; estruturação via BIRD ou ata PROCERGS; grande certame só pós-2027. |
| **Dados necessários** | Público: SGB, S2ID, IBGE. Interno: planos municipais, cadastro de risco. |
| **Dificuldade / Quick win / PoC** | Média; **painel de conformidade = quick win** com dados públicos. |

### H3 — Dashboard de Situação integrado (COP) da Defesa Civil (mun)

| Campo | Detalhe |
|---|---|
| **Demanda / obrigação legal** | Integrar CEMADEC, níveis do Guaíba/arroios, ocorrências (linha 199) e status de comportas em painel único. |
| **Evidência-âncora** | 🟢 **TCE-RS — auditoria SIMPRODEC: 40 recomendações + 8 determinações** (eficácia de alertas e integração entre órgãos) ([TCE-RS](https://tcers.tc.br/noticia/tce-rs-finaliza-relatorio-de-auditoria-operacional-sobre-o-sistema-municipal-de-protecao-e-defesa-civil-de-porto-alegre/)). 🟢 CEMADEC 24/7 + POA Clima já existem. |
| **Impacto (cidadão/gestão)** | Decisão mais rápida em evento; resposta direta às determinações; legado auditável. |
| **Dimensão territorial** | Bairros, bacias urbanas, rede de totens/sensores. |
| **Hipótese analítica** | Imagem Operacional Comum (COP) consolidando fontes hoje em silos. |
| **Solução — camada GeoIA (ArcGIS)** | **ArcGIS Dashboards** (mapa-central) + **Velocity** (tempo real: níveis, chuva, viaturas) + **Field Maps** (ocorrências em campo) sobre **Enterprise**. |
| **Solução — camada IA/LLM** | Assistente de plantão: resumo da situação, geração de comunicado, consulta em linguagem natural ("quais bairros acima do limiar?"). |
| **Ligação aos dados** | CEMADEC, DMAE (comportas/EBAPs, níveis), SGB (setores), linha 199, POA Clima. |
| **Cobertura de licença (hipótese)** | ✅/🛒 Enterprise+Dashboards; 🛒 Velocity para tempo real. |
| **Viabilidade — (1) JÁ** | Dashboard com dados públicos SGB/CEMADEC + níveis do Guaíba — PoC de baixo custo, alto valor político. |
| **Viabilidade — (2) Robusta** | + Velocity/Field Maps → COP operacional 24/7 institucionalizada. |
| **Viabilidade contratual** | **Mun (ano 2):** **dispensa ≤ R$ 65.492,11** para PoC; depois ata/pregão ou convênio de reconstrução. Sem trava eleitoral. |
| **Dados necessários** | Público: SGB, CEMADEC, níveis. Interno: comportas, linha 199. |
| **Dificuldade / Quick win / PoC** | Baixa — **quick win prioritário**. |

### H4 — Cadastro vivo de famílias em risco + carta geotécnica georreferenciada (mun)

| Campo | Detalhe |
|---|---|
| **Demanda / obrigação legal** | Cadastro territorial vivo das 20.884 famílias em risco + carta geotécnica de aptidão à urbanização. |
| **Evidência-âncora** | 🟢 **Lei 12.608, art. 22** (carta geotécnica e cadastro obrigatórios). 🟢 Setorização SGB (142 áreas, 20.884 famílias). 🔴/gap: carta geotécnica publicada e cadastro vivo **sem evidência pública localizada** — provável não conformidade. |
| **Impacto (cidadão/gestão)** | Base para evacuação, assistência e reassentamento; fecha gap de compliance apontável em auditoria. |
| **Dimensão territorial** | Domicílio ↔ setor de risco ↔ rota de evacuação ↔ abrigo. |
| **Hipótese analítica** | Ligar risco mapeado (SGB) a cadastro vivo por domicílio, com atualização contínua. |
| **Solução — camada GeoIA (ArcGIS)** | **Field Maps/Survey123** (vistoria e recadastro georreferenciado); **ArcGIS Pro + Spatial Analyst** (carta geotécnica: declividade, geologia, suscetibilidade); **Enterprise** (base cadastral); **Dashboards** (cobertura). |
| **Solução — camada IA/LLM** | Assistente que prioriza vistorias por risco e gera relatório de conformidade por setor. |
| **Ligação aos dados** | SGB/CPRM, CadÚnico, cadastro imobiliário, MDT/LiDAR. |
| **Cobertura de licença (hipótese)** | 🛒 Field Maps/Survey123; ✅/🛒 Pro+Spatial Analyst. |
| **Viabilidade — (1) JÁ** | Carta geotécnica preliminar com dados públicos SGB + MDT — entrega de compliance. |
| **Viabilidade — (2) Robusta** | + coleta de campo contínua (Field Maps) → cadastro vivo integrado ao alerta. |
| **Viabilidade contratual** | **Mun (ano 2):** convênio/PAC + ata; PoC por dispensa. |
| **Dados necessários** | Público: SGB, IBGE, MDT. Interno: CadÚnico, cadastro imobiliário. |
| **Dificuldade / Quick win / PoC** | Média; carta preliminar = quick win. |

### H5 — Telemetria e manutenção preditiva de comportas/EBAPs (digital twin de ativos) (mun)

| Campo | Detalhe |
|---|---|
| **Demanda / obrigação legal** | Prontidão do sistema de proteção contra cheias (14 comportas, 23 EBAPs, 64 km diques). |
| **Evidência-âncora** | 🟢 Falhas de **manutenção desde 2020** agravaram 2024; 🟡 setor com **1 servidor** / DMAE 28,8% dos cargos ([Sul21/TCE](https://sul21.com.br/noticias/geral/2025/12/auditoria-do-tce-identifica-responsabilidade-de-melo-e-marchezan-por-falhas-no-sistema-de-protecao-contra-cheias/)). 🟢 Determinações do TCE. |
| **Impacto (cidadão/gestão)** | Ataca a **causa-raiz** de 2024; reduz dependência de pessoal escasso via automação. |
| **Dimensão territorial** | Ativos pontuais (comportas/EBAPs) + trechos de dique. |
| **Hipótese analítica** | Telemetria IoT dos ativos + gêmeo digital para manutenção preditiva e prontidão. |
| **Solução — camada GeoIA (ArcGIS)** | **ArcGIS Velocity** (telemetria/alertas de ativo); **Field Maps** (inspeção com checklist); **Dashboards** (prontidão); **Pro/3D** (gêmeo digital dos ativos). |
| **Solução — camada IA/LLM** | Assistente de manutenção: prioriza ordens de serviço por risco/condição e gera relatório para o TCE. |
| **Ligação aos dados** | Sensores DMAE, cadastro de ativos, histórico de manutenção. |
| **Cobertura de licença (hipótese)** | 🛒 Velocity; 🛒 Field Maps; ✅/🛒 Pro. |
| **Viabilidade — (1) JÁ** | Inventário/checklist georreferenciado de ativos (Field Maps) + dashboard de prontidão. |
| **Viabilidade — (2) Robusta** | + IoT/Velocity + gêmeo digital → manutenção preditiva. |
| **Viabilidade contratual** | **Mun (ano 2):** convênio/PAC drenagem; ata; PoC por dispensa. |
| **Dados necessários** | Interno: sensores, cadastro de ativos. |
| **Dificuldade / Quick win / PoC** | Alta (IoT); checklist = quick win. |

### H6 — Automação do dossiê georreferenciado de danos para o S2ID (est + fed)

| Campo | Detalhe |
|---|---|
| **Demanda / obrigação legal** | Acelerar reconhecimento federal de SE/ECP e liberação de recursos. |
| **Evidência-âncora** | 🟢 **S2ID** — base federal de reconhecimento; **91% dos municípios** já o usam ([MIDR](https://www.gov.br/mdr/pt-br/assuntos/protecao-e-defesa-civil/sistema-integrado-de-informacoes-sobre-desastres)). 🟢 Fluxo CEMADEN→estado→S2ID (RS, 2024). |
| **Impacto (cidadão/gestão)** | Recurso federal chega mais rápido ao município afetado; reduz retrabalho documental. |
| **Dimensão territorial** | Município afetado; áreas de dano. |
| **Hipótese analítica** | Coleta de dano em campo georreferenciada → dossiê estruturado que alimenta o S2ID automaticamente. |
| **Solução — camada GeoIA (ArcGIS)** | **Survey123/Field Maps** (dano em campo com foto/coordenada); **Image Analyst** (delimitação de área afetada por imagem); **Dashboards** (situação); **Enterprise** (integração ao S2ID). |
| **Solução — camada IA/LLM** | Gera o dossiê de reconhecimento (FIDE/relatórios) a partir dos dados de campo, no formato exigido pelo S2ID. |
| **Ligação aos dados** | S2ID, CEMADEN, imagens de satélite, cadastro municipal. |
| **Cobertura de licença (hipótese)** | 🛒 Survey123/Field Maps, Image Analyst; ✅/🛒 Enterprise. |
| **Viabilidade — (1) JÁ** | Formulário de dano georreferenciado (Survey123) + dashboard — reduz tempo de dossiê. |
| **Viabilidade — (2) Robusta** | + Image Analyst (dano por satélite) + integração automática ao S2ID. |
| **Viabilidade contratual** | **Fed:** TED/ACT MIDR; **Est:** BIRD/ata; cooperação técnica. |
| **Dados necessários** | Público: S2ID, imagens. Interno: dados de campo. |
| **Dificuldade / Quick win / PoC** | Média; formulário = quick win. |

### H7 — Integração nacional de dados de risco (IDE conforme INDE) (fed)

| Campo | Detalhe |
|---|---|
| **Demanda / obrigação legal** | Integrar CENAD + CEMADEN + SGB + ANA + S2ID + estados em imagem operacional comum nacional. |
| **Evidência-âncora** | 🟢 **PNPDC 2025-2035 — 163 metas** de ação coordenada União–estados–municípios ([PNPDC/MIDR](https://www.gov.br/mdr/pt-br/composicao/secretarias-nacionais/protecao-e-defesa-civil)). 🟢 Lei 12.608 (sistema de informações e monitoramento). 🟡 INDE (OGC/ISO) requisito de edital. |
| **Impacto (cidadão/gestão)** | Coordenação federativa; apoio à decisão de alocação; cumpre metas do PNPDC. |
| **Dimensão territorial** | Nacional. |
| **Hipótese analítica** | Camada de interoperabilidade (INDE) unificando fontes hoje fragmentadas. |
| **Solução — camada GeoIA (ArcGIS)** | **ArcGIS Enterprise** como IDE nacional (serviços OGC/ISO); **Knowledge** (grafo desastre↔recurso↔obra↔resultado); **Dashboards** executivos; **Image Server** para imagery. |
| **Solução — camada IA/LLM** | Assistente executivo nacional: consulta em linguagem natural sobre situação, recursos e metas do PNPDC. |
| **Ligação aos dados** | CEMADEN, SGB, ANA, S2ID, INDE, dados estaduais. |
| **Cobertura de licença (hipótese)** | 🛒 Enterprise (escala nacional), Knowledge, Image Server. |
| **Viabilidade — (1) JÁ** | Portal de dados de risco integrando fontes públicas (conforme INDE). |
| **Viabilidade — (2) Robusta** | + grafo de conhecimento + analytics de alocação. |
| **Viabilidade contratual** | **Fed (ano 4):** PDTIC + ata SRP no PNCP + TED/ACT; financiamento internacional. |
| **Dados necessários** | Público: sistemas nacionais. Interno: bases SEDEC/CENAD. |
| **Dificuldade / Quick win / PoC** | Alta; portal de fontes públicas = quick win. |

### H8 — GeoAI de detecção de dano e apoio à alocação de recursos (fed) 🟡

| Campo | Detalhe |
|---|---|
| **Demanda / obrigação legal** | Priorizar territorialmente os R$ 4 bi (gestão de riscos) e o Novo PAC por exposição/vulnerabilidade; detectar dano em escala. |
| **Evidência-âncora** | 🟢 Programa de gestão de riscos ampliado para **R$ 4 bi** (PPA 2024-2027). 🟢 **Novo PAC prevenção** (Portaria MCID 161/2025). 🟡 dedução sobre priorização espacial (padrão de esfera). |
| **Impacto (cidadão/gestão)** | Gasto público mais eficiente e equitativo; transparência. |
| **Dimensão territorial** | Nacional; áreas de dano/risco. |
| **Hipótese analítica** | Índice territorial de risco + detecção de dano por imagem para priorização. |
| **Solução — camada GeoIA (ArcGIS)** | **Image Analyst + GeoAI toolbox** (detecção de dano SAR/óptico, change detection); **Spatial Analyst** (índice de exposição); **Dashboards** de alocação. |
| **Solução — camada IA/LLM** | Relatório de priorização e justificativa de alocação por território. |
| **Ligação aos dados** | Sentinel/Landsat, SGB, IBGE (vulnerabilidade), S2ID. |
| **Cobertura de licença (hipótese)** | 🛒 Image Analyst, GeoAI, Spatial Analyst. |
| **Viabilidade — (1) JÁ** | Índice de risco com dados públicos (SGB+IBGE) — PoC de priorização. |
| **Viabilidade — (2) Robusta** | + GeoAI de dano por imagem em escala. |
| **Viabilidade contratual** | **Fed:** PDTIC + financiamento internacional (Fundo Clima/BIRD). |
| **Dados necessários** | Público: satélite, SGB, IBGE. Interno: S2ID, PAC. |
| **Dificuldade / Quick win / PoC** | Alta; índice = quick win. |

### H9 — Painel geoespacial de execução da reconstrução (est) 🟡

| Campo | Detalhe |
|---|---|
| **Demanda / obrigação legal** | Transparência e equidade regional da execução do Funrigs (R$ 13,7 bi, 186 ações). |
| **Evidência-âncora** | 🟡 [Funrigs R$ 13,7 bi](https://www.estado.rs.gov.br/fundo-do-plano-rio-grande-aprovou-r-13-7-bilhoes-em-mais-de-180-acoes-de-reconstrucao-no-estado). 🟢 Plano Rio Grande (Lei 16.134/2024). |
| **Impacto (cidadão/gestão)** | Prestação de contas visível (baixo risco eleitoral, alto apelo). |
| **Dimensão territorial** | 497 municípios por eixo. |
| **Solução — camada GeoIA (ArcGIS)** | **Dashboards + Experience Builder** sobre **Enterprise**; **Field Maps** para avanço físico de obra. |
| **Solução — camada IA/LLM** | Resumo executivo automático de execução por eixo/região. |
| **Ligação aos dados** | Funrigs, obras, S2ID, cadastro de municípios. |
| **Cobertura de licença (hipótese)** | ✅/🛒 Enterprise+Dashboards. |
| **Viabilidade — (1/2)** | JÁ: painel com dados de execução públicos. Robusta: + acompanhamento físico de obra em campo. |
| **Viabilidade contratual** | **Est (ano 4):** narrativa de transparência é segura no período eleitoral; ata/BIRD. |
| **Dificuldade / Quick win / PoC** | Baixa-média — quick win. |

### H10 — GeoAI de fiscalização de novas edificações em área de risco (mun) 🟡

| Campo | Detalhe |
|---|---|
| **Demanda / obrigação legal** | Fiscalizar/controlar novas edificações em áreas de risco (Lei 12.608, art. 22). |
| **Evidência-âncora** | 🟢 Lei 12.608 (fiscalização de edificações). 🟡 pressão de ocupação em 51 setores de muito alto risco. |
| **Solução — camada GeoIA (ArcGIS)** | **Image Analyst + modelos pré-treinados (Building Footprint)** para detectar novas edificações; change detection; **Field Maps** para vistoria; **Dashboards**. |
| **Solução — camada IA/LLM** | Notifica e prioriza vistorias; gera auto/relatório. |
| **Ligação aos dados** | Imagem de alta resolução, setorização SGB, cadastro. |
| **Cobertura de licença (hipótese)** | 🛒 Image Analyst; 🛒 Field Maps. |
| **Viabilidade — (1/2)** | JÁ: detecção pontual com imagem pública. Robusta: pipeline de detecção contínua. |
| **Viabilidade contratual** | **Mun (ano 2):** ata/pregão; PoC por dispensa. |
| **Dificuldade / Quick win / PoC** | Média-alta. |

---

## Hipóteses Priorizadas

| Hipótese | Evidência | Mandato legal | Impacto cidadão | Viab. técnica | Viab. contratual | Timing político | Velocidade demo | Risco | Prioridade | Justificativa |
|---|---|---|---|---|---|---|---|---|---|---|
| **H1** Alerta/Digital twin | 🟢 | Lei 12.608 + Plano Rio Grande + PNPDC | Máximo | Média | Alta (BIRD/PAC) | Est ⚠️/Mun ✅/Fed ⚠️ | Média (PoC rápido) | Médio | **1ª** | Dinheiro carimbado + objetivo idêntico do empréstimo |
| **H3** Dashboard COP (mun) | 🟢 | TCE (40+8) | Alto | Alta | Alta (dispensa) | Mun ✅ favorável | **Rápida** | Baixo | **2ª** | Quick win que responde à auditoria; ano 2 |
| **H2** Conformidade 497 (est) | 🟢 | TCE (22 rec) + Lei 12.608 | Alto | Média | Média (coop./BIRD) | Est ⚠️ | Média | Baixo | **3ª** | Recomendação direta à CEPDEC |
| **H4** Cadastro+carta geotécnica (mun) | 🟢 (gap) | Lei 12.608 art. 22 | Alto | Média | Alta (convênio/PAC) | Mun ✅ | Média | Médio | **4ª** | Fecha não conformidade legal |
| **H6** Dossiê S2ID (est/fed) | 🟢 | Lei 12.608 + S2ID | Alto | Média | Média (TED/ACT) | Fed/Est ⚠️ | Média | Baixo | **5ª** | Acelera recurso federal; reuso alto |
| **H7** Integração nacional INDE (fed) | 🟢 | PNPDC + Lei 12.608 | Alto | Alta (compl.) | Média (PDTIC) | Fed ⚠️ | Lenta | Alto | **6ª** | Estruturante; entra pela agenda PNPDC |
| **H5** Telemetria comportas (mun) | 🟢/🟡 | TCE (determ.) | Alto | Alta | Alta (PAC) | Mun ✅ | Lenta (IoT) | Alto | **7ª** | Ataca causa-raiz; depende de IoT |
| **H9** Painel Funrigs (est) | 🟡 | Plano Rio Grande | Médio | Baixa | Alta (ata) | Est ✅ (transparência) | **Rápida** | Baixo | **8ª** | Seguro no período eleitoral |
| **H8** GeoAI dano/alocação (fed) | 🟢/🟡 | PPA R$ 4 bi + Novo PAC | Médio | Alta | Média (fin. intl.) | Fed ⚠️ | Média | Alto | **9ª** | Depende de dado e maturidade |
| **H10** GeoAI edificações (mun) | 🟡 | Lei 12.608 | Médio | Média | Média (ata) | Mun ✅ | Média | Médio | **10ª** | Complementar à fiscalização |

**Regras de desempate aplicadas:** (1) hipóteses 🟢 ancoradas em mandato legal no topo; (2) no RS/federal (ano 4), priorizam-se caminhos por ata vigente / financiamento internacional / cooperação; (3) em POA (ano 2), quick wins de alta visibilidade que respondem ao TCE sobem.

## Quick Wins com Dados Públicos

| Quick win | Demanda atacada | Solução | Dados (público/interno) | Visualização | Benefício (gestor/cidadão) | Esforço | Contratação |
|---|---|---|---|---|---|---|---|
| Sala de situação estadual (PoC) | Alerta fragmentado (est) | Dashboards + Velocity | Público (CEMADEN, ANA, SEMA) | Painel/mapa tempo real | Coordenação dos 497; responde ao BIRD | Baixo | Coop. técnica / ata PROCERGS |
| Dashboard COP municipal (PoC) | Integração/alerta (mun, TCE) | Dashboards | Público (SGB, CEMADEC, níveis) | Painel de situação | Responde às determinações do TCE | Baixo | Dispensa ≤ R$ 65.492,11 |
| Painel de conformidade 497 municípios | Planos desatualizados (est, TCE) | Dashboards + Enterprise | Público (S2ID, SGB) | Painel por CREPDEC | Endereça 22 recomendações | Baixo | Coop. técnica |
| Carta geotécnica preliminar | Compliance Lei 12.608 (mun) | Pro + Spatial Analyst | Público (SGB, MDT) | Mapa de aptidão | Fecha gap legal | Médio | Dispensa/convênio |
| Painel de execução Funrigs | Transparência reconstrução (est) | Dashboards + Experience Builder | Público (Funrigs) | Painel por eixo/região | Prestação de contas | Baixo | Ata |
| Portal nacional de risco (fontes públicas) | Fragmentação (fed) | Enterprise (INDE/OGC) | Público (CEMADEN, SGB, ANA) | Geoportal | Metas PNPDC | Médio | PDTIC/ACT |

## PoCs e Pilotos Potenciais

1. **PoC "Sala de Situação POA" (mun, 30-60 dias):** Dashboard integrando SGB + CEMADEC + níveis do Guaíba (dados públicos). Hipóteses H3 (+ semente de H1). Patrocínio: Escritório de Reconstrução + DCPA. Contratação: dispensa. Entregável demonstrável ao TCE ainda em 2026.
2. **PoC "Conformidade 497" (est, 60 dias):** painel de planos de contingência (S2ID + SGB). Hipótese H2. Patrocínio: CEPDEC/Casa Militar. Contratação: cooperação técnica (compatível com ano eleitoral).
3. **Piloto "Digital Twin Taquari-Antas" (est, 6-12 meses):** modelagem hidráulica + alerta preditivo de bacia. Hipótese H1. Financiamento: **BIRD Pró-Resiliência** (elegível ao objetivo declarado). Patrocínio: Sefaz/SERG + CEPDEC + IPH/UFRGS.
4. **PoC "Dossiê S2ID georreferenciado" (est+fed, 60 dias):** Survey123 de dano + geração de FIDE. Hipótese H6. Contratação: ACT/TED.
5. **PoC "Portal Nacional de Risco" (fed, 90 dias):** integração de fontes públicas conforme INDE. Hipótese H7. Entrada pela agenda de metas do PNPDC / PDTIC.

---
> **Próximo passo:** `fvi-04-narrativa-executiva-gov` — traduzir as hipóteses priorizadas em narrativa para gestores (por esfera).
