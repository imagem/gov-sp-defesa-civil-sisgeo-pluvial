---
orgao: Defesa Civil (SINPDEC) — três esferas
esfera: municipal / estadual / federal
etapa: 6
titulo: Playbook e Biblioteca de Casos (Governo)
data: 2026-08-11
status: concluído
proxima_etapa: 07-governanca
---

# Playbook — Defesa Civil (três esferas)

## Ficha do Caso

| Campo | Detalhe |
|---|---|
| **ID do caso** | `GOV-DEFESACIVIL-RS-2026-01` |
| Esfera | Multiesfera (municipal + estadual + federal) — SINPDEC |
| Órgão(s) | COMDEC/DCPA Porto Alegre · CEPDEC/RS (Casa Militar) · SEDEC/MIDR + CENAD/CEMADEN/SGB |
| Porte / População | Capital ~1,3 mi (mun) · 497 municípios ~10,9 mi hab. (est) · nacional (fed) |
| Secretaria(s) | Escritório de Reconstrução, DMAE, SMAMUS (mun); SERG, Sefaz, SPGG (est); SEDEC (fed) |
| Domínio de gestão | Defesa civil / gestão de risco (+ hidrologia, geologia, planejamento urbano, infraestrutura) |
| Base legal | Lei 12.608/2012 (PNPDEC); PNPDC 2025-2035; Plano Rio Grande (Lei 16.134/2024); Novo PAC prevenção |
| Fonte de recurso | BIRD Pró-Resiliência US$ 359,6 mi + BID US$ 500 mi; Funrigs R$ 13,7 bi; Reconstrução POA >R$ 7 bi; PPA gestão de riscos R$ 4 bi; Novo PAC |
| Modalidade de contratação | Financiamento internacional (regras do Banco); ata (PROCERGS/PROCEMPA); dispensa (PoC); TED/ACT (fed) |
| Status | Diagnóstico (Etapas 1-7 concluídas) |

### Demanda pública / obrigação legal
1. Alerta precoce e monitoramento hidrometeorológico (Lei 12.608 + Plano Rio Grande + BIRD).
2. Planos de contingência e mapeamento de risco dos 497 municípios (TCE-RS: 22 recomendações à CEPDEC).
3. Imagem operacional comum municipal — integração e eficácia de alertas (TCE-RS: 40 rec + 8 determinações, POA).
4. Cadastro vivo de famílias em risco + carta geotécnica (Lei 12.608, art. 22 — gap em POA).
5. Reconhecimento federal ágil (S2ID) e integração nacional de dados (PNPDC 163 metas).

### Contexto territorial
O risco no RS é hidrológico (bacias Taquari-Antas, Caí, Sinos, Gravataí, Jacuí, Guaíba) e geotécnico (encostas urbanas — 51 setores de muito alto risco em POA). O sistema opera em escalas encaixadas: CEMADEN/SEDEC (nacional) → CEPDEC/RS (bacia/regional, 10 CREPDECs) → COMDEC/POA (bairro). A geotecnologia costura essas escalas via IDE interoperável (INDE).

### Solução proposta (faseada)
- **Fase 1 — Quick wins (com licenças existentes / dados públicos):** salas de situação (dashboards) municipal e estadual; painel de conformidade dos 497; carta geotécnica preliminar; painel de execução da reconstrução. Contratação por dispensa/cooperação — sem depender de novo orçamento.
- **Fase 2 — Estruturante:** plataforma GIS corporativa (Enterprise) como IDE de risco em cada esfera; cadastro de campo (Field Maps/Survey123); dossiê S2ID automatizado; telemetria de ativos.
- **Fase 3 — Avançada:** digital twin de bacia (Taquari-Antas) via BIRD; GeoAI de dano/suscetibilidade; integração nacional (Knowledge + INDE); camada LLM de apoio à decisão.

### Arquitetura resumida
```
  FONTES DE DADOS                     PROCESSAMENTO (ArcGIS)            INTEGRAÇÃO / SISTEMAS         ENTREGÁVEIS
  ─────────────                       ──────────────────────           ─────────────────────         ───────────
  Público:                            ArcGIS Pro + Spatial Analyst      S2ID (reconhecimento)         Sala de situação (COP)
   • CEMADEN (alertas/pluviômetros) ─▶  (hidrologia, suscetibilidade) ─▶ IEDE-RS / INDE          ─▶   Dashboards de gestão
   • SGB/CPRM (setorização)            ArcGIS Image Analyst + GeoAI      PROCERGS/PROCEMPA (nuvem)      Painel de conformidade 497
   • ANA / INMET (hidrometeo)          (dano, change detection)          DMAE (comportas/níveis)       Carta geotécnica
   • S2ID (desastres)                  ArcGIS Velocity (IoT/geofencing)  CadÚnico / cadastro           Digital twin de bacia
   • Sentinel/Landsat (imagem)         ArcGIS Field Maps/Survey123       CEMADEC / POA Clima           Dossiê S2ID automatizado
  Interno:                             ArcGIS Enterprise (IDE de risco)        │                       Alerta espacializado
   • Telemetria de estações      ─────────────────┼──────────────────────────┐ │                ┌──▶ Relatórios (LLM)
   • Cadastro de risco                             ▼                          ▼ ▼                │
   • Níveis / comportas               CAMADA LLM (agnóstica: Azure/Claude/agente) ───────────────┘
                                       chama as Tools de geoprocessamento ArcGIS (cenário, boletim, FIDE, priorização)
```

