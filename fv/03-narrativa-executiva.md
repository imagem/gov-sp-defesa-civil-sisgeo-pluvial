---
orgao: Defesa Civil (SINPDEC) — três esferas
esfera: municipal / estadual / federal
etapa: 3
titulo: Tradução e Narrativa para Gestão Pública
data: 2026-08-11
status: concluído
proxima_etapa: 04-padronizacao
---

# Narrativa Executiva — Defesa Civil (três esferas)

> Gestores públicos não compram tecnologia — compram **cumprimento de obrigação legal, vidas salvas, eficiência do gasto e resultado auditável**. Cada narrativa abre na evidência pública do próprio órgão. Calibração: **municipal** = impacto direto no cidadão e legado; **estadual** = escala regional, coordenação e financiamento internacional; **federal** = soberania de dados, interoperabilidade e eficiência em escala nacional.

## Narrativas por Hipótese

### H1 — Alerta precoce e Digital Twin de bacia

**Resumo executivo.** O empréstimo do Banco Mundial (Pró-Resiliência, US$ 359,6 mi, aprovado em abril/2025) carimba recurso para exatamente isto: *"monitoramento climático, alerta precoce e mitigação de enchentes"*. Em Porto Alegre, o Plano de Reconstrução já prevê R$ 2,6 mi/ano para medição e alerta e R$ 3,6 mi/ano para o centro de monitoramento. A proposta transforma esse dinheiro já contratado em **capacidade permanente**: um gêmeo digital da bacia que prevê o nível dos rios e dispara alerta espacializado por zona de risco — dando às equipes de defesa civil as horas de antecedência que faltaram em maio de 2024.

> **Fala de 30s:** "O dinheiro do Banco Mundial e da reconstrução já está reservado para monitoramento e alerta. O que propomos é convertê-lo em horas de antecedência: um gêmeo digital da bacia que avisa, bairro a bairro, antes da água chegar. É a diferença entre evacuar e enxugar o prejuízo."

**1 slide** — *Do improviso ao alerta previsível*
- Prevê nível/vazão da bacia e dispara alerta por zona de risco (não por número global)
- Usa o recurso já contratado (BIRD/Reconstrução) — sem depender de novo orçamento
- **Próximo passo:** piloto Taquari-Antas via trilho BIRD (Sefaz/SERG + CEPDEC + IPH/UFRGS)

### H3 — Dashboard de Situação integrado (municipal)

**Resumo executivo.** A auditoria do TCE-RS sobre o sistema municipal de defesa civil de Porto Alegre resultou em **40 recomendações e 8 determinações**, com foco na eficácia dos alertas e na integração entre órgãos. Hoje, CEMADEC, DMAE (comportas e níveis) e a linha 199 operam em telas separadas. Uma Imagem Operacional Comum reúne tudo em um painel único — respondendo, de forma verificável, ao que o Tribunal cobrou, e dando ao prefeito um legado auditável de resiliência no seu segundo mandato.

> **Fala de 30s:** "O TCE apontou 48 pontos no sistema de defesa civil da cidade. Um painel único de situação — chuva, nível do Guaíba, comportas e ocorrências na mesma tela — responde diretamente à auditoria, e a gente prova valor em 60 dias com dados públicos."

**1 slide** — *Uma cidade, uma tela de situação*
- Integra CEMADEC + níveis + comportas + linha 199 (responde ao TCE)
- PoC em 60 dias com dados públicos, por dispensa de licitação
- **Próximo passo:** dispensa ≤ R$ 65.492,11 para o piloto (ano 2, sem trava eleitoral)

### H2 — Conformidade dos 497 municípios (estadual)

**Resumo executivo.** O TCE-RS auditou os 497 municípios e encontrou 87 sem plano de contingência e 215 com planos desatualizados — emitindo **22 recomendações diretas à Casa Militar/CEPDEC**. Uma plataforma georreferenciada de planos de contingência, com painel de conformidade por Coordenadoria Regional, transforma essa recomendação em um instrumento de gestão: a CEPDEC passa a enxergar, em tempo real, quais municípios estão prontos e quais precisam de apoio.

