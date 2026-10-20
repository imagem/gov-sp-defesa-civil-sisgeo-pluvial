---
orgao: Defesa Civil (SINPDEC) — três esferas
esfera: municipal / estadual / federal
etapa: 4
titulo: Padronização via Prompts e Templates (Governo)
data: 2026-08-11
status: concluído
proxima_etapa: 05-mapa-traducao
---

# Padronização — Kit de Execução para Defesa Civil (três esferas)

## Template de Discovery (Governo — Defesa Civil)

```
1. IDENTIFICAÇÃO DO ÓRGÃO
   1.1 Nome / sigla:                     (ex.: COMDEC POA · CEPDEC/RS · SEDEC/MIDR)
   1.2 Esfera:                           ( ) municipal ( ) estadual ( ) federal
   1.3 UF / Município:
   1.4 Vínculo institucional:            (secretaria própria / Casa Militar / ministério / autarquia)
   1.5 Órgãos do ecossistema de risco:   (DMAE, SEMA, SGB/CPRM, CEMADEN, ANA, IPH/UFRGS, empresa de TI)

2. COMPETÊNCIAS LEGAIS E ATRIBUIÇÕES
   2.1 Papel no SINPDEC:                 (resposta local / coordenação de municípios / órgão central)
   2.2 Instrumentos sob responsabilidade:(plano de contingência / mapeamento de risco / carta geotécnica / alerta / S2ID)

3. CONTEXTO INSTITUCIONAL
   3.1 PNPDEC (Lei 12.608/2012) — obrigações aplicáveis:
   3.2 PNPDC 2025-2035 — metas relacionadas:
   3.3 PPA / Plano de Governo (linhas de defesa civil / adaptação climática):
   3.4 Programas federais aderidos:      (Novo PAC prevenção/drenagem, gestão de riscos)
   3.5 Plano Diretor / uso do solo em áreas de risco (municipal):

4. MANDATOS E OBRIGAÇÕES  [nível de evidência por item: 🟢/🟡/🔴]
   4.1 Mapeamento de áreas suscetíveis:
   4.2 Plano de contingência (vigência):
   4.3 Carta geotécnica de aptidão à urbanização:
   4.4 Fiscalização de edificações em área de risco:
   4.5 Cadastro de municípios/famílias em área de risco:

5. ORÇAMENTO E FONTES DE RECURSO
   5.1 LOA (linha de defesa civil / adaptação):
   5.2 Financiamento internacional:       (BIRD / BID / Fundo Clima — status)
   5.3 Convênios / Novo PAC / emendas:
   5.4 Cartão de Pagamento de Defesa Civil (CPDC) / conta S2ID:

6. KPIs DE GESTÃO PÚBLICA (defesa civil)
   [ ] Lead time do alerta  [ ] % municípios com plano em dia  [ ] % área de risco mapeada
   [ ] Estações operantes/cobertura  [ ] Tempo de reconhecimento (S2ID)  [ ] Execução de obras de prevenção

7. DEMANDAS PÚBLICAS E DORES  [🟢/🟡/🔴 por demanda]
8. ACHADOS DE AUDITORIA (TCU/TCE)          (ex.: TCE-RS: 40+8 rec POA; 22 rec CEPDEC)
9. LEITURA TERRITORIAL                       (bacias, setores de risco, rotas, abrigos, rede de sensores)
10. MATURIDADE TECNOLÓGICA
    10.1 Sistemas existentes:               (sala de situação, S2ID, POA Clima, IEDE)
    10.2 Infraestrutura de TI / gatekeeper:  (PROCEMPA / PROCERGS / ComprasGov)
    10.3 Inventário de licenças ArcGIS:      (produtos/quantidades — se disponível)
    10.4 Nível de maturidade GIS (1-5):
11. DADOS EXISTENTES                          (setorização SGB, telemetria, cadastro, imagens)
12. HIPÓTESES PRELIMINARES                    (referenciar arquétipos do catálogo)
13. STAKEHOLDERS-CHAVE                         (coordenador DC / secretário / diretor de TI / carreira)
14. CAMINHO DE CONTRATAÇÃO PROVÁVEL           (ata / pregão / dispensa / convênio / cooperação / financiamento intl.)
    14.1 Ano do mandato da esfera + restrições eleitorais (Art. 73 / LRF 42):
15. PRÓXIMOS PASSOS                            (PoC / workshop / diagnóstico)

--- CAMPOS CONDICIONAIS POR ESFERA ---
[MUNICIPAL]  Porte (população) · Plano Diretor (vigente/em revisão) · CTM · consórcio · Escritório de Reconstrução · empresa municipal de TI
[ESTADUAL]   Empresa estadual de informática · IEDE · nº de municípios sob jurisdição · CREPDECs · UGP de empréstimo · Câmara Temática de reconstrução
[FEDERAL]    Portfólio (Defesa Civil/Prevenção) · PDTIC · produtor vs. consumidor de dado · INDE · mecanismo de compra (SICAF/TED/ACT) · financiamento internacional
```

