---
orgao: Defesa Civil (SINPDEC) — três esferas
esfera: municipal / estadual / federal
etapa: 5
titulo: Mapa de Tradução (Governo)
data: 2026-08-11
status: concluído
proxima_etapa: 06-playbook
---

# Mapa de Tradução — Defesa Civil (três esferas)

> Acelerador demanda→solução organizado pelo **ciclo de gestão de risco e desastres** (prevenção → preparação → resposta → recuperação) e pelos domínios adjacentes. Marcação: 🟢/🟡 = há evidência do órgão (Etapa 1); *(padrão da esfera)* = linha genérica sem evidência específica. 🛒 = produto que exige aquisição. Esfera: **M** municipal · **E** estadual · **F** federal.

## Matriz Demanda Pública → Solução Territorial

| Domínio (ciclo) | Demanda / obrigação legal | Sinais comuns | Impacto (cidadão/gestão/fiscal/jurídico) | Dimensão territorial | Abordagem analítica | Solução GIS/IA (produtos ArcGIS) | PoC / piloto | Valor público |
|---|---|---|---|---|---|---|---|---|
| **Prevenção — mapeamento de risco** (M/E/F) | Mapear áreas suscetíveis + carta geotécnica (Lei 12.608) 🟢 | Setorização SGB desatualizada; ocupação de encostas | Vidas; conformidade legal; risco de auditoria | Setores de risco, encostas | Suscetibilidade multicritério + deep learning | ArcGIS Pro + Spatial Analyst + GeoAI 🛒; Image Analyst 🛒 | Carta preliminar com dados SGB | Prevenção baseada em evidência |
| **Prevenção — monitoramento hidrometeorológico** (M/E/F) | Alerta precoce; mitigação de enchentes 🟢 (BIRD/PNPDC) | Alerta tardio; dados fragmentados | Vidas; legado; cumpre financiamento | Bacia hidrográfica | Modelagem hidrológica + IoT em tempo real | ArcGIS Velocity 🛒 + Spatial Analyst 🛒 + Dashboards | Sala de situação com dados públicos | Horas de antecedência |
| **Prevenção — fiscalização de ocupação** (M) | Controle de edificações em área de risco (Lei 12.608) 🟡 | Ocupação irregular em encostas | Redução de exposição; jurídico | Lotes em setor de risco | Change detection por imagem | Image Analyst + Building Footprint 🛒; Field Maps 🛒 | Detecção pontual com imagem pública | Menos gente em risco |
| **Preparação — planos de contingência** (E/F) | Planos de contingência por município (Lei 12.608) 🟢 (TCE) | 215 planos desatualizados (RS) | Prontidão; responde à auditoria | 497 municípios / CREPDECs | Plataforma + painel de conformidade | Enterprise + Field Maps 🛒 + Dashboards | Painel S2ID + SGB | Prontidão coordenada |
| **Preparação — cadastro de risco** (M) | Cadastro vivo de famílias em risco 🟢 (gap) | 20.884 famílias sem base viva | Evacuação; assistência | Domicílio ↔ setor | Coleta de campo + base territorial | Survey123/Field Maps 🛒 + Enterprise | Recadastro piloto de um setor | Evacuação assertiva |
| **Preparação — rotas e abrigos** (M/E) *(padrão da esfera)* | Plano de evacuação e abrigos | Rotas não definidas; capacidade desconhecida | Segurança na evacuação | Vias, abrigos | Roteirização + alocação | Network Analyst 🛒 + Dashboards | Rotas de um bairro-piloto | Evacuação organizada |
| **Resposta — imagem operacional comum** (M/E/F) | Coordenação em tempo real (TCE 40+8) 🟢 | Telas separadas; silos | Decisão mais rápida | Bairro/bacia/nacional | COP tempo real | Dashboards + Velocity 🛒 + Field Maps 🛒 | Dashboard com dados públicos | Comando unificado |
| **Resposta — reconhecimento federal** (E/F) | Reconhecimento de SE/ECP e recurso (S2ID) 🟢 | Dossiê documental lento | Recurso mais rápido | Município afetado | Dossiê georreferenciado de danos | Survey123 🛒 + Image Analyst 🛒 + Enterprise | Formulário de dano + FIDE | Socorro mais rápido |
| **Recuperação — dano por sensoriamento** (E/F) | Avaliar dano e priorizar reconstrução 🟡 | Dano estimado sem base espacial | Reconstrução equitativa | Área afetada | Detecção de dano SAR/óptico | Image Analyst + GeoAI 🛒; Image Server 🛒 | Detecção em evento passado | Reconstrução dirigida |
| **Recuperação — execução de obras** (M/E) | Transparência da reconstrução 🟡 (Funrigs) | Execução sem visão territorial | Prestação de contas | 497 municípios / bairros | Painel físico-financeiro | Dashboards + Experience Builder + Field Maps 🛒 | Painel Funrigs / obras POA | Transparência |
| **Governança — integração nacional** (F) | Interoperabilidade INDE; 163 metas PNPDC 🟢 | Sistemas nacionais em silos | Coordenação federativa | Nacional | IDE + grafo de conhecimento | Enterprise (OGC/ISO) 🛒 + Knowledge 🛒 | Portal de fontes públicas | Sistema nacional coeso |
| **Governança — infraestrutura de ativos** (M) | Prontidão de comportas/EBAPs (TCE) 🟢 | Manutenção deficiente; pessoal escasso | Ataca causa-raiz de 2024 | Ativos pontuais | Telemetria + gêmeo digital | Velocity 🛒 + Field Maps 🛒 + Pro/3D | Checklist georreferenciado | Infraestrutura confiável |