> **Fala de 30s:** "O Tribunal deu 22 recomendações à Defesa Civil estadual sobre os planos dos municípios. Em vez de responder com papel, respondemos com um painel: quais dos 497 estão em dia, quais estão vencidos, onde a regional precisa agir. É a auditoria virando ferramenta."

**1 slide** — *497 municípios, uma visão de prontidão*
- Painel de conformidade por CREPDEC (responde às 22 recomendações do TCE)
- Municípios cadastram e atualizam planos em campo (Field Maps)
- **Próximo passo:** cooperação técnica / PoC com dados públicos (compatível com ano eleitoral)

### H7 — Integração nacional de dados de risco (federal)

**Resumo executivo.** O Plano Nacional de Proteção e Defesa Civil (2025-2035), lançado na COP30, estabelece **163 metas** de ação coordenada entre União, estados e municípios. Hoje, CEMADEN, CENAD, SGB, ANA e S2ID produzem dados de risco em sistemas que não conversam plenamente. Uma camada de integração conforme a INDE (padrões OGC/ISO) dá à SEDEC uma imagem operacional comum nacional — a espinha dorsal técnica para cumprir as metas do PNPDC e apoiar a decisão de alocação de recursos.

> **Fala de 30s:** "O Plano Nacional tem 163 metas que exigem União, estados e municípios olhando o mesmo dado. Integrar CEMADEN, SGB, ANA e S2ID numa camada interoperável é a fundação técnica dessas metas — e o que permite alocar o recurso onde o risco realmente está."

**1 slide** — *Um dado de risco, do município à União*
- Integra os sistemas nacionais conforme INDE (interoperável, auditável pelo TCU)
- Sustenta as 163 metas do PNPDC e a alocação dos R$ 4 bi de gestão de riscos
- **Próximo passo:** entrada pela agenda de metas do PNPDC + inclusão no PDTIC; ACT/TED

## Casos de Uso Públicos

| Caso | Demanda / obrigação legal | Evidência-âncora | Contexto territorial | Solução | Componentes (GeoIA / LLM) | Indicadores de resultado | Valor público | PoC | Contratação |
|---|---|---|---|---|---|---|---|---|---|
| Sala de situação municipal (COP) | Integração/alerta (TCE 40+8) | 🟢 TCE-RS SIMPRODEC | Bairros/bacias urbanas POA | Dashboard integrado | Dashboards+Velocity / assistente de plantão | Lead time; % determinações atendidas | Resposta mais rápida; legado auditável | Dados públicos, 60 dias | Dispensa |
| Digital twin de bacia | Alerta precoce (BIRD/PNPDC) | 🟢 BIRD Pró-Resiliência | Taquari-Antas / Guaíba | Twin hidrológico + alerta | Pro/Spatial Analyst+Velocity / boletim automático | Horas de antecedência; áreas evacuadas | Vidas salvas | Piloto bacia, 6-12m | BIRD/BID |
| Conformidade dos 497 | Planos de contingência (TCE 22) | 🟢 TCE-RS + Lei 12.608 | 497 municípios/10 CREPDECs | Plataforma + painel | Enterprise+Field Maps / gerador de plano | % planos em dia | Prontidão estadual | Dados públicos, 60 dias | Coop. técnica |
| Cadastro vivo + carta geotécnica | Lei 12.608 art. 22 | 🟢 Lei 12.608 (gap) | Setores de risco POA | Cadastro + carta | Field Maps+Spatial Analyst / priorização | % famílias cadastradas; conformidade | Evacuação/assistência; compliance | Carta preliminar | Convênio/PAC |
| Dossiê S2ID georreferenciado | Reconhecimento federal | 🟢 S2ID (91%) | Município afetado | Coleta + dossiê | Survey123+Image Analyst / gera FIDE | Tempo de reconhecimento | Recurso mais rápido | Formulário, 60 dias | TED/ACT |
| Integração nacional (INDE) | PNPDC 163 metas | 🟢 PNPDC + Lei 12.608 | Nacional | IDE de risco | Enterprise/Knowledge / assistente executivo | Metas PNPDC; fontes integradas | Coordenação federativa | Portal público | PDTIC/ACT |
| Painel de execução Funrigs | Transparência reconstrução | 🟡 Funrigs 13,7 bi | 497 municípios | Painel de execução | Dashboards+Experience Builder / resumo | % executado por eixo/região | Prestação de contas | Dados públicos | Ata |

