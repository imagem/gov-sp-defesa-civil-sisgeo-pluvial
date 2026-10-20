# Conectar ao ArcGIS Enterprise de Sao Paulo

A demo funciona integralmente **sem** credencial. Este documento descreve o que
fazer quando o App ID do portal `https://saopaulo.img.com.br/portal` existir.

## 1. Registrar a aplicacao no portal

No portal, em *Content > New item > Application > Other application*, registre a
aplicacao e anote o **App ID (Client ID)**.

Em *Settings > Redirect URIs*, adicione:
- `http://localhost:5173` (desenvolvimento)
- a URL de producao onde a demo for publicada

Sem o redirect URI cadastrado, o fluxo OAuth falha silenciosamente no navegador.

## 2. Preencher o `.env`

```
VITE_ARCGIS_PORTAL_URL=https://saopaulo.img.com.br/portal
VITE_ARCGIS_APP_ID=<o App ID registrado>
VITE_MODO_ENTERPRISE=true
```

No host de publicacao, cadastre as mesmas variaveis nas configuracoes de
variaveis de ambiente do projeto.

O modo Enterprise so liga com **flag e App ID** presentes — ver
`modoEnterprise()` em `src/mapa/config.ts`. Isso evita que um deploy com a flag
ligada e sem credencial quebre a apresentacao.

## 3. Substituir os mocks por camadas reais

Os mocks vivem em `src/simulacao/mundo.ts`. Para consumir camadas do portal,
troque a geracao procedural por `FeatureLayer`:

```ts
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";

const zonasDeRisco = new FeatureLayer({
  url: "https://saopaulo.img.com.br/server/rest/services/<servico>/FeatureServer/0",
  outFields: ["*"],
});
```

O contrato de dados esperado esta nas interfaces de `src/dominio/tipos.ts`.
Mapeie os campos do servico real para essas interfaces em um adaptador —
**nao altere os tipos do dominio para caber no servico**, porque isso
propagaria o formato do servico por toda a aplicacao.

## 4. Basemap do portal

Com o Enterprise ativo, troque `Basemap.fromId("osm")` em
`src/mapa/MapaSalaSituacao.tsx` por um webmap do portal:

```ts
import Basemap from "@arcgis/core/Basemap.js";
const basemap = new Basemap({ portalItem: { id: import.meta.env.VITE_ARCGIS_BASEMAP_ID } });
```

## 5. O que NAO muda

O dominio, os agentes, o motor e os testes nao dependem de ArcGIS nem de rede.
Conectar ao Enterprise e uma troca na borda de dados e na borda de renderizacao.
Essa e a razao de o dominio ter sido mantido puro desde a primeira tarefa.