## Associação Demanda Pública × Tecnologia

| Demanda | Base legal | Capacidades GIS (ArcGIS) | Capacidades IA | Dados (público/interno) | Visualização para gestor | Formato de demonstração |
|---|---|---|---|---|---|---|
| Alerta precoce de bacia | Lei 12.608 + Plano Rio Grande + BIRD | Pro/Spatial Analyst (hidrologia), Velocity (IoT/geofencing), Dashboards | ML de vazão/nível; LLM de boletim | Público: CEMADEN, ANA, INMET, SGB / Interno: telemetria | Painel de sala de situação | Piloto de bacia (BIRD) |
| Conformidade dos planos | Lei 12.608 + PNPDC | Enterprise, Field Maps, Dashboards | LLM gera minuta de plano | Público: S2ID, SGB / Interno: planos | Painel por CREPDEC | PoC dados públicos |
| Imagem operacional comum | PNPDEC + TCE | Dashboards, Velocity, Field Maps | Assistente de plantão (LLM) | Público: SGB, CEMADEN / Interno: níveis, 199 | COP / sala de situação | Dashboard rápido |
| Cadastro de risco + carta geotécnica | Lei 12.608 art. 22 | Field Maps, Pro/Spatial Analyst | Priorização de vistoria (LLM) | Público: SGB, MDT / Interno: CadÚnico | Mapa de aptidão + cobertura | Carta preliminar |
| Dossiê S2ID | Lei 12.608 + S2ID | Survey123, Image Analyst, Enterprise | Gera FIDE/relatório (LLM) | Público: S2ID, satélite / Interno: campo | Situação de danos | Formulário + dossiê |
| Detecção de dano | PPA gestão de riscos + Novo PAC | Image Analyst, GeoAI, Image Server | Deep learning de dano | Público: Sentinel/Landsat / Interno: — | Mapa de dano | Detecção retrospectiva |
| Integração nacional | PNPDC + Lei 12.608 + INDE | Enterprise (OGC/ISO), Knowledge, Image Server | Grafo + assistente executivo | Público: sistemas nacionais / Interno: SEDEC | Geoportal + painel executivo | Portal de fontes públicas |
| Telemetria de ativos | TCE (determinações) | Velocity, Field Maps, Pro/3D | Manutenção preditiva | Interno: sensores DMAE | Painel de prontidão | Checklist de ativos |

## Taxonomia de Demandas Públicas (Defesa Civil e adjacências)

**Defesa civil / gestão de risco** *(domínio central)*
- Subdemandas: mapeamento de risco; carta geotécnica; monitoramento e alerta; plano de contingência; cadastro de famílias; resposta a desastre; reconhecimento (S2ID); recuperação/reconstrução.
- Base legal: Lei 12.608/2012 (PNPDEC); PNPDC 2025-2035; Plano Rio Grande (RS); Novo PAC prevenção.
- Sinais: alerta tardio; planos vencidos; áreas de risco sem carta; dossiê lento; execução sem visão espacial.
- Dados: público (SGB/CPRM, CEMADEN, ANA, S2ID, IBGE) / interno (telemetria, cadastro, planos).
- Classes de solução (ArcGIS): Enterprise (IDE de risco); Pro/Spatial Analyst (suscetibilidade/hidrologia); Velocity (tempo real); Image Analyst/GeoAI (dano/mudança); Field Maps/Survey123 (campo); Dashboards (COP).
- Indicadores: lead time; % planos em dia; % área mapeada; tempo de reconhecimento; execução de obras.

**Recursos hídricos / hidrologia** *(adjacente — E/F)*
- Subdemandas: monitoramento de bacias; modelagem hidráulica; níveis/vazão. Base: PNRH; Lei 12.608. Solução: Pro/Spatial Analyst + Velocity + digital twin. Indicadores: cobertura de estações; acurácia da previsão.

**Geologia / risco geotécnico** *(adjacente — M/F)*
- Subdemandas: setorização de risco; monitoramento de encostas. Base: Lei 12.608; SGB/CPRM. Solução: Image Analyst + InSAR + GeoAI. Indicadores: setores mapeados; movimento detectado.

**Planejamento urbano / uso do solo** *(adjacente — M)*
- Subdemandas: cotas de ocupação em área inundável; fiscalização de edificações; Plano Diretor. Base: Estatuto da Cidade; PDDUA; Lei 12.608. Solução: ArcGIS Urban 🛒 + Image Analyst (change detection). Indicadores: ocupação irregular detectada; conformidade do PDDUA.

**Infraestrutura / obras** *(adjacente — M/E)*
- Subdemandas: prontidão de ativos de proteção; execução de obras de drenagem/contenção. Base: Novo PAC; TCE. Solução: Velocity (IoT) + Field Maps + Dashboards. Indicadores: prontidão de ativos; % obra executada.

**Assistência social / vulnerabilidade** *(adjacente — M/E)*
- Subdemandas: famílias em risco; abrigos; realocação. Base: SUAS; Lei 12.608. Solução: Field Maps + Business Analyst 🛒 + Dashboards. Indicadores: famílias cadastradas; capacidade de abrigo.

**Governança de dados / interoperabilidade** *(transversal — F, com reflexo E/M)*
- Subdemandas: IDE de risco; integração de sistemas nacionais; INDE. Base: PNPDC; Decreto 6.666/2008 (INDE). Solução: Enterprise (OGC/ISO) + Knowledge + Image Server. Indicadores: fontes integradas; metas do PNPDC atendidas.

---
> **Próximo passo:** `fvi-07-playbook-gov` — registrar o caso na biblioteca de conhecimento.