## Storytelling para Proposta Institucional

**1. A obrigação e a demanda pública.** A Política Nacional de Proteção e Defesa Civil (Lei 12.608/2012) impõe a cada esfera deveres concretos: ao município, mapear áreas de risco, manter plano de contingência e carta geotécnica; ao estado, coordenar seus municípios e monitorar as bacias; à União, operar o sistema nacional de informação e alerta. A esses deveres somam-se, no Rio Grande do Sul, o Plano Rio Grande e um empréstimo do Banco Mundial que nomeia "alerta precoce" como objetivo; e, no plano federal, as 163 metas do Plano Nacional 2025-2035. A demanda, portanto, não é uma hipótese comercial — está escrita em lei, em auditoria e em contrato de financiamento.

**2. Por que a forma atual não atende.** Maio de 2024 mostrou o custo do sistema fragmentado: em Porto Alegre, comportas sem manutenção e um único servidor cuidando do sistema de cheias; no estado, planos de contingência desatualizados em 215 municípios; e, em todas as escalas, dados de risco em silos que não conversam a tempo do evento. O TCE-RS documentou 48 pontos no sistema municipal e 22 recomendações à defesa civil estadual. A capacidade de resposta existe — o que falta é a **camada de informação que a antecipa e a coordena**.

**3. Onde o território conecta demanda e solução.** Defesa civil é, na essência, um problema de "onde": onde vai chover, onde o rio vai subir, onde estão as famílias expostas, por onde evacuar, onde alocar o recurso. Cada uma dessas perguntas é geográfica — e é por isso que a inteligência territorial, e não apenas um sistema de gestão, é a resposta adequada.

**4. Como GIS + IA transforma a capacidade de gestão.** Uma plataforma geoespacial integra as fontes (estações, satélite, cadastro, sistemas nacionais) numa imagem operacional comum; a análise preditiva converte previsão meteorológica e telemetria em alerta espacializado por zona de risco; e uma camada de IA em linguagem natural resume a situação e gera os relatórios que hoje consomem horas de servidores escassos. O mesmo dado sobe a escala — do bairro em Porto Alegre à bacia no estado, e desta ao painel nacional da SEDEC — interoperável pela INDE.

**5. O que validar no piloto.** Com dados exclusivamente públicos (SGB/CPRM, CEMADEN, ANA, S2ID), é possível demonstrar em 30-60 dias um painel de situação que responde diretamente às determinações do TCE — sem novo orçamento e, no município, por dispensa de licitação. É a prova de valor de baixo risco que abre caminho para o projeto estruturante financiado.

**6. O impacto esperado.** Mais horas de antecedência no alerta (vidas salvas); planos de contingência dos 497 municípios em dia (conformidade com a auditoria); reconhecimento federal e repasse de recursos mais rápidos (S2ID); e alocação dos bilhões da reconstrução guiada por risco real, não por pressão política. Em uma frase: **transformar o dinheiro e o mandato que já existem em uma capacidade permanente de proteger pessoas — auditável, interoperável e independente de ciclo eleitoral.**

---
> **Próximo passo:** `fvi-05-padronizacao-gov` — kit de execução reutilizável (templates + checklist).