## Template de Hipótese de Valor Público

```
ID_HIPOTESE:                     (ex.: DC-EST-01)
DEMANDA / OBRIGACAO_LEGAL:
EVIDENCIA_ANCORA:
  nivel:                         [🟢 ancorada / 🟡 indício / 🔴 dedução sem evidência]
  fonte:                         (documento + ano)
  link:
BASE_LEGAL:                      (Lei 12.608 / PNPDC / Plano Rio Grande / Novo PAC / contrato BIRD)
IMPACTO:
  cidadao:
  gestao:
  fiscal:
  juridico:
DIMENSAO_TERRITORIAL:            (bacia / setor de risco / rota / rede de sensores / nacional)
HIPOTESE_ANALITICA:
SOLUCAO (≥1 parágrafo):
  camada_geoIA:                  (produtos ArcGIS concretos + o que cada um faz)
  camada_IA_LLM (agnóstica):     (papel + como chama as tools ArcGIS)
  ligacao_aos_dados:             (SGB, CEMADEN, ANA, S2ID, cadastro, telemetria)
  cobertura_licenca:             (✅ possui / 🛒 adquirir — quando houver inventário)
  viabilidade_1_JA:              (o que entrega já com licenças existentes)
  viabilidade_2_ROBUSTA:         (versão com novas aquisições)
VIABILIDADE_CONTRATUAL:          (ata / pregão / dispensa / convênio / cooperação / BIRD-BID / TED-ACT)
  timing_politico:               (ano do mandato da esfera + restrições)
DADOS_NECESSARIOS:               (público / interno)
INDICADORES_RESULTADO:
DIFICULDADE:                     (baixa / média / alta)
RISCO:                           (técnico / jurídico / político)
VALIDACAO:                       (PoC dados públicos / piloto / workshop)
OBSERVACOES:
```

## Checklist de Qualidade (Governo — Defesa Civil)

**Clareza da demanda**
- [ ] Demanda pública / obrigação legal enunciada com clareza
- [ ] Ligada a uma etapa concreta do ciclo de defesa civil (prevenção/preparação/resposta/recuperação)

**Evidência e base legal**
- [ ] Evidência-âncora com nível (🟢/🟡/🔴) e fonte verificável (link)
- [ ] Base legal identificada (Lei 12.608 / PNPDC / Plano Rio Grande / Novo PAC / contrato de financiamento)
- [ ] Achado de auditoria citado quando existir (TCE-RS / TCU)

**Territorial**
- [ ] Explicita onde o "onde" importa (bacia, setor, rota, rede de sensores)

**Solução + ArcGIS**
- [ ] Camadas GeoIA e IA/LLM separadas, com produtos ArcGIS concretos
- [ ] Ponte para os dados do órgão (SGB, CEMADEN, ANA, S2ID, telemetria, cadastro)
- [ ] Duas camadas de viabilidade (1 JÁ / 2 Robusta)

**Licença e viabilidade contratual**
- [ ] Cobertura de licença marcada quando houver inventário (✅/🛒)
- [ ] Caminho de contratação mapeado e factível para o **ano de mandato da esfera**
- [ ] Restrições eleitorais consideradas (Art. 73 / LRF 42) para estadual/federal em 2026

**Narrativa de gestão pública**
- [ ] Sem jargão; abre na evidência pública; resultado mensurável (não SKU de produto)

**Indicadores e PoC**
- [ ] Indicadores de resultado definidos (vidas/lead time, conformidade, tempo de reconhecimento)
- [ ] PoC com dados públicos identificado (SGB, CEMADEN, ANA, S2ID)
- [ ] Consistência demanda → território → solução → valor público → contratação

---
> **Próximo passo:** `fvi-06-mapa-traducao-gov` — matriz demanda pública → solução territorial.