### Dados utilizados
- **Públicos:** CEMADEN, SGB/CPRM, ANA, INMET, S2ID, Sentinel/Landsat, IBGE, Funrigs.
- **Internos:** telemetria de estações (SEMA/CMDEC), níveis e comportas (DMAE), cadastro de risco, CadÚnico, planos de contingência municipais.

### Narrativa aplicada (por stakeholder)
- **Prefeito / Governador:** legado auditável de resiliência; recurso já contratado virando capacidade permanente.
- **Coordenador de Defesa Civil (carreira/militar):** ferramenta que dá horas de antecedência e reduz dependência de pessoal escasso.
- **Diretor de TI (PROCEMPA/PROCERGS):** plataforma interoperável (INDE/OGC), dado exportável, sem lock-in — parceria, não substituição.
- **Servidor de carreira / Sefaz / SERG:** conformidade legal (Lei 12.608 / TCE) e elegibilidade ao financiamento internacional.

### Objeções prováveis

| Objeção | Contexto gov | Resposta recomendada |
|---|---|---|
| "Não temos orçamento" | Comum, mas aqui é falso | Recurso já carimbado: BIRD/BID, Funrigs, Reconstrução POA, Novo PAC — a proposta se encaixa neles |
| "Estamos em ano eleitoral (RS/fed)" | Ano 4, travas Art. 73/LRF | Priorizar ata vigente, cooperação/PoC e o trilho BIRD (regras do Banco, imune à trava); fechamento estrutural pós-2027 |
| "Já temos QGIS/PostGIS / sala de situação" | PROCERGS/PROCEMPA, IEDE-RS | Integração como IDE (Enterprise) conforme INDE, não substituição; híbrido PostGIS+ArcGIS é comum |
| "A empresa de TI quer fazer internamente" | PROCERGS/PROCEMPA gatekeeper | Tratar como parceira: ArcGIS embarcado na ata/nuvem da estatal |
| "Muda a gestão e o projeto morre" | 2º mandatos terminam; transição federal | Ancorar em mandato legal (Lei 12.608) e operar por carreira; institucionalizar o uso diário |
| "Isso vira elefante branco" | Ceticismo pós-desastre | Começar por PoC de dados públicos que responde ao TCE em 60 dias — valor antes de contrato grande |

### Resultado esperado
- **Curto prazo (PoC):** sala de situação demonstrável ao TCE; painel de conformidade dos 497.
- **Médio prazo:** cadastro de risco vivo; dossiê S2ID mais rápido; carta geotécnica publicada.
- **Longo prazo:** digital twin de bacia com alerta preditivo; integração nacional conforme PNPDC; redução mensurável de tempo de alerta e de exposição.

### Aprendizados
1. Em defesa civil, a evidência mais forte não é o plano de governo — é o **contrato de financiamento** (BIRD nomeia "alerta precoce") e o **achado de auditoria** (TCE).
2. **Ciclos desalinhados** exigem estratégias opostas na mesma semana: POA (ano 2) fecha; RS/fed (ano 4) só PoC/ata/financiamento.
3. O trilho de **financiamento internacional** é o grande desbloqueador em ano eleitoral estadual.
4. A **empresa de TI estatal** (PROCERGS/PROCEMPA) decide o caminho de nuvem — engajar no dia 1.
5. Gap de compliance (carta geotécnica, cadastro vivo) = oportunidade de venda de alto valor.

### Reuso em outros órgãos

| Esfera | Porte | Domínio | Hipótese reutilizável | Ajuste necessário |
|---|---|---|---|---|
| Municipal | Médio/grande com risco | Defesa civil | Sala de situação + cadastro de risco | Trocar bacia/setores; confirmar empresa de TI municipal |
| Estadual | Estados com desastre recorrente (SC, PR, BA, MG) | Defesa civil | Conformidade de municípios + digital twin de bacia | Financiador (Banco Mundial em SC); estatal de TI local |
| Federal | Órgãos do SINPDEC / MCTI | Integração nacional | IDE de risco (INDE) + dossiê S2ID | Portfólio e PDTIC do órgão |
| Municipal | Pequeno (<50k) | Defesa civil | Cadastro + alerta (ArcGIS Online) | Consórcio intermunicipal para escala |

## Padrões Reutilizáveis

**Demandas recorrentes por esfera:** municipal → sala de situação, cadastro de risco, carta geotécnica; estadual → conformidade de municípios, monitoramento de bacia, dossiê de danos; federal → integração nacional, S2ID, alocação de recurso.

**Narrativas que funcionam:** "recurso já contratado virando capacidade permanente"; "a auditoria virando ferramenta"; "horas de antecedência salvam vidas"; "legado auditável independente de eleição".

| Argumento de valor | Para quem (stakeholder) | Por que funciona no gov |
|---|---|---|
| Recurso carimbado (BIRD/PAC/Funrigs) | Sefaz/SERG/prefeito | Remove a objeção nº 1 (orçamento) |
| Conformidade legal e com o TCE | Coordenador DC / carreira | Obrigação, não escolha — sobrevive a transição |
| Vidas salvas por lead time | Gestor político | Impacto tangível e comunicável ao cidadão |
| Interoperabilidade INDE, sem lock-in | Diretor de TI | Neutraliza o gatekeeper e o medo de aprisionamento |

| Objeção frequente no gov | Frequência | Resposta padrão |
|---|---|---|
| "Não temos orçamento" | Alta | Encaixe em financiamento já contratado |
| "Ano eleitoral trava" | Alta (E/F em 2026) | Ata + cooperação + trilho do Banco |
| "Já temos ferramenta" | Alta | Integração como IDE, não substituição |
| "Vira elefante branco" | Média | PoC de dados públicos primeiro |

**O que vira playbook:** "Defesa Civil Estadual com Financiamento Multilateral" (RS/SC); "Sala de Situação Municipal responde ao TCE" (POA); "Integração Nacional de Risco conforme PNPDC" (SEDEC).

## Estrutura da Biblioteca

```
BIBLIOTECA DE CASOS — GOVERNO
└── Esfera
    ├── Municipal ── Domínio (defesa_civil) ── Porte (grande) ── Mandato (Lei 12.608)
    │                 └── Fonte (Reconstrução/PAC) ── Contratação (dispensa/convênio)
    │                     └── Solução (COP/cadastro) ── Maturidade (diagnóstico) ── Reuso (alto)
    ├── Estadual ─── Domínio (defesa_civil) ── Porte (497 mun.) ── Mandato (Lei 12.608 + Plano RG)
    │                 └── Fonte (BIRD/BID/Funrigs) ── Contratação (financiamento intl./ata)
    │                     └── Solução (conformidade/twin) ── Maturidade (diagnóstico) ── Reuso (alto)
    └── Federal ──── Domínio (defesa_civil) ── Escala (nacional) ── Mandato (Lei 12.608 + PNPDC)
                      └── Fonte (PPA R$4bi/fin. intl.) ── Contratação (PDTIC/TED/ACT)
                          └── Solução (integração INDE/S2ID) ── Maturidade (diagnóstico) ── Reuso (alto)
```

### Ficha resumida do caso (formato biblioteca)
```yaml
id: GOV-DEFESACIVIL-RS-2026-01
orgao: Defesa Civil SINPDEC (POA / CEPDEC-RS / SEDEC-MIDR)
esfera: [municipal, estadual, federal]
porte: capital + 497 municipios + nacional
dominio: [defesa_civil, recursos_hidricos, geologia, infraestrutura]
demanda_principal: alerta precoce + conformidade de planos + integracao nacional de risco
base_legal: [Lei 12.608/2012, PNPDC 2025-2035, Plano Rio Grande, Novo PAC]
solucao_proposta: >
  IDE de risco (Enterprise) + sala de situacao (Dashboards/Velocity) + cadastro de campo
  (Field Maps/Survey123) + GeoAI (Image Analyst) + digital twin de bacia + camada LLM
maturidade: diagnostico
narrativa_dominante: recurso ja contratado virando capacidade permanente; auditoria virando ferramenta
stakeholder_entrada: Escritorio de Reconstrucao (mun) / Casa Militar-CEPDEC (est) / carreira SEDEC (fed)
fonte_recurso: [BIRD 359.6M, BID 500M, Funrigs 13.7bi, Reconstrucao POA 7bi, PPA 4bi, Novo PAC]
modalidade_contratacao: [financiamento_internacional, ata, dispensa, TED, ACT]
piloto_recomendado: sala de situacao POA (dispensa) + digital twin Taquari-Antas (BIRD)
potencial_reuso: alto
cobertura_licenca: a confirmar (sem inventario ArcGIS do cliente)
palavras_chave: [defesa_civil, enchente, alerta_precoce, digital_twin, S2ID, PNPDC, BIRD, TCE, RS]
```

---
> **Próximo passo:** `fvi-08-governanca-gov` — modelo de monitoramento do pipeline.
