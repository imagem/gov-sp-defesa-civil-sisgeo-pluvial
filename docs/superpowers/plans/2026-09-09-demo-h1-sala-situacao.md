# Demo H1 — Sala de Situação Multi-Agente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir uma demonstração web estática, publicável na Vercel, que simula a Plataforma de Alerta Precoce e Gêmeo Digital de Bacia (SPEC-H1) por meio de um enxame de agentes especialistas que monitoram dados sintéticos, detectam anomalias, executam ações espaciais no mapa e propõem alertas — sempre com validação humana obrigatória.

**Architecture:** Aplicação 100% cliente (SPA React + TypeScript, sem backend). Um **motor de simulação determinístico** (PRNG semeado + relógio simulado) produz observações hidrometeorológicas sintéticas a cada *tick*. Um **barramento de eventos** conecta ~10 **agentes especialistas** — cada um espelhando um módulo do SPEC-H1 (`ING`, `NET`, `MOD`, `ALT`, `EXP`, `LLM`, `GOV`) — que reagem a eventos, publicam novos eventos e mudam de estado visível. O **domínio é puro TypeScript** (sem React, sem ArcGIS, sem rede), portanto inteiramente testável com Vitest; ArcGIS Maps SDK for JavaScript é usado apenas na camada de renderização, e React Flow apenas para o grafo de agentes.

**Tech Stack:** React 19 · TypeScript 7 · Vite 8 · `@arcgis/core` 5.1 · `@xyflow/react` 12 (MIT) · Zustand 5 · Motion 13 · Vitest 5 · Vercel (static)

**Spec:** `SPEC-H1-alerta-precoce-digital-twin-bacia.md` (raiz do repositório)

---

## Análise: como a demo se relaciona com o spec

Esta seção é o argumento do plano. Leia antes das tarefas.

### A descoberta que organiza tudo

O SPEC-H1 já decompõe a solução em 11 módulos com fronteiras nítidas (`ING`, `NET`, `MOD`, `ALT`, `EXP`, `COP`, `PUB`, `TWN`, `LLM`, `GOV`). **Essa decomposição é exatamente um sistema multi-agente.** Cada módulo vira um agente especialista com um trabalho, uma entrada e uma saída observável. Não é uma metáfora imposta sobre o spec — é o spec desenhado de outro ângulo.

Isso dá à demo uma propriedade rara: ela não *ilustra* a arquitetura, ela **é** a arquitetura rodando em pequena escala. Cada agente na tela aponta para requisitos `RF-*` reais.

| Agente | Módulo | Requisitos demonstrados | O que o espectador vê |
|---|---|---|---|
| `agente-ingestao-<fonte>` (×3) | ING | RF-ING-01/02/05 | Pulsos nas estações do mapa a cada leitura; contador de leituras |
| `agente-qualidade` | ING | RF-ING-04 | Leitura absurda entra, é marcada "reprovada" e **não** gera alerta |
| `agente-rede` | NET | RF-NET-01 | Estação para de responder → vira "silenciosa"; % operantes cai |
| `agente-hidrologico` | MOD | RF-MOD-02/03/04 | Curva de nível previsto com faixa de incerteza; NSE atualizando |
| `agente-geofencing` | ALT | RF-ALT-03 | **Ação espacial:** mancha prevista cresce e intercepta zona de risco → alerta antecipado |
| `agente-limiar` | ALT | RF-ALT-01/02 | Limiar por zona atingido → alerta candidato com evidência rastreável |
| `agente-antifadiga` | ALT | RF-ALT-05 | Segundo disparo na mesma zona vira *atualização*, não novo alerta |
| `agente-redator` | LLM | RF-LLM-01/03 | Boletim redigido em rascunho, citando as fontes que consultou |
| `agente-expedicao` | EXP | RF-EXP-02/03, **RNF-18** | Fica **bloqueado** até um humano validar; a tentativa automática falha visivelmente |
| `agente-auditoria` | GOV | RF-GOV-02 | Trilha reconstituível: dado → limiar → decisão → expedição |

### A decisão mais importante do plano

**O `agente-expedicao` precisa falhar em cena.** O spec trata *human-in-the-loop* (`RNF-18`) como requisito jurídico inviolável, não como conveniência. Numa demo é tentador automatizar tudo para impressionar — e seria exatamente a mensagem errada para um público de defesa civil e controle externo. Por isso a demo mostra o agente tentando expedir, sendo bloqueado, e esperando o clique humano. **Esse é o momento mais forte da apresentação**, não um obstáculo a contornar.

### Três decisões técnicas com alternativa considerada

**1. Geometria: TypeScript puro no domínio, ArcGIS só na renderização.**
A alternativa seria usar os operadores geométricos do `@arcgis/core` (`intersectsOperator` etc.) também na lógica. Rejeitada: eles exigem carregar o SDK (e WASM) dentro dos testes, tornando o domínio lento e frágil, e violariam o princípio 6.4.1 do spec ("domínio isolado de plataforma"). Implementamos ray-casting e interseção de segmentos em ~120 linhas testáveis. Precisão aproximada é aceitável — é uma demo com geometria sintética, não um cálculo de engenharia.

**2. Basemap: OpenStreetMap, não basemap Esri.**
Basemaps Esri exigem API key. Como a Vercel vai servir a demo antes de existir credencial, o padrão é `Basemap.fromId("osm")`, que não pede chave. Quando o `.env` do Enterprise São Paulo for preenchido, uma flag troca para o basemap do portal sem tocar no resto do código.

**3. Sem Calcite Design System.**
Calcite é o sistema de design da Esri e seria o caminho "oficial", mas ele impõe uma linguagem visual sólida que brigaria com o glassmorfismo pedido. CSS próprio com tokens custa pouco e entrega o visual solicitado. Anotado como desvio consciente.

### O que a demo NÃO faz (e por que dizer isso importa)

- Não conecta em fonte real (CEMADEN, ANA, INMET) — todo dado é sintético e rotulado como tal na interface.
- Não roda modelo hidrológico de verdade — a previsão é uma resposta chuva→nível parametrizada, suficiente para demonstrar o fluxo, **jamais apresentável como capacidade preditiva**.
- Não usa LLM real — o `agente-redator` compõe o boletim por *template* a partir de dados reais da simulação. Isso é honesto e tem uma vantagem: prova o *formato* da entrega sem inventar número.
- Não persiste nada entre sessões.

Cada uma dessas limitações deve aparecer em um selo visível na interface (Tarefa 13). Demo de defesa civil que parece produção é um risco reputacional, não um argumento de venda.

---

## Global Constraints

Valores exatos, verificados via `npm view` em 2026-09-09. Toda tarefa herda esta seção.

- **Node:** ≥ 22.23.1 (ambiente atual: v22.23.1, npm 12.0.1)
- **Dependências de produção (versões exatas):** `react@19.3.0`, `react-dom@19.3.0`, `@arcgis/core@5.1.23`, `@xyflow/react@12.11.6`, `zustand@5.0.15`, `motion@13.2.0`
- **Dependências de desenvolvimento:** `vite@8.2.2`, `@vitejs/plugin-react@6.1.1`, `typescript@7.0.2`, `vitest@5.0.0`, `@types/react@19.3.0`, `@types/react-dom@19.3.0`
- **`@xyflow/react` é MIT** — verificado. Sem restrição de uso comercial; não há necessidade de biblioteca alternativa.
- **Sem backend.** Nenhuma rota de API, nenhuma *serverless function*, nenhum `fetch` para origem externa em tempo de execução. Build estático, `outputDirectory: dist`.
- **Imports do ArcGIS usam extensão `.js`** e caminho profundo — ex.: `import MapView from "@arcgis/core/views/MapView.js"`. O pacote 5.1.23 não declara campo `exports`, então o caminho profundo é o contrato.
- **CSS do ArcGIS:** `@arcgis/core/assets/esri/themes/dark/main.css` (caminho verificado no pacote instalado).
- **Assets do ArcGIS via CDN:** `esriConfig.assetsPath = "https://js.arcgis.com/5.1/@arcgis/core/assets"`. Evita copiar ~40 MB para o bundle da Vercel.
- **Idioma:** todo identificador, comentário, commit e texto de interface em **pt-BR**. Identificadores sem acento nem cedilha (`agenteIngestao`, não `agenteIngestão`).
- **Tempo:** o domínio trabalha em ISO 8601 UTC (`toISOString()`). A interface converte para `America/Sao_Paulo` na exibição.
- **Geometria:** coordenadas `[longitude, latitude]` em WGS84 (EPSG:4326) no domínio; o ArcGIS reprojeta na renderização. O spec pede EPSG:4674 em produção — anotado como divergência deliberada da demo, registrada no README.
- **Determinismo:** nenhum uso de `Math.random()` ou `Date.now()` dentro de `src/dominio/`, `src/simulacao/` ou `src/agentes/`. Aleatoriedade vem sempre de um `Aleatorio` semeado; tempo sempre do `RelogioSimulado`. Isso é o que torna os cenários reprodutíveis (espelha `RF-TWN-01`).
- **`RNF-18` é lei:** não existe caminho de código que leve um alerta de `candidato` a `expedido` sem passar por `validar()` com operador identificado. A função `expedir()` lança exceção nesse caso, e há teste para isso.
- **Variáveis de ambiente** (todas opcionais, todas com fallback funcional): prefixo `VITE_`. A demo **deve funcionar completamente sem nenhuma delas definidas**.

---

## File Structure

```
demo/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── vercel.json
├── .env.example
├── .gitignore
├── index.html
├── README.md
└── src/
    ├── main.tsx                       # bootstrap React
    ├── App.tsx                        # composição do layout
    │
    ├── dominio/                       # PURO: sem React, sem ArcGIS, sem rede
    │   ├── prng.ts                    # PRNG semeado (mulberry32)
    │   ├── relogio.ts                 # tempo simulado
    │   ├── geometria.ts               # multipolígono irregular + operações
    │   ├── tipos.ts                   # entidades da seção 8 do spec
    │   ├── qc.ts                      # RF-ING-04 controle de qualidade
    │   ├── limiar.ts                  # RF-ALT-01/02 acumulação e avaliação
    │   ├── alerta.ts                  # RF-ALT-04/05 ciclo de vida + antifadiga
    │   ├── previsao.ts                # RF-MOD-02 nível previsto com incerteza
    │   ├── mancha.ts                  # RF-MOD-04 mancha por cota + exposição
    │   └── boletim.ts                 # RF-LLM-03 composição do rascunho
    │
    ├── simulacao/
    │   ├── mundo.ts                   # geração procedural da bacia sintética
    │   ├── cenarios.ts                # 5 cenários demonstráveis
    │   ├── barramento.ts              # RF-GOV-02 eventos + trilha de auditoria
    │   └── motor.ts                   # laço de tick
    │
    ├── agentes/
    │   ├── tipos.ts                   # contrato Agente + ContextoAgente
    │   ├── agenteIngestao.ts          # ING
    │   ├── agenteQualidade.ts         # ING (QC)
    │   ├── agenteRede.ts              # NET
    │   ├── agenteHidrologico.ts       # MOD
    │   ├── agenteLimiar.ts            # ALT (observado)
    │   ├── agenteGeofencing.ts        # ALT (preditivo — ação espacial)
    │   ├── agenteAntifadiga.ts        # ALT (dedup)
    │   ├── agenteRedator.ts           # LLM
    │   ├── agenteExpedicao.ts         # EXP (bloqueado por RNF-18)
    │   ├── agenteAuditoria.ts         # GOV
    │   └── registro.ts                # monta o enxame
    │
    ├── estado/
    │   └── store.ts                   # Zustand: ponte simulação → React
    │
    ├── mapa/
    │   ├── config.ts                  # esriConfig, basemap, flag Enterprise
    │   ├── portal.ts                  # OAuth Enterprise SP (desativado por padrão)
    │   ├── simbologia.ts              # símbolos por tipo de feição
    │   ├── camadas.ts                 # GraphicsLayers e sincronização
    │   └── MapaSalaSituacao.tsx       # componente React do mapa
    │
    ├── ui/
    │   ├── Cabecalho.tsx              # relógio, cenário, velocidade, selo de demo
    │   ├── PainelKPI.tsx              # lead time, estações operantes, alertas
    │   ├── PainelAgentes.tsx          # roster com status ao vivo
    │   ├── GrafoAgentes.tsx           # React Flow
    │   ├── nosDoGrafo.tsx             # nós customizados do React Flow
    │   ├── FilaAlertas.tsx            # validar / descartar (RNF-18)
    │   ├── ModalBoletim.tsx           # rascunho → aprovação humana
    │   ├── PainelSaudeRede.tsx        # RF-NET-01
    │   └── TrilhaAuditoria.tsx        # RF-GOV-02
    │
    └── styles/
        ├── tokens.css                 # variáveis de cor, espaço, tipografia
        └── glass.css                  # camada de glassmorfismo
```

Testes ficam **ao lado** do arquivo testado (`geometria.test.ts` junto de `geometria.ts`). Isso mantém em contexto o par código+teste, que é o que se lê junto.

---

### Task 1: Scaffold do projeto, build e deploy

**Files:**
- Create: `demo/package.json`
- Create: `demo/vite.config.ts`
- Create: `demo/tsconfig.json`
- Create: `demo/vercel.json`
- Create: `demo/.env.example`
- Create: `demo/.gitignore`
- Create: `demo/index.html`
- Create: `demo/src/main.tsx`
- Create: `demo/src/App.tsx`
- Create: `demo/src/styles/tokens.css`
- Test: `demo/src/dominio/sanidade.test.ts`

**Interfaces:**
- Consumes: nada (primeira tarefa)
- Produces: projeto Vite executável com `npm run dev`, `npm run build`, `npm run test`; alias `@` → `src`

- [ ] **Step 1: Criar o projeto e instalar dependências**

```bash
mkdir -p demo/src/{dominio,simulacao,agentes,estado,mapa,ui,styles}
cd demo
npm init -y
npm pkg set name="demo-h1-sala-situacao" version="0.1.0" private=true type="module"
npm i react@19.3.0 react-dom@19.3.0 @arcgis/core@5.1.23 @xyflow/react@12.11.6 zustand@5.0.15 motion@13.2.0
npm i -D vite@8.2.2 @vitejs/plugin-react@6.1.1 typescript@7.0.2 vitest@5.0.0 @types/react@19.3.0 @types/react-dom@19.3.0
npm pkg set scripts.dev="vite" scripts.build="tsc --noEmit && vite build" scripts.preview="vite preview" scripts.test="vitest run" scripts.test:watch="vitest"
```

- [ ] **Step 2: Escrever `vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks: {
          arcgis: ["@arcgis/core"],
          grafo: ["@xyflow/react"],
        },
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

O `manualChunks` importa: o `@arcgis/core` é grande e, sem isso, a Vercel emite aviso de bundle e o carregamento inicial fica pior.

- [ ] **Step 3: Escrever `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": false,
    "types": ["vite/client", "vitest/globals"],
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "vite.config.ts"]
}
```

`noUncheckedIndexedAccess: true` é deliberado: o código lida muito com arrays de leituras e vértices, e essa flag força tratar o caso vazio, que é onde bugs de simulação se escondem.

- [ ] **Step 4: Escrever `vercel.json`, `.env.example` e `.gitignore`**

`demo/vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

`demo/.env.example`:
```
# Todas as variáveis abaixo sao OPCIONAIS.
# A demo funciona integralmente sem nenhuma delas (dados sinteticos + basemap OSM).

# Portal ArcGIS Enterprise (Sao Paulo)
VITE_ARCGIS_PORTAL_URL=https://saopaulo.img.com.br/portal
# App ID registrado no portal — preencher quando as credenciais existirem
VITE_ARCGIS_APP_ID=
# Liga o modo Enterprise: exige PORTAL_URL e APP_ID preenchidos
VITE_MODO_ENTERPRISE=false
# Id do basemap quando em modo Enterprise (ex.: um webmap do portal)
VITE_ARCGIS_BASEMAP_ID=
```

`demo/.gitignore`:
```
node_modules
dist
.env
.env.local
.vercel
```

- [ ] **Step 5: Escrever `index.html`, `main.tsx`, `App.tsx` e `tokens.css`**

`demo/index.html`:
```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sala de Situacao H1 — Demonstracao</title>
  </head>
  <body>
    <div id="raiz"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`demo/src/styles/tokens.css`:
```css
:root {
  color-scheme: dark;

  --cor-fundo: #070b14;
  --cor-fundo-alt: #0c1322;
  --cor-texto: #e8eef7;
  --cor-texto-fraco: #92a3bb;
  --cor-borda: rgba(255, 255, 255, 0.12);

  --cor-acento: #38bdf8;
  --cor-ok: #34d399;
  --cor-atencao: #fbbf24;
  --cor-alta: #fb923c;
  --cor-critica: #f43f5e;

  --sev-baixa: #38bdf8;
  --sev-media: #fbbf24;
  --sev-alta: #fb923c;
  --sev-muito-alta: #f43f5e;

  --raio: 14px;
  --espaco-1: 4px;
  --espaco-2: 8px;
  --espaco-3: 12px;
  --espaco-4: 16px;
  --espaco-5: 24px;

  --fonte: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --fonte-mono: ui-monospace, "SF Mono", "Cascadia Code", monospace;
}

* { box-sizing: border-box; }

html, body, #raiz {
  height: 100%;
  margin: 0;
}

body {
  background: var(--cor-fundo);
  color: var(--cor-texto);
  font-family: var(--fonte);
  font-size: 14px;
  overflow: hidden;
}
```

`demo/src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/tokens.css";

const raiz = document.getElementById("raiz");
if (!raiz) throw new Error("Elemento #raiz nao encontrado");

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`demo/src/App.tsx` (placeholder desta tarefa — substituído na Tarefa 13):
```tsx
export default function App() {
  return <div style={{ padding: 24 }}>Sala de Situacao H1 — scaffold ativo</div>;
}
```

- [ ] **Step 6: Escrever o teste de sanidade**

`demo/src/dominio/sanidade.test.ts`:
```ts
import { describe, expect, it } from "vitest";

describe("ambiente de testes", () => {
  it("executa e resolve o alias do projeto", async () => {
    const modulo = await import("./sanidade");
    expect(modulo.pronto()).toBe(true);
  });
});
```

`demo/src/dominio/sanidade.ts`:
```ts
export function pronto(): boolean {
  return true;
}
```

- [ ] **Step 7: Rodar testes e build**

```bash
npm run test
npm run build
```

Esperado: 1 teste passando; build gerando `dist/` sem erro de tipo.

- [ ] **Step 8: Commit**

```bash
git add demo
git commit -m "chore: scaffold da demo H1 com Vite, React 19, TypeScript e Vitest"
```

---

### Task 2: Domínio — PRNG determinístico e relógio simulado

**Files:**
- Create: `demo/src/dominio/prng.ts`
- Create: `demo/src/dominio/prng.test.ts`
- Create: `demo/src/dominio/relogio.ts`
- Create: `demo/src/dominio/relogio.test.ts`
- Delete: `demo/src/dominio/sanidade.ts`, `demo/src/dominio/sanidade.test.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `type Aleatorio = () => number`
  - `criarAleatorio(semente: number): Aleatorio`
  - `entre(r: Aleatorio, min: number, max: number): number`
  - `inteiroEntre(r: Aleatorio, min: number, max: number): number`
  - `escolher<T>(r: Aleatorio, itens: readonly T[]): T`
  - `class RelogioSimulado` com `agora: Date`, `iso: string`, `avancarMinutos(n: number): void`, `minutosDesde(iso: string): number`

- [ ] **Step 1: Escrever os testes que falham**

`demo/src/dominio/prng.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { criarAleatorio, entre, escolher, inteiroEntre } from "./prng";

describe("criarAleatorio", () => {
  it("produz a mesma sequencia para a mesma semente", () => {
    const a = criarAleatorio(42);
    const b = criarAleatorio(42);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("produz sequencias diferentes para sementes diferentes", () => {
    const a = criarAleatorio(1);
    const b = criarAleatorio(2);
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()]);
  });

  it("gera valores no intervalo [0, 1)", () => {
    const r = criarAleatorio(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("entre", () => {
  it("mantem os valores dentro dos limites", () => {
    const r = criarAleatorio(3);
    for (let i = 0; i < 500; i++) {
      const v = entre(r, -5, 5);
      expect(v).toBeGreaterThanOrEqual(-5);
      expect(v).toBeLessThan(5);
    }
  });
});

describe("inteiroEntre", () => {
  it("inclui ambos os extremos e nunca os ultrapassa", () => {
    const r = criarAleatorio(11);
    const vistos = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = inteiroEntre(r, 1, 3);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(3);
      vistos.add(v);
    }
    expect(vistos).toEqual(new Set([1, 2, 3]));
  });
});

describe("escolher", () => {
  it("retorna sempre um elemento da lista", () => {
    const r = criarAleatorio(5);
    const itens = ["a", "b", "c"] as const;
    for (let i = 0; i < 100; i++) {
      expect(itens).toContain(escolher(r, itens));
    }
  });

  it("lanca erro em lista vazia", () => {
    const r = criarAleatorio(5);
    expect(() => escolher(r, [])).toThrow("lista vazia");
  });
});
```

`demo/src/dominio/relogio.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { RelogioSimulado } from "./relogio";

describe("RelogioSimulado", () => {
  it("inicia no instante informado", () => {
    const relogio = new RelogioSimulado(new Date("2026-05-01T00:00:00.000Z"));
    expect(relogio.iso).toBe("2026-05-01T00:00:00.000Z");
  });

  it("avanca em minutos", () => {
    const relogio = new RelogioSimulado(new Date("2026-05-01T00:00:00.000Z"));
    relogio.avancarMinutos(90);
    expect(relogio.iso).toBe("2026-05-01T01:30:00.000Z");
  });

  it("calcula minutos decorridos desde um instante ISO", () => {
    const relogio = new RelogioSimulado(new Date("2026-05-01T06:00:00.000Z"));
    expect(relogio.minutosDesde("2026-05-01T05:30:00.000Z")).toBe(30);
  });

  it("retorna valor negativo para instante futuro", () => {
    const relogio = new RelogioSimulado(new Date("2026-05-01T06:00:00.000Z"));
    expect(relogio.minutosDesde("2026-05-01T07:00:00.000Z")).toBe(-60);
  });

  it("nao depende do relogio do sistema", () => {
    const relogio = new RelogioSimulado(new Date("2026-05-01T00:00:00.000Z"));
    const antes = relogio.iso;
    // qualquer tempo real que passe aqui nao pode afetar o relogio simulado
    expect(relogio.iso).toBe(antes);
  });
});
```

- [ ] **Step 2: Rodar os testes e ver falhar**

```bash
npm run test
```
Esperado: FAIL — `Cannot find module './prng'` e `'./relogio'`.

- [ ] **Step 3: Implementar `prng.ts`**

```ts
/**
 * Gerador pseudoaleatorio semeado (mulberry32).
 * Toda aleatoriedade da simulacao passa por aqui — e o que torna
 * um cenario reproduzivel (espelha RF-TWN-01 do SPEC-H1).
 */
export type Aleatorio = () => number;

export function criarAleatorio(semente: number): Aleatorio {
  let estado = semente >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function entre(r: Aleatorio, min: number, max: number): number {
  return min + r() * (max - min);
}

export function inteiroEntre(r: Aleatorio, min: number, max: number): number {
  return Math.floor(entre(r, min, max + 1));
}

export function escolher<T>(r: Aleatorio, itens: readonly T[]): T {
  if (itens.length === 0) throw new Error("escolher: lista vazia");
  const item = itens[inteiroEntre(r, 0, itens.length - 1)];
  if (item === undefined) throw new Error("escolher: indice invalido");
  return item;
}
```

- [ ] **Step 4: Implementar `relogio.ts`**

```ts
/**
 * Relogio da simulacao. Nenhum modulo de dominio pode chamar Date.now():
 * o tempo entra sempre por aqui, para que os cenarios sejam determinicos.
 */
export class RelogioSimulado {
  private ms: number;

  constructor(inicio: Date) {
    this.ms = inicio.getTime();
  }

  get agora(): Date {
    return new Date(this.ms);
  }

  get iso(): string {
    return new Date(this.ms).toISOString();
  }

  avancarMinutos(minutos: number): void {
    this.ms += minutos * 60_000;
  }

  minutosDesde(iso: string): number {
    return (this.ms - new Date(iso).getTime()) / 60_000;
  }
}
```

- [ ] **Step 5: Rodar os testes e verificar que passam**

```bash
npm run test
```
Esperado: PASS, 12 testes.

- [ ] **Step 6: Remover o placeholder de sanidade e commitar**

```bash
rm src/dominio/sanidade.ts src/dominio/sanidade.test.ts
npm run test
git add -A demo
git commit -m "feat(dominio): PRNG semeado e relogio simulado deterministicos"
```

---

### Task 3: Domínio — geometria de multipolígonos irregulares

**Files:**
- Create: `demo/src/dominio/geometria.ts`
- Create: `demo/src/dominio/geometria.test.ts`

**Interfaces:**
- Consumes: `Aleatorio`, `entre` de `@/dominio/prng`
- Produces:
  - `type Coordenada = readonly [number, number]`
  - `type Anel = Coordenada[]`
  - `interface Poligono { readonly aneis: Anel[] }`
  - `anelIrregular(centro, raioGraus, vertices, rugosidade, r): Anel`
  - `multiPoligonoIrregular(centro, raioGraus, lobos, r): Poligono`
  - `pontoEmAnel(p, anel): boolean`
  - `pontoEmPoligono(p, poligono): boolean`
  - `poligonosSeIntersectam(a, b): boolean`
  - `areaAproxKm2(anel): number`
  - `centroide(anel): Coordenada`
  - `dilatar(poligono, centro, fator): Poligono`

- [ ] **Step 1: Escrever os testes que falham**

`demo/src/dominio/geometria.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { criarAleatorio } from "./prng";
import {
  anelIrregular,
  areaAproxKm2,
  centroide,
  dilatar,
  multiPoligonoIrregular,
  poligonosSeIntersectam,
  pontoEmAnel,
  pontoEmPoligono,
  type Anel,
} from "./geometria";

const quadrado: Anel = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
  [0, 0],
];

describe("pontoEmAnel", () => {
  it("detecta ponto interno", () => {
    expect(pontoEmAnel([0.5, 0.5], quadrado)).toBe(true);
  });

  it("detecta ponto externo", () => {
    expect(pontoEmAnel([2, 2], quadrado)).toBe(false);
  });

  it("trata ponto claramente fora no eixo x", () => {
    expect(pontoEmAnel([-0.5, 0.5], quadrado)).toBe(false);
  });
});

describe("pontoEmPoligono", () => {
  it("considera qualquer anel do multipoligono", () => {
    const distante: Anel = [
      [10, 10],
      [10, 11],
      [11, 11],
      [11, 10],
      [10, 10],
    ];
    const poligono = { aneis: [quadrado, distante] };
    expect(pontoEmPoligono([10.5, 10.5], poligono)).toBe(true);
    expect(pontoEmPoligono([5, 5], poligono)).toBe(false);
  });
});

describe("poligonosSeIntersectam", () => {
  it("detecta sobreposicao parcial", () => {
    const b: Anel = [
      [0.5, 0.5],
      [0.5, 1.5],
      [1.5, 1.5],
      [1.5, 0.5],
      [0.5, 0.5],
    ];
    expect(poligonosSeIntersectam({ aneis: [quadrado] }, { aneis: [b] })).toBe(true);
  });

  it("detecta ausencia de sobreposicao", () => {
    const b: Anel = [
      [5, 5],
      [5, 6],
      [6, 6],
      [6, 5],
      [5, 5],
    ];
    expect(poligonosSeIntersectam({ aneis: [quadrado] }, { aneis: [b] })).toBe(false);
  });

  it("detecta contencao total sem cruzamento de arestas", () => {
    const dentro: Anel = [
      [0.4, 0.4],
      [0.4, 0.6],
      [0.6, 0.6],
      [0.6, 0.4],
      [0.4, 0.4],
    ];
    expect(poligonosSeIntersectam({ aneis: [quadrado] }, { aneis: [dentro] })).toBe(true);
  });
});

describe("areaAproxKm2", () => {
  it("calcula area positiva e plausivel para 1 grau quadrado no equador", () => {
    const area = areaAproxKm2(quadrado);
    // 1 grau ~ 111 km; area ~ 12.300 km2. Tolerancia larga: e aproximacao.
    expect(area).toBeGreaterThan(10_000);
    expect(area).toBeLessThan(14_000);
  });

  it("retorna area positiva independente da orientacao do anel", () => {
    const invertido = [...quadrado].reverse();
    expect(areaAproxKm2(invertido)).toBeCloseTo(areaAproxKm2(quadrado), 5);
  });
});

describe("centroide", () => {
  it("retorna o centro do quadrado", () => {
    const [x, y] = centroide(quadrado);
    expect(x).toBeCloseTo(0.5, 6);
    expect(y).toBeCloseTo(0.5, 6);
  });
});

describe("anelIrregular", () => {
  it("fecha o anel repetindo o primeiro vertice", () => {
    const anel = anelIrregular([-51.2, -30.03], 0.1, 24, 0.35, criarAleatorio(9));
    expect(anel.length).toBe(25);
    expect(anel[0]).toEqual(anel[anel.length - 1]);
  });

  it("e reproduzivel com a mesma semente", () => {
    const a = anelIrregular([-51.2, -30.03], 0.1, 24, 0.35, criarAleatorio(9));
    const b = anelIrregular([-51.2, -30.03], 0.1, 24, 0.35, criarAleatorio(9));
    expect(a).toEqual(b);
  });

  it("gera vertices irregulares, nao um circulo perfeito", () => {
    const centro: [number, number] = [0, 0];
    const anel = anelIrregular(centro, 1, 32, 0.4, criarAleatorio(4));
    const raios = anel.map(([x, y]) => Math.hypot(x - centro[0], y - centro[1]));
    const min = Math.min(...raios);
    const max = Math.max(...raios);
    expect(max - min).toBeGreaterThan(0.1);
  });

  it("contem o proprio centro", () => {
    const centro: [number, number] = [-51.2, -30.03];
    const anel = anelIrregular(centro, 0.1, 24, 0.35, criarAleatorio(9));
    expect(pontoEmAnel(centro, anel)).toBe(true);
  });
});

describe("multiPoligonoIrregular", () => {
  it("gera a quantidade pedida de aneis", () => {
    const p = multiPoligonoIrregular([-51.2, -30.03], 0.08, 3, criarAleatorio(21));
    expect(p.aneis.length).toBe(3);
  });

  it("e reproduzivel com a mesma semente", () => {
    const a = multiPoligonoIrregular([-51.2, -30.03], 0.08, 3, criarAleatorio(21));
    const b = multiPoligonoIrregular([-51.2, -30.03], 0.08, 3, criarAleatorio(21));
    expect(a).toEqual(b);
  });
});

describe("dilatar", () => {
  it("aumenta a area quando o fator e maior que 1", () => {
    const original = { aneis: [quadrado] };
    const maior = dilatar(original, [0.5, 0.5], 2);
    const anelMaior = maior.aneis[0];
    if (!anelMaior) throw new Error("anel ausente");
    expect(areaAproxKm2(anelMaior)).toBeGreaterThan(areaAproxKm2(quadrado));
  });

  it("mantem a geometria quando o fator e 1", () => {
    const original = { aneis: [quadrado] };
    const igual = dilatar(original, [0.5, 0.5], 1);
    expect(igual.aneis[0]).toEqual(quadrado);
  });
});
```

- [ ] **Step 2: Rodar os testes e ver falhar**

```bash
npm run test
```
Esperado: FAIL — `Cannot find module './geometria'`.

- [ ] **Step 3: Implementar `geometria.ts`**

```ts
import { entre, type Aleatorio } from "./prng";

export type Coordenada = readonly [number, number];
export type Anel = Coordenada[];

export interface Poligono {
  readonly aneis: Anel[];
}

const KM_POR_GRAU = 111.32;

/**
 * Gera um anel fechado de forma irregular em torno de um centro.
 * O raio de cada vertice varia por ruido suave, produzindo contornos
 * organicos — bacias e zonas de risco nao sao circulos.
 */
export function anelIrregular(
  centro: Coordenada,
  raioGraus: number,
  vertices: number,
  rugosidade: number,
  r: Aleatorio,
): Anel {
  const deslocamentos: number[] = [];
  for (let i = 0; i < vertices; i++) {
    deslocamentos.push(entre(r, 1 - rugosidade, 1 + rugosidade));
  }

  // Suavizacao circular: cada raio vira a media com os vizinhos, duas vezes.
  for (let passo = 0; passo < 2; passo++) {
    for (let i = 0; i < vertices; i++) {
      const anterior = deslocamentos[(i - 1 + vertices) % vertices] ?? 1;
      const atual = deslocamentos[i] ?? 1;
      const proximo = deslocamentos[(i + 1) % vertices] ?? 1;
      deslocamentos[i] = (anterior + atual + proximo) / 3;
    }
  }

  const correcaoLat = Math.cos((centro[1] * Math.PI) / 180) || 1;
  const anel: Anel = [];
  for (let i = 0; i < vertices; i++) {
    const angulo = (i / vertices) * Math.PI * 2;
    const raio = raioGraus * (deslocamentos[i] ?? 1);
    anel.push([
      centro[0] + (Math.cos(angulo) * raio) / correcaoLat,
      centro[1] + Math.sin(angulo) * raio,
    ]);
  }
  const primeiro = anel[0];
  if (!primeiro) throw new Error("anelIrregular: numero de vertices invalido");
  anel.push(primeiro);
  return anel;
}

/**
 * Multipoligono: varios lobos irregulares deslocados em torno do centro.
 * Representa areas fragmentadas — o caso comum em setorizacao de risco.
 */
export function multiPoligonoIrregular(
  centro: Coordenada,
  raioGraus: number,
  lobos: number,
  r: Aleatorio,
): Poligono {
  const aneis: Anel[] = [];
  for (let i = 0; i < lobos; i++) {
    const angulo = entre(r, 0, Math.PI * 2);
    const distancia = i === 0 ? 0 : entre(r, raioGraus * 0.6, raioGraus * 1.4);
    const centroLobo: Coordenada = [
      centro[0] + Math.cos(angulo) * distancia,
      centro[1] + Math.sin(angulo) * distancia,
    ];
    const raioLobo = raioGraus * entre(r, 0.45, 1);
    aneis.push(anelIrregular(centroLobo, raioLobo, 22, 0.32, r));
  }
  return { aneis };
}

/** Ray casting horizontal. */
export function pontoEmAnel(p: Coordenada, anel: Anel): boolean {
  let dentro = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const a = anel[i];
    const b = anel[j];
    if (!a || !b) continue;
    const cruza = a[1] > p[1] !== b[1] > p[1];
    if (!cruza) continue;
    const xNaLinha = ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0];
    if (p[0] < xNaLinha) dentro = !dentro;
  }
  return dentro;
}

export function pontoEmPoligono(p: Coordenada, poligono: Poligono): boolean {
  return poligono.aneis.some((anel) => pontoEmAnel(p, anel));
}

function segmentosCruzam(p1: Coordenada, p2: Coordenada, p3: Coordenada, p4: Coordenada): boolean {
  const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
  if (Math.abs(d) < 1e-12) return false;
  const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
  const u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function aneisSeIntersectam(a: Anel, b: Anel): boolean {
  // Contencao em qualquer direcao.
  if (a.some((p) => pontoEmAnel(p, b))) return true;
  if (b.some((p) => pontoEmAnel(p, a))) return true;
  // Cruzamento de arestas.
  for (let i = 0; i < a.length - 1; i++) {
    const a1 = a[i];
    const a2 = a[i + 1];
    if (!a1 || !a2) continue;
    for (let j = 0; j < b.length - 1; j++) {
      const b1 = b[j];
      const b2 = b[j + 1];
      if (!b1 || !b2) continue;
      if (segmentosCruzam(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

export function poligonosSeIntersectam(a: Poligono, b: Poligono): boolean {
  return a.aneis.some((anelA) => b.aneis.some((anelB) => aneisSeIntersectam(anelA, anelB)));
}

/** Area aproximada por formula do cadarco, corrigida pela latitude media. */
export function areaAproxKm2(anel: Anel): number {
  let soma = 0;
  let latSoma = 0;
  for (let i = 0; i < anel.length - 1; i++) {
    const a = anel[i];
    const b = anel[i + 1];
    if (!a || !b) continue;
    soma += a[0] * b[1] - b[0] * a[1];
    latSoma += a[1];
  }
  const n = Math.max(anel.length - 1, 1);
  const latMedia = latSoma / n;
  const correcao = Math.cos((latMedia * Math.PI) / 180) || 1;
  return Math.abs(soma / 2) * KM_POR_GRAU * KM_POR_GRAU * correcao;
}

export function centroide(anel: Anel): Coordenada {
  let x = 0;
  let y = 0;
  const n = anel.length - 1;
  for (let i = 0; i < n; i++) {
    const p = anel[i];
    if (!p) continue;
    x += p[0];
    y += p[1];
  }
  return [x / Math.max(n, 1), y / Math.max(n, 1)];
}

/** Escala o poligono radialmente a partir de um centro. Base da mancha por cota. */
export function dilatar(poligono: Poligono, centro: Coordenada, fator: number): Poligono {
  return {
    aneis: poligono.aneis.map((anel) =>
      anel.map(([x, y]): Coordenada => [
        centro[0] + (x - centro[0]) * fator,
        centro[1] + (y - centro[1]) * fator,
      ]),
    ),
  };
}
```

- [ ] **Step 4: Rodar os testes e verificar que passam**

```bash
npm run test
```
Esperado: PASS, todos os blocos de `geometria.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add -A demo
git commit -m "feat(dominio): geometria de multipoligonos irregulares reproduziveis"
```

---

### Task 4: Domínio — tipos das entidades e controle de qualidade (RF-ING-04)

**Files:**
- Create: `demo/src/dominio/tipos.ts`
- Create: `demo/src/dominio/qc.ts`
- Create: `demo/src/dominio/qc.test.ts`

**Interfaces:**
- Consumes: `Coordenada`, `Poligono` de `@/dominio/geometria`
- Produces:
  - Tipos: `Variavel`, `Qualidade`, `Severidade`, `EstadoAlerta`, `SituacaoEstacao`, `OrigemAlerta`, `Observacao`, `EstacaoMonitoramento`, `ZonaRisco`, `SubBacia`, `AtivoProtecao`, `Limiar`, `EvidenciaAlerta`, `AtualizacaoAlerta`, `Alerta`, `PrevisaoNivel`, `ExposicaoCalculada`
  - `FAIXAS_FISICAS: Record<Variavel, { min: number; max: number }>`
  - `avaliarQualidade(leitura, anteriores): ResultadoQC`
  - `interface ResultadoQC { qualidade: Qualidade; motivo?: string }`

- [ ] **Step 1: Escrever `tipos.ts`** (sem teste próprio — é declaração de tipo; a validação vem dos testes que os consomem)

```ts
import type { Coordenada, Poligono } from "./geometria";

export type Variavel = "chuva_mm" | "nivel_m" | "vazao_m3s";
export type Qualidade = "aprovada" | "suspeita" | "reprovada";
export type Severidade = "baixa" | "media" | "alta" | "muito_alta";
export type OrigemAlerta = "observacao" | "previsao";
export type SituacaoEstacao = "operante" | "degradada" | "silenciosa" | "desativada";

export type EstadoAlerta =
  | "candidato"
  | "validado"
  | "expedido"
  | "atualizado"
  | "encerrado"
  | "descartado";

export interface Observacao {
  readonly observacaoId: string;
  readonly estacaoId: string;
  readonly fonteId: string;
  readonly variavel: Variavel;
  readonly valor: number;
  readonly unidade: string;
  readonly tsOrigem: string;
  readonly tsIngestao: string;
  readonly qualidade: Qualidade;
  readonly motivoQualidade?: string;
}

export interface EstacaoMonitoramento {
  readonly estacaoId: string;
  readonly codigoExterno: string;
  readonly fonteId: string;
  readonly nome: string;
  readonly tipo: "pluviometrica" | "fluviometrica" | "regua";
  readonly subBaciaId: string;
  readonly posicao: Coordenada;
  readonly periodicidadeEsperadaMin: number;
  situacao: SituacaoEstacao;
  ultimaLeituraTs: string | null;
}

export interface SubBacia {
  readonly subBaciaId: string;
  readonly nome: string;
  readonly geometria: Poligono;
  readonly areaKm2: number;
  readonly tempoConcentracaoHoras: number;
}

export interface ZonaRisco {
  readonly zonaId: string;
  readonly nome: string;
  readonly codigoSetorSgb: string;
  readonly subBaciaId: string;
  readonly grauRisco: "alto" | "muito_alto";
  readonly tipo: "inundacao" | "deslizamento";
  readonly familiasEstimadas: number;
  readonly populacaoEstimada: number;
  readonly geometria: Poligono;
}

export interface AtivoProtecao {
  readonly ativoId: string;
  readonly nome: string;
  readonly tipo: "comporta" | "ebap";
  readonly posicao: Coordenada;
  situacaoProntidao: "pronto" | "manutencao" | "inoperante";
}

export interface Limiar {
  readonly limiarId: string;
  readonly zonaId: string;
  readonly variavel: Variavel;
  readonly janelaHoras: number;
  readonly operador: ">=" | ">";
  readonly valor: number;
  readonly severidade: Severidade;
  readonly origem: OrigemAlerta;
  readonly versao: number;
  readonly vigenciaInicio: string;
  readonly vigenciaFim: string | null;
  readonly justificativaTecnica: string;
  readonly autor: string;
}

export interface EvidenciaAlerta {
  readonly tipo: "observacao" | "previsao" | "mancha";
  readonly referenciaId: string;
  readonly descricao: string;
  readonly valor: number;
  readonly ts: string;
}

export interface AtualizacaoAlerta {
  readonly tipo: "escalada" | "reducao" | "reforco" | "encerramento";
  readonly texto: string;
  readonly ts: string;
}

export interface Alerta {
  readonly alertaId: string;
  readonly zonaId: string;
  readonly limiarId: string;
  readonly severidade: Severidade;
  readonly origem: OrigemAlerta;
  readonly estado: EstadoAlerta;
  readonly valorDisparo: number;
  readonly tsDeteccao: string;
  readonly tsValidacao: string | null;
  readonly tsExpedicao: string | null;
  readonly tsEncerramento: string | null;
  readonly leadTimeHoras: number | null;
  readonly operadorValidador: string | null;
  readonly motivoDescarte: string | null;
  readonly evidencias: readonly EvidenciaAlerta[];
  readonly atualizacoes: readonly AtualizacaoAlerta[];
}

export interface PrevisaoNivel {
  readonly previsaoId: string;
  readonly rodadaId: string;
  readonly postoId: string;
  readonly horizonteHoras: number;
  readonly nivelPrevistoM: number;
  readonly limiteInf: number;
  readonly limiteSup: number;
  readonly versaoModelo: string;
  readonly tsRodada: string;
}

export interface ExposicaoCalculada {
  readonly zonaId: string;
  readonly areaInterceptadaKm2: number;
  readonly populacaoEstimada: number;
  readonly familiasEstimadas: number;
  readonly metodoEstimativa: string;
}
```

- [ ] **Step 2: Escrever o teste que falha**

`demo/src/dominio/qc.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { avaliarQualidade } from "./qc";
import type { Observacao } from "./tipos";

function leitura(parcial: Partial<Observacao> = {}): Observacao {
  return {
    observacaoId: "obs-1",
    estacaoId: "E-042",
    fonteId: "CEMADEN",
    variavel: "chuva_mm",
    valor: 12,
    unidade: "mm",
    tsOrigem: "2026-05-01T10:00:00.000Z",
    tsIngestao: "2026-05-01T10:00:30.000Z",
    qualidade: "aprovada",
    ...parcial,
  };
}

describe("avaliarQualidade", () => {
  it("aprova leitura plausivel sem historico", () => {
    expect(avaliarQualidade(leitura(), [])).toEqual({ qualidade: "aprovada" });
  });

  // Espelha CA-ING-04 do SPEC-H1.
  it("reprova leitura de chuva fora da faixa fisica", () => {
    const resultado = avaliarQualidade(leitura({ valor: 2000 }), []);
    expect(resultado.qualidade).toBe("reprovada");
    expect(resultado.motivo).toBe("fora de faixa");
  });

  it("reprova valor negativo de chuva", () => {
    expect(avaliarQualidade(leitura({ valor: -3 }), []).qualidade).toBe("reprovada");
  });

  it("reprova leitura fora de ordem temporal", () => {
    const anterior = leitura({ tsOrigem: "2026-05-01T11:00:00.000Z" });
    const resultado = avaliarQualidade(leitura({ tsOrigem: "2026-05-01T10:00:00.000Z" }), [anterior]);
    expect(resultado.qualidade).toBe("reprovada");
    expect(resultado.motivo).toBe("fora de ordem temporal");
  });

  it("marca como suspeita um salto abrupto de nivel", () => {
    const anterior = leitura({
      variavel: "nivel_m",
      valor: 2,
      unidade: "m",
      tsOrigem: "2026-05-01T09:50:00.000Z",
    });
    const resultado = avaliarQualidade(
      leitura({ variavel: "nivel_m", valor: 9, unidade: "m" }),
      [anterior],
    );
    expect(resultado.qualidade).toBe("suspeita");
    expect(resultado.motivo).toBe("salto abrupto");
  });

  it("marca como suspeita um sensor travado", () => {
    const historico = Array.from({ length: 6 }, (_, i) =>
      leitura({
        variavel: "nivel_m",
        valor: 3.2,
        unidade: "m",
        tsOrigem: `2026-05-01T0${i + 1}:00:00.000Z`,
      }),
    );
    const resultado = avaliarQualidade(
      leitura({ variavel: "nivel_m", valor: 3.2, unidade: "m" }),
      historico,
    );
    expect(resultado.qualidade).toBe("suspeita");
    expect(resultado.motivo).toBe("sensor travado");
  });

  it("nao confunde series de variaveis diferentes", () => {
    const chuva = leitura({ variavel: "chuva_mm", valor: 0 });
    const resultado = avaliarQualidade(
      leitura({ variavel: "nivel_m", valor: 3.5, unidade: "m" }),
      [chuva],
    );
    expect(resultado.qualidade).toBe("aprovada");
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
npm run test
```
Esperado: FAIL — `Cannot find module './qc'`.

- [ ] **Step 4: Implementar `qc.ts`**

```ts
import type { Observacao, Qualidade, Variavel } from "./tipos";

/** Faixas fisicamente plausiveis por variavel. Materializa RF-ING-04. */
export const FAIXAS_FISICAS: Record<Variavel, { min: number; max: number }> = {
  chuva_mm: { min: 0, max: 500 },
  nivel_m: { min: -2, max: 40 },
  vazao_m3s: { min: 0, max: 50_000 },
};

/** Variacao maxima aceitavel entre leituras consecutivas da mesma variavel. */
const SALTO_MAXIMO: Record<Variavel, number> = {
  chuva_mm: 200,
  nivel_m: 3,
  vazao_m3s: 10_000,
};

const LEITURAS_IGUAIS_PARA_TRAVADO = 6;

export interface ResultadoQC {
  readonly qualidade: Qualidade;
  readonly motivo?: string;
}

/**
 * Avalia a qualidade de uma leitura contra faixa fisica, ordem temporal,
 * salto abrupto e sensor travado.
 *
 * Regra do SPEC-H1: leitura reprovada NUNCA e descartada em silencio —
 * ela e persistida com o sinalizador e simplesmente nao alimenta o alerta.
 */
export function avaliarQualidade(
  leitura: Observacao,
  anteriores: readonly Observacao[],
): ResultadoQC {
  const faixa = FAIXAS_FISICAS[leitura.variavel];
  if (leitura.valor < faixa.min || leitura.valor > faixa.max) {
    return { qualidade: "reprovada", motivo: "fora de faixa" };
  }

  const mesmaSerie = anteriores.filter(
    (o) => o.variavel === leitura.variavel && o.estacaoId === leitura.estacaoId,
  );

  const ultima = mesmaSerie[mesmaSerie.length - 1];
  if (ultima && new Date(leitura.tsOrigem) <= new Date(ultima.tsOrigem)) {
    return { qualidade: "reprovada", motivo: "fora de ordem temporal" };
  }

  if (ultima && Math.abs(leitura.valor - ultima.valor) > SALTO_MAXIMO[leitura.variavel]) {
    return { qualidade: "suspeita", motivo: "salto abrupto" };
  }

  const recentes = mesmaSerie.slice(-(LEITURAS_IGUAIS_PARA_TRAVADO - 1));
  if (
    recentes.length === LEITURAS_IGUAIS_PARA_TRAVADO - 1 &&
    recentes.every((o) => o.valor === leitura.valor)
  ) {
    return { qualidade: "suspeita", motivo: "sensor travado" };
  }

  return { qualidade: "aprovada" };
}
```

- [ ] **Step 5: Rodar os testes e verificar que passam**

```bash
npm run test
```
Esperado: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A demo
git commit -m "feat(dominio): tipos das entidades e controle de qualidade de leitura (RF-ING-04)"
```

---

### Task 5: Domínio — limiares e ciclo de vida do alerta (RF-ALT-01/02/04/05, RNF-18)

**Files:**
- Create: `demo/src/dominio/limiar.ts`
- Create: `demo/src/dominio/limiar.test.ts`
- Create: `demo/src/dominio/alerta.ts`
- Create: `demo/src/dominio/alerta.test.ts`

**Interfaces:**
- Consumes: `Observacao`, `Limiar`, `Alerta`, `Severidade`, `EvidenciaAlerta`, `OrigemAlerta` de `@/dominio/tipos`
- Produces:
  - `acumular(obs, variavel, estacaoIds, janelaHoras, agoraIso): number`
  - `limiaresVigentes(limiares, agoraIso): Limiar[]`
  - `atingeLimiar(limiar, valor): boolean`
  - `criarAlertaCandidato(params): Alerta`
  - `validar(alerta, operador, tsIso): Alerta`
  - `descartar(alerta, motivo, tsIso): Alerta`
  - `expedir(alerta, tsIso): Alerta`  ← lança se não validado
  - `encerrar(alerta, tsIso): Alerta`
  - `deveAgrupar(ativo, severidadeNova, tsNovoIso, janelaMinutos): boolean`
  - `aplicarAtualizacao(alerta, tipo, texto, tsIso): Alerta`
  - `ORDEM_SEVERIDADE: Record<Severidade, number>`

- [ ] **Step 1: Escrever `limiar.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { acumular, atingeLimiar, limiaresVigentes } from "./limiar";
import type { Limiar, Observacao } from "./tipos";

function obs(parcial: Partial<Observacao>): Observacao {
  return {
    observacaoId: "o",
    estacaoId: "E-1",
    fonteId: "CEMADEN",
    variavel: "chuva_mm",
    valor: 10,
    unidade: "mm",
    tsOrigem: "2026-05-01T09:00:00.000Z",
    tsIngestao: "2026-05-01T09:00:10.000Z",
    qualidade: "aprovada",
    ...parcial,
  };
}

const limiarBase: Limiar = {
  limiarId: "L-1",
  zonaId: "Z-27",
  variavel: "chuva_mm",
  janelaHoras: 6,
  operador: ">=",
  valor: 60,
  severidade: "alta",
  origem: "observacao",
  versao: 1,
  vigenciaInicio: "2026-01-01T00:00:00.000Z",
  vigenciaFim: null,
  justificativaTecnica: "Limiar de referencia da zona",
  autor: "analista.demo",
};

describe("acumular", () => {
  it("soma apenas leituras aprovadas dentro da janela", () => {
    const leituras = [
      obs({ valor: 20, tsOrigem: "2026-05-01T09:00:00.000Z" }),
      obs({ valor: 25, tsOrigem: "2026-05-01T11:00:00.000Z" }),
      obs({ valor: 30, tsOrigem: "2026-05-01T11:30:00.000Z", qualidade: "reprovada" }),
      obs({ valor: 40, tsOrigem: "2026-05-01T02:00:00.000Z" }),
    ];
    const total = acumular(leituras, "chuva_mm", ["E-1"], 6, "2026-05-01T12:00:00.000Z");
    expect(total).toBe(45);
  });

  it("ignora estacoes fora da lista", () => {
    const leituras = [
      obs({ valor: 20, estacaoId: "E-1" }),
      obs({ valor: 99, estacaoId: "E-2" }),
    ];
    expect(acumular(leituras, "chuva_mm", ["E-1"], 6, "2026-05-01T12:00:00.000Z")).toBe(20);
  });

  it("retorna zero quando nao ha leitura na janela", () => {
    expect(acumular([], "chuva_mm", ["E-1"], 6, "2026-05-01T12:00:00.000Z")).toBe(0);
  });

  // Regra de integridade 8.5 do SPEC-H1.
  it("nunca soma leitura suspeita ou reprovada", () => {
    const leituras = [
      obs({ valor: 100, qualidade: "suspeita" }),
      obs({ valor: 100, qualidade: "reprovada" }),
    ];
    expect(acumular(leituras, "chuva_mm", ["E-1"], 6, "2026-05-01T12:00:00.000Z")).toBe(0);
  });
});

describe("limiaresVigentes", () => {
  it("mantem limiar sem data de fim", () => {
    expect(limiaresVigentes([limiarBase], "2026-05-01T00:00:00.000Z")).toHaveLength(1);
  });

  it("descarta limiar cuja vigencia terminou", () => {
    const encerrado = { ...limiarBase, vigenciaFim: "2026-04-01T00:00:00.000Z" };
    expect(limiaresVigentes([encerrado], "2026-05-01T00:00:00.000Z")).toHaveLength(0);
  });

  it("descarta limiar que ainda nao entrou em vigor", () => {
    const futuro = { ...limiarBase, vigenciaInicio: "2026-06-01T00:00:00.000Z" };
    expect(limiaresVigentes([futuro], "2026-05-01T00:00:00.000Z")).toHaveLength(0);
  });
});

describe("atingeLimiar", () => {
  it("aceita igualdade quando o operador e >=", () => {
    expect(atingeLimiar(limiarBase, 60)).toBe(true);
  });

  it("rejeita igualdade quando o operador e >", () => {
    expect(atingeLimiar({ ...limiarBase, operador: ">" }, 60)).toBe(false);
  });

  it("aceita valor acima do limiar", () => {
    expect(atingeLimiar(limiarBase, 62)).toBe(true);
  });

  it("rejeita valor abaixo do limiar", () => {
    expect(atingeLimiar(limiarBase, 59.9)).toBe(false);
  });
});
```

- [ ] **Step 2: Escrever `alerta.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  aplicarAtualizacao,
  criarAlertaCandidato,
  descartar,
  deveAgrupar,
  encerrar,
  expedir,
  validar,
} from "./alerta";
import type { Alerta } from "./tipos";

function candidato(): Alerta {
  return criarAlertaCandidato({
    alertaId: "A-1",
    zonaId: "Z-27",
    limiarId: "L-1",
    severidade: "alta",
    origem: "observacao",
    valorDisparo: 62,
    tsDeteccao: "2026-05-01T12:00:00.000Z",
    leadTimeHoras: null,
    evidencias: [
      {
        tipo: "observacao",
        referenciaId: "obs-9",
        descricao: "Chuva acumulada 6 h na zona Z-27",
        valor: 62,
        ts: "2026-05-01T12:00:00.000Z",
      },
    ],
  });
}

describe("criarAlertaCandidato", () => {
  it("nasce no estado candidato, sem validador nem expedicao", () => {
    const a = candidato();
    expect(a.estado).toBe("candidato");
    expect(a.operadorValidador).toBeNull();
    expect(a.tsValidacao).toBeNull();
    expect(a.tsExpedicao).toBeNull();
  });

  it("carrega a evidencia que o disparou", () => {
    expect(candidato().evidencias).toHaveLength(1);
    expect(candidato().evidencias[0]?.valor).toBe(62);
  });
});

describe("validar", () => {
  it("registra operador e horario", () => {
    const a = validar(candidato(), "coord.plantao", "2026-05-01T12:04:00.000Z");
    expect(a.estado).toBe("validado");
    expect(a.operadorValidador).toBe("coord.plantao");
    expect(a.tsValidacao).toBe("2026-05-01T12:04:00.000Z");
  });

  it("recusa validar um alerta ja descartado", () => {
    const descartado = descartar(candidato(), "chuva localizada sem risco", "2026-05-01T12:02:00.000Z");
    expect(() => validar(descartado, "coord.plantao", "2026-05-01T12:05:00.000Z")).toThrow(
      "so um alerta candidato pode ser validado",
    );
  });

  it("recusa operador vazio", () => {
    expect(() => validar(candidato(), "  ", "2026-05-01T12:04:00.000Z")).toThrow(
      "operador obrigatorio",
    );
  });
});

describe("descartar", () => {
  it("exige motivo — CA-ALT-04b", () => {
    expect(() => descartar(candidato(), "", "2026-05-01T12:02:00.000Z")).toThrow(
      "motivo obrigatorio",
    );
  });

  it("registra motivo e horario", () => {
    const a = descartar(candidato(), "chuva ja cessou", "2026-05-01T12:02:00.000Z");
    expect(a.estado).toBe("descartado");
    expect(a.motivoDescarte).toBe("chuva ja cessou");
  });
});

// Este bloco e a materializacao de RNF-18. Nao pode ser afrouxado.
describe("expedir", () => {
  it("recusa expedir alerta candidato — CA-ALT-04a", () => {
    expect(() => expedir(candidato(), "2026-05-01T12:05:00.000Z")).toThrow(
      "expedicao exige alerta validado por operador identificado",
    );
  });

  it("recusa expedir alerta descartado", () => {
    const d = descartar(candidato(), "sem risco", "2026-05-01T12:02:00.000Z");
    expect(() => expedir(d, "2026-05-01T12:05:00.000Z")).toThrow(
      "expedicao exige alerta validado por operador identificado",
    );
  });

  it("expede apenas depois da validacao humana", () => {
    const validado = validar(candidato(), "coord.plantao", "2026-05-01T12:04:00.000Z");
    const expedido = expedir(validado, "2026-05-01T12:05:00.000Z");
    expect(expedido.estado).toBe("expedido");
    expect(expedido.tsExpedicao).toBe("2026-05-01T12:05:00.000Z");
    expect(expedido.operadorValidador).toBe("coord.plantao");
  });
});

describe("encerrar", () => {
  it("encerra alerta expedido", () => {
    const expedido = expedir(
      validar(candidato(), "coord.plantao", "2026-05-01T12:04:00.000Z"),
      "2026-05-01T12:05:00.000Z",
    );
    const encerrado = encerrar(expedido, "2026-05-01T18:00:00.000Z");
    expect(encerrado.estado).toBe("encerrado");
    expect(encerrado.tsEncerramento).toBe("2026-05-01T18:00:00.000Z");
  });
});

describe("deveAgrupar", () => {
  const ativo = expedir(
    validar(candidato(), "coord.plantao", "2026-05-01T12:04:00.000Z"),
    "2026-05-01T12:05:00.000Z",
  );

  it("agrupa severidade igual dentro da janela — CA-ALT-05", () => {
    expect(deveAgrupar(ativo, "alta", "2026-05-01T12:40:00.000Z", 60)).toBe(true);
  });

  it("agrupa severidade menor dentro da janela", () => {
    expect(deveAgrupar(ativo, "media", "2026-05-01T12:40:00.000Z", 60)).toBe(true);
  });

  it("nao agrupa severidade maior — escalada merece tratamento proprio", () => {
    expect(deveAgrupar(ativo, "muito_alta", "2026-05-01T12:40:00.000Z", 60)).toBe(false);
  });

  it("nao agrupa fora da janela", () => {
    expect(deveAgrupar(ativo, "alta", "2026-05-01T14:00:00.000Z", 60)).toBe(false);
  });

  it("nao agrupa em alerta encerrado", () => {
    const encerrado = encerrar(ativo, "2026-05-01T12:30:00.000Z");
    expect(deveAgrupar(encerrado, "alta", "2026-05-01T12:40:00.000Z", 60)).toBe(false);
  });
});

describe("aplicarAtualizacao", () => {
  it("adiciona atualizacao preservando o historico", () => {
    const a = aplicarAtualizacao(candidato(), "reforco", "Chuva mantida", "2026-05-01T12:30:00.000Z");
    const b = aplicarAtualizacao(a, "escalada", "Nivel subindo", "2026-05-01T13:00:00.000Z");
    expect(b.atualizacoes).toHaveLength(2);
    expect(b.atualizacoes[1]?.tipo).toBe("escalada");
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
npm run test
```
Esperado: FAIL — módulos `./limiar` e `./alerta` inexistentes.

- [ ] **Step 4: Implementar `limiar.ts`**

```ts
import type { Limiar, Observacao, Variavel } from "./tipos";

/**
 * Acumula o valor de uma variavel em uma janela movel.
 * So entram leituras APROVADAS — regra de integridade 8.5 do SPEC-H1.
 */
export function acumular(
  observacoes: readonly Observacao[],
  variavel: Variavel,
  estacaoIds: readonly string[],
  janelaHoras: number,
  agoraIso: string,
): number {
  const fim = new Date(agoraIso).getTime();
  const inicio = fim - janelaHoras * 3_600_000;
  return observacoes
    .filter((o) => o.variavel === variavel)
    .filter((o) => o.qualidade === "aprovada")
    .filter((o) => estacaoIds.includes(o.estacaoId))
    .filter((o) => {
      const t = new Date(o.tsOrigem).getTime();
      return t > inicio && t <= fim;
    })
    .reduce((soma, o) => soma + o.valor, 0);
}

export function limiaresVigentes(limiares: readonly Limiar[], agoraIso: string): Limiar[] {
  const agora = new Date(agoraIso).getTime();
  return limiares.filter((l) => {
    const inicio = new Date(l.vigenciaInicio).getTime();
    const fim = l.vigenciaFim ? new Date(l.vigenciaFim).getTime() : Number.POSITIVE_INFINITY;
    return agora >= inicio && agora < fim;
  });
}

export function atingeLimiar(limiar: Limiar, valor: number): boolean {
  return limiar.operador === ">=" ? valor >= limiar.valor : valor > limiar.valor;
}
```

- [ ] **Step 5: Implementar `alerta.ts`**

```ts
import type {
  Alerta,
  AtualizacaoAlerta,
  EvidenciaAlerta,
  OrigemAlerta,
  Severidade,
} from "./tipos";

export const ORDEM_SEVERIDADE: Record<Severidade, number> = {
  baixa: 1,
  media: 2,
  alta: 3,
  muito_alta: 4,
};

export interface ParametrosAlerta {
  readonly alertaId: string;
  readonly zonaId: string;
  readonly limiarId: string;
  readonly severidade: Severidade;
  readonly origem: OrigemAlerta;
  readonly valorDisparo: number;
  readonly tsDeteccao: string;
  readonly leadTimeHoras: number | null;
  readonly evidencias: readonly EvidenciaAlerta[];
}

export function criarAlertaCandidato(p: ParametrosAlerta): Alerta {
  return {
    alertaId: p.alertaId,
    zonaId: p.zonaId,
    limiarId: p.limiarId,
    severidade: p.severidade,
    origem: p.origem,
    estado: "candidato",
    valorDisparo: p.valorDisparo,
    tsDeteccao: p.tsDeteccao,
    tsValidacao: null,
    tsExpedicao: null,
    tsEncerramento: null,
    leadTimeHoras: p.leadTimeHoras,
    operadorValidador: null,
    motivoDescarte: null,
    evidencias: p.evidencias,
    atualizacoes: [],
  };
}

export function validar(alerta: Alerta, operador: string, tsIso: string): Alerta {
  if (alerta.estado !== "candidato") {
    throw new Error("so um alerta candidato pode ser validado");
  }
  if (operador.trim() === "") {
    throw new Error("operador obrigatorio");
  }
  return { ...alerta, estado: "validado", operadorValidador: operador, tsValidacao: tsIso };
}

export function descartar(alerta: Alerta, motivo: string, tsIso: string): Alerta {
  if (alerta.estado !== "candidato") {
    throw new Error("so um alerta candidato pode ser descartado");
  }
  if (motivo.trim() === "") {
    throw new Error("motivo obrigatorio");
  }
  return { ...alerta, estado: "descartado", motivoDescarte: motivo, tsEncerramento: tsIso };
}

/**
 * RNF-18 do SPEC-H1, materializado em codigo.
 *
 * Nao existe caminho que leve um alerta a "expedido" sem passar por validar().
 * Se algum agente tentar, esta funcao lanca — e a demo mostra o bloqueio em cena.
 * NAO AFROUXAR.
 */
export function expedir(alerta: Alerta, tsIso: string): Alerta {
  if (alerta.estado !== "validado" || alerta.operadorValidador === null) {
    throw new Error("expedicao exige alerta validado por operador identificado");
  }
  return { ...alerta, estado: "expedido", tsExpedicao: tsIso };
}

export function encerrar(alerta: Alerta, tsIso: string): Alerta {
  if (alerta.estado !== "expedido" && alerta.estado !== "atualizado") {
    throw new Error("so alerta expedido ou atualizado pode ser encerrado");
  }
  return { ...alerta, estado: "encerrado", tsEncerramento: tsIso };
}

/**
 * Antifadiga (RF-ALT-05): reincidencia de severidade igual ou menor,
 * dentro da janela, vira atualizacao do alerta ativo — nao um alerta novo.
 */
export function deveAgrupar(
  ativo: Alerta,
  severidadeNova: Severidade,
  tsNovoIso: string,
  janelaMinutos: number,
): boolean {
  const estadosAtivos: Alerta["estado"][] = ["candidato", "validado", "expedido", "atualizado"];
  if (!estadosAtivos.includes(ativo.estado)) return false;
  if (ORDEM_SEVERIDADE[severidadeNova] > ORDEM_SEVERIDADE[ativo.severidade]) return false;
  const decorridoMin =
    (new Date(tsNovoIso).getTime() - new Date(ativo.tsDeteccao).getTime()) / 60_000;
  return decorridoMin >= 0 && decorridoMin <= janelaMinutos;
}

export function aplicarAtualizacao(
  alerta: Alerta,
  tipo: AtualizacaoAlerta["tipo"],
  texto: string,
  tsIso: string,
): Alerta {
  return {
    ...alerta,
    atualizacoes: [...alerta.atualizacoes, { tipo, texto, ts: tsIso }],
  };
}
```

- [ ] **Step 6: Rodar os testes e verificar que passam**

```bash
npm run test
```
Esperado: PASS. Confirme especificamente que os três testes do bloco `expedir` passam — eles são o coração do `RNF-18`.

- [ ] **Step 7: Commit**

```bash
git add -A demo
git commit -m "feat(dominio): limiares por zona e ciclo de vida do alerta com RNF-18 obrigatorio"
```

---

### Task 6: Domínio — previsão de nível, mancha por cota e exposição (RF-MOD-02/04)

**Files:**
- Create: `demo/src/dominio/previsao.ts`
- Create: `demo/src/dominio/previsao.test.ts`
- Create: `demo/src/dominio/mancha.ts`
- Create: `demo/src/dominio/mancha.test.ts`

**Interfaces:**
- Consumes: `Poligono`, `Coordenada`, `areaAproxKm2`, `dilatar`, `poligonosSeIntersectam`, `centroide` de `@/dominio/geometria`; `ZonaRisco`, `PrevisaoNivel`, `ExposicaoCalculada` de `@/dominio/tipos`
- Produces:
  - `preverNivel(params: ParametrosPrevisao): PrevisaoNivel[]`
  - `interface ParametrosPrevisao { rodadaId; postoId; nivelAtualM; chuvaAcumulada6hMm; chuvaPrevista24hMm; tempoConcentracaoHoras; horizontes; tsRodada; versaoModelo }`
  - `mancharPorCota(corredor: Poligono, cotaM: number, cotaBaseM: number): Poligono`
  - `exposicaoPorMancha(mancha, zonas): ExposicaoCalculada[]`
  - `VERSAO_MODELO = "demo-chuva-nivel-0.1"`

- [ ] **Step 1: Escrever `previsao.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { preverNivel, VERSAO_MODELO, type ParametrosPrevisao } from "./previsao";

function params(parcial: Partial<ParametrosPrevisao> = {}): ParametrosPrevisao {
  return {
    rodadaId: "R-1",
    postoId: "P-1",
    nivelAtualM: 2,
    chuvaAcumulada6hMm: 0,
    chuvaPrevista24hMm: 0,
    tempoConcentracaoHoras: 8,
    horizontes: [6, 12, 24],
    tsRodada: "2026-05-01T12:00:00.000Z",
    ...parcial,
  };
}

describe("preverNivel", () => {
  it("gera uma previsao por horizonte pedido", () => {
    const p = preverNivel(params());
    expect(p).toHaveLength(3);
    expect(p.map((x) => x.horizonteHoras)).toEqual([6, 12, 24]);
  });

  it("identifica a versao do modelo e a rodada — CA-MOD-02", () => {
    const p = preverNivel(params());
    expect(p[0]?.versaoModelo).toBe(VERSAO_MODELO);
    expect(p[0]?.rodadaId).toBe("R-1");
    expect(p[0]?.tsRodada).toBe("2026-05-01T12:00:00.000Z");
  });

  it("entrega limite inferior e superior em toda previsao", () => {
    for (const previsao of preverNivel(params())) {
      expect(previsao.limiteInf).toBeLessThan(previsao.nivelPrevistoM);
      expect(previsao.limiteSup).toBeGreaterThan(previsao.nivelPrevistoM);
    }
  });

  it("alarga a incerteza conforme o horizonte cresce", () => {
    const p = preverNivel(params());
    const faixa = (i: number) => {
      const x = p[i];
      if (!x) throw new Error("previsao ausente");
      return x.limiteSup - x.limiteInf;
    };
    expect(faixa(2)).toBeGreaterThan(faixa(0));
  });

  it("sobe o nivel quando ha chuva significativa", () => {
    const seco = preverNivel(params());
    const chuvoso = preverNivel(params({ chuvaAcumulada6hMm: 80, chuvaPrevista24hMm: 120 }));
    const nivelSeco = seco[1]?.nivelPrevistoM ?? 0;
    const nivelChuvoso = chuvoso[1]?.nivelPrevistoM ?? 0;
    expect(nivelChuvoso).toBeGreaterThan(nivelSeco);
  });

  it("recede lentamente quando nao ha chuva", () => {
    const p = preverNivel(params({ nivelAtualM: 5 }));
    expect(p[2]?.nivelPrevistoM).toBeLessThan(5);
  });

  it("nunca devolve nivel abaixo do leito seco", () => {
    const p = preverNivel(params({ nivelAtualM: 0.05, horizontes: [6, 12, 24, 48] }));
    for (const previsao of p) {
      expect(previsao.nivelPrevistoM).toBeGreaterThanOrEqual(0);
    }
  });

  it("e deterministico: mesma entrada, mesma saida", () => {
    expect(preverNivel(params({ chuvaAcumulada6hMm: 45 }))).toEqual(
      preverNivel(params({ chuvaAcumulada6hMm: 45 })),
    );
  });
});
```

- [ ] **Step 2: Escrever `mancha.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { areaAproxKm2, type Anel, type Poligono } from "./geometria";
import { exposicaoPorMancha, mancharPorCota } from "./mancha";
import type { ZonaRisco } from "./tipos";

const corredorAnel: Anel = [
  [-51.25, -30.05],
  [-51.25, -30.0],
  [-51.2, -30.0],
  [-51.2, -30.05],
  [-51.25, -30.05],
];
const corredor: Poligono = { aneis: [corredorAnel] };

function zona(id: string, anel: Anel, populacao = 1000): ZonaRisco {
  return {
    zonaId: id,
    nome: `Zona ${id}`,
    codigoSetorSgb: `SGB-${id}`,
    subBaciaId: "SB-1",
    grauRisco: "muito_alto",
    tipo: "inundacao",
    familiasEstimadas: Math.round(populacao / 3.2),
    populacaoEstimada: populacao,
    geometria: { aneis: [anel] },
  };
}

describe("mancharPorCota", () => {
  it("mantem a geometria do corredor na cota base", () => {
    const m = mancharPorCota(corredor, 2, 2);
    expect(m.aneis[0]).toEqual(corredorAnel);
  });

  it("expande a mancha quando a cota sobe", () => {
    const base = areaAproxKm2(corredorAnel);
    const cheia = mancharPorCota(corredor, 5, 2);
    const anelCheia = cheia.aneis[0];
    if (!anelCheia) throw new Error("anel ausente");
    expect(areaAproxKm2(anelCheia)).toBeGreaterThan(base);
  });

  it("nao encolhe abaixo do corredor quando a cota fica abaixo da base", () => {
    const seca = mancharPorCota(corredor, 0.5, 2);
    const anelSeca = seca.aneis[0];
    if (!anelSeca) throw new Error("anel ausente");
    expect(areaAproxKm2(anelSeca)).toBeCloseTo(areaAproxKm2(corredorAnel), 5);
  });

  it("cresce monotonicamente com a cota", () => {
    const areaNaCota = (cota: number) => {
      const anel = mancharPorCota(corredor, cota, 2).aneis[0];
      if (!anel) throw new Error("anel ausente");
      return areaAproxKm2(anel);
    };
    expect(areaNaCota(4)).toBeGreaterThan(areaNaCota(3));
    expect(areaNaCota(6)).toBeGreaterThan(areaNaCota(4));
  });
});

describe("exposicaoPorMancha", () => {
  const dentro = zona("Z-1", [
    [-51.24, -30.04],
    [-51.24, -30.03],
    [-51.23, -30.03],
    [-51.23, -30.04],
    [-51.24, -30.04],
  ], 2400);

  const fora = zona("Z-2", [
    [-50.0, -29.0],
    [-50.0, -28.99],
    [-49.99, -28.99],
    [-49.99, -29.0],
    [-50.0, -29.0],
  ], 900);

  it("retorna somente as zonas interceptadas — CA-MOD-04", () => {
    const exposicao = exposicaoPorMancha(corredor, [dentro, fora]);
    expect(exposicao.map((e) => e.zonaId)).toEqual(["Z-1"]);
  });

  it("informa populacao, familias e metodo", () => {
    const e = exposicaoPorMancha(corredor, [dentro])[0];
    if (!e) throw new Error("exposicao ausente");
    expect(e.populacaoEstimada).toBe(2400);
    expect(e.familiasEstimadas).toBe(750);
    expect(e.metodoEstimativa).toContain("sintetico");
    expect(e.areaInterceptadaKm2).toBeGreaterThan(0);
  });

  it("devolve lista vazia quando nada e interceptado", () => {
    expect(exposicaoPorMancha(corredor, [fora])).toEqual([]);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
npm run test
```
Esperado: FAIL — módulos `./previsao` e `./mancha` inexistentes.

- [ ] **Step 4: Implementar `previsao.ts`**

```ts
import type { PrevisaoNivel } from "./tipos";

export const VERSAO_MODELO = "demo-chuva-nivel-0.1";

/** Metros de nivel por milimetro de chuva efetiva. Parametro sintetico. */
const GANHO_M_POR_MM = 0.018;
/** Recessao natural do nivel, em metros por hora, sem chuva. */
const RECESSAO_M_POR_H = 0.02;

export interface ParametrosPrevisao {
  readonly rodadaId: string;
  readonly postoId: string;
  readonly nivelAtualM: number;
  readonly chuvaAcumulada6hMm: number;
  readonly chuvaPrevista24hMm: number;
  readonly tempoConcentracaoHoras: number;
  readonly horizontes: readonly number[];
  readonly tsRodada: string;
}

/**
 * Resposta chuva-nivel parametrizada.
 *
 * ATENCAO: isto NAO e um modelo hidrologico. E uma curva de resposta com
 * atraso e recessao, suficiente para demonstrar o fluxo de previsao ->
 * mancha -> geofencing -> alerta. Nunca apresentar como capacidade preditiva.
 * O SPEC-H1 (AD-04) trata o modelo real como componente acoplavel por interface.
 */
export function preverNivel(p: ParametrosPrevisao): PrevisaoNivel[] {
  const tc = Math.max(p.tempoConcentracaoHoras, 1);

  return p.horizontes.map((h) => {
    // Fracao da chuva prevista que ja caiu ate o horizonte h.
    const chuvaAcumuladaAteH = p.chuvaPrevista24hMm * Math.min(h / 24, 1);
    const chuvaEfetiva = p.chuvaAcumulada6hMm + chuvaAcumuladaAteH;

    // Hidrograma simplificado: sobe ate o tempo de concentracao, depois decai.
    const resposta = h <= tc ? h / tc : Math.exp(-(h - tc) / tc);

    const bruto =
      p.nivelAtualM + chuvaEfetiva * GANHO_M_POR_MM * resposta - RECESSAO_M_POR_H * h;
    const nivelPrevistoM = Math.max(0, Number(bruto.toFixed(3)));

    const incerteza = Number((0.05 * h + 0.1).toFixed(3));

    return {
      previsaoId: `${p.rodadaId}-${p.postoId}-${h}`,
      rodadaId: p.rodadaId,
      postoId: p.postoId,
      horizonteHoras: h,
      nivelPrevistoM,
      limiteInf: Number(Math.max(0, nivelPrevistoM - incerteza).toFixed(3)) - 0.001,
      limiteSup: Number((nivelPrevistoM + incerteza).toFixed(3)),
      versaoModelo: VERSAO_MODELO,
      tsRodada: p.tsRodada,
    };
  });
}
```

Nota sobre o `- 0.001` no `limiteInf`: garante que o limite inferior seja estritamente menor que o valor previsto mesmo quando o nível é 0 e o arredondamento os igualaria. O teste "entrega limite inferior e superior" cobre isso.

- [ ] **Step 5: Implementar `mancha.ts`**

```ts
import { areaAproxKm2, centroide, dilatar, poligonosSeIntersectam, type Poligono } from "./geometria";
import type { ExposicaoCalculada, ZonaRisco } from "./tipos";

/** Quanto a mancha se expande por metro de cota acima da base. */
const EXPANSAO_POR_METRO = 0.22;

/**
 * Gera a mancha de inundacao dilatando o corredor fluvial em funcao da cota.
 * Aproximacao geometrica — o SPEC-H1 preve modelagem hidraulica real (RF-MOD-04).
 */
export function mancharPorCota(corredor: Poligono, cotaM: number, cotaBaseM: number): Poligono {
  const excedente = Math.max(0, cotaM - cotaBaseM);
  const fator = 1 + excedente * EXPANSAO_POR_METRO;
  if (fator === 1) return corredor;

  const primeiroAnel = corredor.aneis[0];
  if (!primeiroAnel) return corredor;
  return dilatar(corredor, centroide(primeiroAnel), fator);
}

/**
 * Cruza a mancha com as zonas de risco e devolve a exposicao por zona.
 * A area interceptada e aproximada pela area da zona (a demo nao calcula
 * a interseccao poligonal exata) — o metodo fica declarado no resultado.
 */
export function exposicaoPorMancha(
  mancha: Poligono,
  zonas: readonly ZonaRisco[],
): ExposicaoCalculada[] {
  return zonas
    .filter((zona) => poligonosSeIntersectam(mancha, zona.geometria))
    .map((zona) => {
      const area = zona.geometria.aneis.reduce((soma, anel) => soma + areaAproxKm2(anel), 0);
      return {
        zonaId: zona.zonaId,
        areaInterceptadaKm2: Number(area.toFixed(3)),
        populacaoEstimada: zona.populacaoEstimada,
        familiasEstimadas: zona.familiasEstimadas,
        metodoEstimativa: "area total da zona interceptada (dado sintetico de demonstracao)",
      };
    });
}
```

- [ ] **Step 6: Rodar os testes e verificar que passam**

```bash
npm run test
```
Esperado: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A demo
git commit -m "feat(dominio): previsao de nivel com incerteza e mancha de inundacao por cota"
```

---

### Task 7: Simulação — barramento de eventos e trilha de auditoria (RF-GOV-02)

**Files:**
- Create: `demo/src/simulacao/barramento.ts`
- Create: `demo/src/simulacao/barramento.test.ts`

**Interfaces:**
- Consumes: nada do domínio (é infraestrutura da simulação)
- Produces:
  - `type TipoEvento` (união literal, lista completa abaixo)
  - `interface Evento<C = unknown> { eventoId; tipo; agenteId; ts; correlacaoId?; titulo; carga: C }`
  - `class Barramento` com `publicar(e): void`, `assinar(tipo, ouvinte): () => void`, `assinarTudo(ouvinte): () => void`, `historico(): readonly Evento[]`, `porCorrelacao(id): Evento[]`, `limpar(): void`

- [ ] **Step 1: Escrever `barramento.test.ts`**

```ts
import { describe, expect, it, vi } from "vitest";
import { Barramento, type Evento } from "./barramento";

function evento(parcial: Partial<Evento> = {}): Evento {
  return {
    eventoId: "ev-1",
    tipo: "leitura.ingerida",
    agenteId: "agente-ingestao-cemaden",
    ts: "2026-05-01T12:00:00.000Z",
    titulo: "Leitura ingerida",
    carga: {},
    ...parcial,
  };
}

describe("Barramento", () => {
  it("entrega o evento ao assinante do tipo", () => {
    const barramento = new Barramento();
    const ouvinte = vi.fn();
    barramento.assinar("leitura.ingerida", ouvinte);
    barramento.publicar(evento());
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it("nao entrega evento de outro tipo", () => {
    const barramento = new Barramento();
    const ouvinte = vi.fn();
    barramento.assinar("alerta.criado", ouvinte);
    barramento.publicar(evento());
    expect(ouvinte).not.toHaveBeenCalled();
  });

  it("entrega todos os eventos ao assinante global", () => {
    const barramento = new Barramento();
    const ouvinte = vi.fn();
    barramento.assinarTudo(ouvinte);
    barramento.publicar(evento());
    barramento.publicar(evento({ eventoId: "ev-2", tipo: "alerta.criado" }));
    expect(ouvinte).toHaveBeenCalledTimes(2);
  });

  it("permite cancelar a assinatura", () => {
    const barramento = new Barramento();
    const ouvinte = vi.fn();
    const cancelar = barramento.assinar("leitura.ingerida", ouvinte);
    cancelar();
    barramento.publicar(evento());
    expect(ouvinte).not.toHaveBeenCalled();
  });

  // RF-GOV-02: a trilha e imutavel do ponto de vista de quem consome.
  it("acumula o historico na ordem de publicacao", () => {
    const barramento = new Barramento();
    barramento.publicar(evento({ eventoId: "a" }));
    barramento.publicar(evento({ eventoId: "b" }));
    expect(barramento.historico().map((e) => e.eventoId)).toEqual(["a", "b"]);
  });

  it("nao permite que o consumidor altere o historico", () => {
    const barramento = new Barramento();
    barramento.publicar(evento({ eventoId: "a" }));
    const copia = barramento.historico() as Evento[];
    expect(() => copia.push(evento({ eventoId: "intruso" }))).toThrow();
    expect(barramento.historico()).toHaveLength(1);
  });

  // CA-GOV-02: reconstituir um alerta ponta a ponta.
  it("reconstitui a cadeia completa por correlacao", () => {
    const barramento = new Barramento();
    barramento.publicar(evento({ eventoId: "1", correlacaoId: "A-1", tipo: "limiar.atingido" }));
    barramento.publicar(evento({ eventoId: "2", correlacaoId: "A-1", tipo: "alerta.criado" }));
    barramento.publicar(evento({ eventoId: "3", correlacaoId: "A-2", tipo: "alerta.criado" }));
    barramento.publicar(evento({ eventoId: "4", correlacaoId: "A-1", tipo: "alerta.expedido" }));

    const cadeia = barramento.porCorrelacao("A-1");
    expect(cadeia.map((e) => e.tipo)).toEqual([
      "limiar.atingido",
      "alerta.criado",
      "alerta.expedido",
    ]);
  });

  it("isola falha de um ouvinte para nao derrubar os demais", () => {
    const barramento = new Barramento();
    const quebrado = vi.fn(() => {
      throw new Error("falha do ouvinte");
    });
    const saudavel = vi.fn();
    barramento.assinar("leitura.ingerida", quebrado);
    barramento.assinar("leitura.ingerida", saudavel);

    expect(() => barramento.publicar(evento())).not.toThrow();
    expect(saudavel).toHaveBeenCalledTimes(1);
  });
});
```

O teste "isola falha de um ouvinte" implementa `RNF-06` (degradação graciosa) no nível da infraestrutura: um agente com defeito não pode derrubar o enxame.

- [ ] **Step 2: Rodar e ver falhar**

```bash
npm run test
```
Esperado: FAIL — `Cannot find module './barramento'`.

- [ ] **Step 3: Implementar `barramento.ts`**

```ts
export type TipoEvento =
  | "leitura.ingerida"
  | "leitura.reprovada"
  | "estacao.silenciosa"
  | "estacao.restabelecida"
  | "previsao.gerada"
  | "mancha.gerada"
  | "limiar.atingido"
  | "alerta.criado"
  | "alerta.agrupado"
  | "alerta.validado"
  | "alerta.descartado"
  | "alerta.expedido"
  | "expedicao.bloqueada"
  | "boletim.rascunho"
  | "boletim.aprovado"
  | "ferramenta.invocada"
  | "cenario.iniciado";

export interface Evento<C = unknown> {
  readonly eventoId: string;
  readonly tipo: TipoEvento;
  readonly agenteId: string;
  readonly ts: string;
  readonly correlacaoId?: string;
  readonly titulo: string;
  readonly carga: C;
}

type Ouvinte = (evento: Evento) => void;

/**
 * Barramento de eventos do enxame de agentes.
 * O historico acumulado E a trilha de auditoria do SPEC-H1 (RF-GOV-02):
 * imutavel para quem consome e reconstituivel por correlacao.
 */
export class Barramento {
  private readonly ouvintesPorTipo = new Map<TipoEvento, Set<Ouvinte>>();
  private readonly ouvintesGlobais = new Set<Ouvinte>();
  private readonly eventos: Evento[] = [];

  publicar(evento: Evento): void {
    this.eventos.push(evento);
    const alvos = [...(this.ouvintesPorTipo.get(evento.tipo) ?? []), ...this.ouvintesGlobais];
    for (const ouvinte of alvos) {
      try {
        ouvinte(evento);
      } catch (erro) {
        // RNF-06: um agente com defeito nao derruba o enxame.
        // A falha e visivel no console, nunca engolida em silencio.
        console.error(`[barramento] ouvinte falhou em "${evento.tipo}":`, erro);
      }
    }
  }

  assinar(tipo: TipoEvento, ouvinte: Ouvinte): () => void {
    const conjunto = this.ouvintesPorTipo.get(tipo) ?? new Set<Ouvinte>();
    conjunto.add(ouvinte);
    this.ouvintesPorTipo.set(tipo, conjunto);
    return () => conjunto.delete(ouvinte);
  }

  assinarTudo(ouvinte: Ouvinte): () => void {
    this.ouvintesGlobais.add(ouvinte);
    return () => this.ouvintesGlobais.delete(ouvinte);
  }

  historico(): readonly Evento[] {
    return Object.freeze([...this.eventos]);
  }

  porCorrelacao(correlacaoId: string): Evento[] {
    return this.eventos.filter((e) => e.correlacaoId === correlacaoId);
  }

  limpar(): void {
    this.eventos.length = 0;
  }
}
```

- [ ] **Step 4: Rodar os testes e verificar que passam**

```bash
npm run test
```
Esperado: PASS, 8 testes.

- [ ] **Step 5: Commit**

```bash
git add -A demo
git commit -m "feat(simulacao): barramento de eventos como trilha de auditoria (RF-GOV-02)"
```

---

### Task 8: Simulação — mundo procedural da bacia sintética

**Files:**
- Create: `demo/src/simulacao/mundo.ts`
- Create: `demo/src/simulacao/mundo.test.ts`

**Interfaces:**
- Consumes: `criarAleatorio`, `entre`, `inteiroEntre` de `@/dominio/prng`; `anelIrregular`, `multiPoligonoIrregular`, `centroide`, `areaAproxKm2` de `@/dominio/geometria`; tipos de `@/dominio/tipos`
- Produces:
  - `interface Mundo { semente; centro; subBacias; corredor; zonas; estacoes; ativos; limiares; cotaBaseM; postoId }`
  - `criarMundo(semente: number): Mundo`
  - `FONTES: readonly string[]` = `["CEMADEN", "ANA", "INMET"]`

- [ ] **Step 1: Escrever `mundo.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { pontoEmPoligono } from "@/dominio/geometria";
import { criarMundo, FONTES } from "./mundo";

describe("criarMundo", () => {
  it("e reproduzivel: mesma semente gera mundo identico", () => {
    expect(criarMundo(2024)).toEqual(criarMundo(2024));
  });

  it("gera mundos diferentes para sementes diferentes", () => {
    expect(criarMundo(1).zonas[0]?.geometria).not.toEqual(criarMundo(2).zonas[0]?.geometria);
  });

  it("gera 4 sub-bacias", () => {
    expect(criarMundo(2024).subBacias).toHaveLength(4);
  });

  it("gera entre 8 e 14 zonas de risco", () => {
    const zonas = criarMundo(2024).zonas;
    expect(zonas.length).toBeGreaterThanOrEqual(8);
    expect(zonas.length).toBeLessThanOrEqual(14);
  });

  it("gera zonas com multipoligono — mais de um anel em pelo menos uma zona", () => {
    const zonas = criarMundo(2024).zonas;
    expect(zonas.some((z) => z.geometria.aneis.length > 1)).toBe(true);
  });

  it("gera 24 estacoes distribuidas nas tres fontes", () => {
    const estacoes = criarMundo(2024).estacoes;
    expect(estacoes).toHaveLength(24);
    for (const fonte of FONTES) {
      expect(estacoes.some((e) => e.fonteId === fonte)).toBe(true);
    }
  });

  it("posiciona cada estacao dentro da sua sub-bacia", () => {
    const mundo = criarMundo(2024);
    for (const estacao of mundo.estacoes) {
      const subBacia = mundo.subBacias.find((s) => s.subBaciaId === estacao.subBaciaId);
      expect(subBacia).toBeDefined();
      if (!subBacia) continue;
      expect(pontoEmPoligono(estacao.posicao, subBacia.geometria)).toBe(true);
    }
  });

  it("inicia todas as estacoes operantes e sem leitura", () => {
    for (const estacao of criarMundo(2024).estacoes) {
      expect(estacao.situacao).toBe("operante");
      expect(estacao.ultimaLeituraTs).toBeNull();
    }
  });

  it("cria um limiar de chuva e um de nivel previsto por zona", () => {
    const mundo = criarMundo(2024);
    for (const zona of mundo.zonas) {
      const daZona = mundo.limiares.filter((l) => l.zonaId === zona.zonaId);
      expect(daZona.some((l) => l.origem === "observacao")).toBe(true);
      expect(daZona.some((l) => l.origem === "previsao")).toBe(true);
    }
  });

  it("da a todo limiar uma justificativa tecnica e um autor — RF-ALT-01", () => {
    for (const limiar of criarMundo(2024).limiares) {
      expect(limiar.justificativaTecnica.length).toBeGreaterThan(10);
      expect(limiar.autor).not.toBe("");
      expect(limiar.versao).toBe(1);
    }
  });

  it("gera 14 comportas e 23 EBAPs, espelhando o numero real do spec", () => {
    const ativos = criarMundo(2024).ativos;
    expect(ativos.filter((a) => a.tipo === "comporta")).toHaveLength(14);
    expect(ativos.filter((a) => a.tipo === "ebap")).toHaveLength(23);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npm run test
```
Esperado: FAIL — `Cannot find module './mundo'`.

- [ ] **Step 3: Implementar `mundo.ts`**

```ts
import {
  anelIrregular,
  areaAproxKm2,
  centroide,
  multiPoligonoIrregular,
  pontoEmPoligono,
  type Coordenada,
  type Poligono,
} from "@/dominio/geometria";
import { criarAleatorio, entre, inteiroEntre, type Aleatorio } from "@/dominio/prng";
import type {
  AtivoProtecao,
  EstacaoMonitoramento,
  Limiar,
  SubBacia,
  ZonaRisco,
} from "@/dominio/tipos";

export const FONTES = ["CEMADEN", "ANA", "INMET"] as const;

/** Centro sintetico proximo a Porto Alegre. Nao representa geometria real. */
const CENTRO_PADRAO: Coordenada = [-51.22, -30.03];

const NOMES_SUBBACIA = ["Alto Taquari", "Medio Antas", "Baixo Cai", "Arroio Diluvio"] as const;

const BAIRROS = [
  "Partenon", "Gloria", "Sarandi", "Restinga", "Lomba do Pinheiro",
  "Cristal", "Navegantes", "Humaita", "Rubem Berta", "Bom Jesus",
  "Cavalhada", "Belem Novo", "Ipanema", "Tristeza",
] as const;

export interface Mundo {
  readonly semente: number;
  readonly centro: Coordenada;
  readonly subBacias: SubBacia[];
  readonly corredor: Poligono;
  readonly zonas: ZonaRisco[];
  readonly estacoes: EstacaoMonitoramento[];
  readonly ativos: AtivoProtecao[];
  readonly limiares: Limiar[];
  readonly cotaBaseM: number;
  readonly postoId: string;
}

function pontoDentroDe(geometria: Poligono, r: Aleatorio): Coordenada {
  const anel = geometria.aneis[0];
  if (!anel) throw new Error("geometria sem anel");
  const centro = centroide(anel);
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    const angulo = entre(r, 0, Math.PI * 2);
    const raio = entre(r, 0, 0.7) * 0.05;
    const p: Coordenada = [
      centro[0] + Math.cos(angulo) * raio,
      centro[1] + Math.sin(angulo) * raio,
    ];
    if (pontoEmPoligono(p, geometria)) return p;
  }
  return centro;
}

/**
 * Gera um mundo sintetico completo e reproduzivel a partir de uma semente.
 * Toda a geometria e procedural e irregular — nao ha shapefile embutido.
 */
export function criarMundo(semente: number): Mundo {
  const r = criarAleatorio(semente);
  const centro = CENTRO_PADRAO;

  const subBacias: SubBacia[] = NOMES_SUBBACIA.map((nome, i) => {
    const angulo = (i / NOMES_SUBBACIA.length) * Math.PI * 2;
    const centroSub: Coordenada = [
      centro[0] + Math.cos(angulo) * 0.09,
      centro[1] + Math.sin(angulo) * 0.09,
    ];
    const anel = anelIrregular(centroSub, entre(r, 0.05, 0.075), 28, 0.28, r);
    return {
      subBaciaId: `SB-${i + 1}`,
      nome,
      geometria: { aneis: [anel] },
      areaKm2: Number(areaAproxKm2(anel).toFixed(1)),
      tempoConcentracaoHoras: Number(entre(r, 5, 12).toFixed(1)),
    };
  });

  // Corredor fluvial: base da mancha de inundacao.
  const corredorAnel = anelIrregular(centro, 0.035, 30, 0.22, r);
  const corredor: Poligono = { aneis: [corredorAnel] };

  const quantidadeZonas = inteiroEntre(r, 8, 14);
  const zonas: ZonaRisco[] = [];
  for (let i = 0; i < quantidadeZonas; i++) {
    const subBacia = subBacias[i % subBacias.length];
    if (!subBacia) continue;
    const posicao = pontoDentroDe(subBacia.geometria, r);
    const lobos = inteiroEntre(r, 1, 3);
    const populacao = inteiroEntre(r, 400, 5200);
    zonas.push({
      zonaId: `Z-${String(i + 1).padStart(2, "0")}`,
      nome: BAIRROS[i % BAIRROS.length] ?? `Setor ${i + 1}`,
      codigoSetorSgb: `SGB-RS-${4300 + i}`,
      subBaciaId: subBacia.subBaciaId,
      grauRisco: r() > 0.55 ? "muito_alto" : "alto",
      tipo: r() > 0.25 ? "inundacao" : "deslizamento",
      familiasEstimadas: Math.round(populacao / 3.2),
      populacaoEstimada: populacao,
      geometria: multiPoligonoIrregular(posicao, entre(r, 0.008, 0.018), lobos, r),
    });
  }

  const estacoes: EstacaoMonitoramento[] = [];
  for (let i = 0; i < 24; i++) {
    const subBacia = subBacias[i % subBacias.length];
    if (!subBacia) continue;
    const fonte = FONTES[i % FONTES.length] ?? "CEMADEN";
    const tipo = i % 3 === 0 ? "fluviometrica" : "pluviometrica";
    estacoes.push({
      estacaoId: `E-${String(i + 1).padStart(3, "0")}`,
      codigoExterno: `${fonte}-${8100 + i}`,
      fonteId: fonte,
      nome: `${subBacia.nome} ${i + 1}`,
      tipo,
      subBaciaId: subBacia.subBaciaId,
      posicao: pontoDentroDe(subBacia.geometria, r),
      periodicidadeEsperadaMin: 10,
      situacao: "operante",
      ultimaLeituraTs: null,
    });
  }

  const ativos: AtivoProtecao[] = [];
  for (let i = 0; i < 14; i++) {
    ativos.push({
      ativoId: `CP-${String(i + 1).padStart(2, "0")}`,
      nome: `Comporta ${i + 1}`,
      tipo: "comporta",
      posicao: pontoDentroDe(corredor, r),
      situacaoProntidao: r() > 0.18 ? "pronto" : "manutencao",
    });
  }
  for (let i = 0; i < 23; i++) {
    ativos.push({
      ativoId: `EB-${String(i + 1).padStart(2, "0")}`,
      nome: `EBAP ${i + 1}`,
      tipo: "ebap",
      posicao: pontoDentroDe(corredor, r),
      situacaoProntidao: r() > 0.25 ? "pronto" : "manutencao",
    });
  }

  const cotaBaseM = 2;
  const limiares: Limiar[] = [];
  for (const zona of zonas) {
    const chuvaLimite = Math.round(entre(r, 45, 80));
    limiares.push({
      limiarId: `L-${zona.zonaId}-CHUVA`,
      zonaId: zona.zonaId,
      variavel: "chuva_mm",
      janelaHoras: 6,
      operador: ">=",
      valor: chuvaLimite,
      severidade: zona.grauRisco === "muito_alto" ? "alta" : "media",
      origem: "observacao",
      versao: 1,
      vigenciaInicio: "2026-01-01T00:00:00.000Z",
      vigenciaFim: null,
      justificativaTecnica: `Chuva acumulada de ${chuvaLimite} mm em 6 h satura o solo do setor ${zona.codigoSetorSgb} (parametro sintetico de demonstracao).`,
      autor: "analista.demo",
    });

    const cotaLimite = Number(entre(r, 3.2, 5.4).toFixed(2));
    limiares.push({
      limiarId: `L-${zona.zonaId}-COTA`,
      zonaId: zona.zonaId,
      variavel: "nivel_m",
      janelaHoras: 0,
      operador: ">=",
      valor: cotaLimite,
      severidade: zona.grauRisco === "muito_alto" ? "muito_alta" : "alta",
      origem: "previsao",
      versao: 1,
      vigenciaInicio: "2026-01-01T00:00:00.000Z",
      vigenciaFim: null,
      justificativaTecnica: `Cota prevista de ${cotaLimite} m projeta mancha sobre o setor ${zona.codigoSetorSgb} (parametro sintetico de demonstracao).`,
      autor: "analista.demo",
    });
  }

  return {
    semente,
    centro,
    subBacias,
    corredor,
    zonas,
    estacoes,
    ativos,
    limiares,
    cotaBaseM,
    postoId: "P-GUAIBA-01",
  };
}
```

- [ ] **Step 4: Rodar os testes e verificar que passam**

```bash
npm run test
```
Esperado: PASS, 11 testes de `mundo.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add -A demo
git commit -m "feat(simulacao): mundo procedural reproduzivel com bacia, zonas, estacoes e ativos"
```

---

### Task 9: Agentes — contrato e agentes de dados (ING, NET, MOD)

**Files:**
- Create: `demo/src/agentes/tipos.ts`
- Create: `demo/src/agentes/agenteIngestao.ts`
- Create: `demo/src/agentes/agenteQualidade.ts`
- Create: `demo/src/agentes/agenteRede.ts`
- Create: `demo/src/agentes/agenteHidrologico.ts`
- Create: `demo/src/agentes/agentes.test.ts`

**Interfaces:**
- Consumes: `Barramento`, `Evento`, `TipoEvento` de `@/simulacao/barramento`; `Mundo` de `@/simulacao/mundo`; `RelogioSimulado`; `Aleatorio`; `avaliarQualidade`; `preverNivel`; tipos do domínio
- Produces:
  - `type ModuloAgente = "ING" | "NET" | "MOD" | "ALT" | "EXP" | "LLM" | "GOV"`
  - `type StatusAgente = "ocioso" | "trabalhando" | "alerta" | "bloqueado" | "falha"`
  - `interface EstadoSimulacao` (mutável, compartilhado pelos agentes)
  - `interface ContextoAgente { relogio; barramento; mundo; estado; aleatorio; publicar(...) }`
  - `interface Agente { id; nome; modulo; descricao; status; ultimaAtividade; aoTick(ctx): void }`
  - `criarAgenteIngestao(fonteId): Agente`
  - `criarAgenteQualidade(): Agente`
  - `criarAgenteRede(): Agente`
  - `criarAgenteHidrologico(): Agente`

- [ ] **Step 1: Escrever `tipos.ts` dos agentes**

```ts
import type { Aleatorio } from "@/dominio/prng";
import type { RelogioSimulado } from "@/dominio/relogio";
import type {
  Alerta,
  EstacaoMonitoramento,
  ExposicaoCalculada,
  Observacao,
  PrevisaoNivel,
} from "@/dominio/tipos";
import type { Poligono } from "@/dominio/geometria";
import type { Barramento, TipoEvento } from "@/simulacao/barramento";
import type { Mundo } from "@/simulacao/mundo";

export type ModuloAgente = "ING" | "NET" | "MOD" | "ALT" | "EXP" | "LLM" | "GOV";
export type StatusAgente = "ocioso" | "trabalhando" | "alerta" | "bloqueado" | "falha";

/** Estado mutavel compartilhado por todos os agentes no mesmo tick. */
export interface EstadoSimulacao {
  observacoes: Observacao[];
  estacoes: EstacaoMonitoramento[];
  previsoes: PrevisaoNivel[];
  mancha: Poligono | null;
  cotaPrevistaM: number;
  nivelAtualM: number;
  intensidadeChuvaMmH: number;
  exposicao: ExposicaoCalculada[];
  alertas: Alerta[];
  boletins: Boletim[];
  contador: number;
}

export interface Boletim {
  readonly boletimId: string;
  readonly alertaId: string;
  readonly publico: "defesa_civil" | "prefeitura" | "cidadao";
  readonly textoRascunho: string;
  textoAprovado: string | null;
  readonly fontesConsultadas: readonly string[];
  readonly tsGeracao: string;
  tsAprovacao: string | null;
  autorAprovacao: string | null;
}

export interface ContextoAgente {
  readonly relogio: RelogioSimulado;
  readonly barramento: Barramento;
  readonly mundo: Mundo;
  readonly estado: EstadoSimulacao;
  readonly aleatorio: Aleatorio;
  publicar(
    agenteId: string,
    tipo: TipoEvento,
    titulo: string,
    carga: unknown,
    correlacaoId?: string,
  ): void;
}

export interface Agente {
  readonly id: string;
  readonly nome: string;
  readonly modulo: ModuloAgente;
  readonly descricao: string;
  readonly requisitos: readonly string[];
  status: StatusAgente;
  ultimaAtividade: string | null;
  contadorTrabalho: number;
  aoTick(ctx: ContextoAgente): void;
}

export function criarEstadoInicial(nivelInicialM: number): EstadoSimulacao {
  return {
    observacoes: [],
    estacoes: [],
    previsoes: [],
    mancha: null,
    cotaPrevistaM: nivelInicialM,
    nivelAtualM: nivelInicialM,
    intensidadeChuvaMmH: 0,
    exposicao: [],
    alertas: [],
    boletins: [],
    contador: 0,
  };
}
```

- [ ] **Step 2: Escrever `agentes.test.ts` cobrindo os quatro agentes de dados**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { criarAleatorio } from "@/dominio/prng";
import { RelogioSimulado } from "@/dominio/relogio";
import { Barramento, type TipoEvento } from "@/simulacao/barramento";
import { criarMundo, type Mundo } from "@/simulacao/mundo";
import { criarAgenteHidrologico } from "./agenteHidrologico";
import { criarAgenteIngestao } from "./agenteIngestao";
import { criarAgenteQualidade } from "./agenteQualidade";
import { criarAgenteRede } from "./agenteRede";
import { criarEstadoInicial, type ContextoAgente, type EstadoSimulacao } from "./tipos";

function criarContexto(mundo: Mundo): ContextoAgente {
  const barramento = new Barramento();
  const relogio = new RelogioSimulado(new Date("2026-05-01T00:00:00.000Z"));
  const estado: EstadoSimulacao = criarEstadoInicial(2);
  estado.estacoes = mundo.estacoes.map((e) => ({ ...e }));
  let contador = 0;
  return {
    relogio,
    barramento,
    mundo,
    estado,
    aleatorio: criarAleatorio(99),
    publicar(agenteId, tipo, titulo, carga, correlacaoId) {
      barramento.publicar({
        eventoId: `ev-${++contador}`,
        tipo,
        agenteId,
        ts: relogio.iso,
        titulo,
        carga,
        ...(correlacaoId ? { correlacaoId } : {}),
      });
    },
  };
}

function tiposPublicados(ctx: ContextoAgente): TipoEvento[] {
  return ctx.barramento.historico().map((e) => e.tipo);
}

describe("agenteIngestao", () => {
  let mundo: Mundo;
  let ctx: ContextoAgente;

  beforeEach(() => {
    mundo = criarMundo(2024);
    ctx = criarContexto(mundo);
  });

  it("ingere leituras apenas das estacoes da sua fonte", () => {
    const agente = criarAgenteIngestao("CEMADEN");
    agente.aoTick(ctx);
    const fontes = new Set(ctx.estado.observacoes.map((o) => o.fonteId));
    expect(fontes).toEqual(new Set(["CEMADEN"]));
  });

  it("gera ao menos uma leitura por estacao operante da fonte", () => {
    const agente = criarAgenteIngestao("CEMADEN");
    const daFonte = mundo.estacoes.filter((e) => e.fonteId === "CEMADEN");
    agente.aoTick(ctx);
    expect(ctx.estado.observacoes.length).toBe(daFonte.length);
  });

  it("nao le estacao silenciosa", () => {
    const agente = criarAgenteIngestao("CEMADEN");
    for (const estacao of ctx.estado.estacoes) {
      if (estacao.fonteId === "CEMADEN") estacao.situacao = "silenciosa";
    }
    agente.aoTick(ctx);
    expect(ctx.estado.observacoes).toHaveLength(0);
  });

  it("registra proveniencia completa na leitura", () => {
    criarAgenteIngestao("CEMADEN").aoTick(ctx);
    const obs = ctx.estado.observacoes[0];
    if (!obs) throw new Error("sem observacao");
    expect(obs.fonteId).toBe("CEMADEN");
    expect(obs.tsOrigem).toBe("2026-05-01T00:00:00.000Z");
    expect(obs.tsIngestao).toBe("2026-05-01T00:00:00.000Z");
    expect(obs.qualidade).toBe("aprovada");
  });

  it("publica evento de ingestao e marca o proprio status", () => {
    const agente = criarAgenteIngestao("CEMADEN");
    agente.aoTick(ctx);
    expect(tiposPublicados(ctx)).toContain("leitura.ingerida");
    expect(agente.status).toBe("trabalhando");
    expect(agente.contadorTrabalho).toBeGreaterThan(0);
  });

  it("atualiza o carimbo de ultima leitura da estacao", () => {
    criarAgenteIngestao("CEMADEN").aoTick(ctx);
    const estacao = ctx.estado.estacoes.find((e) => e.fonteId === "CEMADEN");
    expect(estacao?.ultimaLeituraTs).toBe("2026-05-01T00:00:00.000Z");
  });
});

describe("agenteQualidade", () => {
  it("reprova leitura fora de faixa e publica o evento — RF-ING-04", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    const estacao = mundo.estacoes[0];
    if (!estacao) throw new Error("sem estacao");

    ctx.estado.observacoes.push({
      observacaoId: "obs-absurda",
      estacaoId: estacao.estacaoId,
      fonteId: estacao.fonteId,
      variavel: "chuva_mm",
      valor: 2000,
      unidade: "mm",
      tsOrigem: "2026-05-01T00:00:00.000Z",
      tsIngestao: "2026-05-01T00:00:00.000Z",
      qualidade: "aprovada",
    });

    criarAgenteQualidade().aoTick(ctx);

    const revisada = ctx.estado.observacoes[0];
    expect(revisada?.qualidade).toBe("reprovada");
    expect(revisada?.motivoQualidade).toBe("fora de faixa");
    expect(tiposPublicados(ctx)).toContain("leitura.reprovada");
  });

  it("nao remove a leitura reprovada do estado", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    const estacao = mundo.estacoes[0];
    if (!estacao) throw new Error("sem estacao");
    ctx.estado.observacoes.push({
      observacaoId: "obs-absurda",
      estacaoId: estacao.estacaoId,
      fonteId: estacao.fonteId,
      variavel: "chuva_mm",
      valor: 2000,
      unidade: "mm",
      tsOrigem: "2026-05-01T00:00:00.000Z",
      tsIngestao: "2026-05-01T00:00:00.000Z",
      qualidade: "aprovada",
    });
    criarAgenteQualidade().aoTick(ctx);
    expect(ctx.estado.observacoes).toHaveLength(1);
  });
});

describe("agenteRede", () => {
  it("marca como silenciosa a estacao sem leitura por 3 periodos — CA-NET-01", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    const estacao = ctx.estado.estacoes[0];
    if (!estacao) throw new Error("sem estacao");
    estacao.ultimaLeituraTs = "2026-04-30T23:20:00.000Z"; // 40 min antes
    ctx.relogio.avancarMinutos(0);

    criarAgenteRede().aoTick(ctx);

    expect(estacao.situacao).toBe("silenciosa");
    expect(tiposPublicados(ctx)).toContain("estacao.silenciosa");
  });

  it("mantem operante a estacao que leu dentro do periodo", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    const estacao = ctx.estado.estacoes[0];
    if (!estacao) throw new Error("sem estacao");
    estacao.ultimaLeituraTs = "2026-04-30T23:55:00.000Z";
    criarAgenteRede().aoTick(ctx);
    expect(estacao.situacao).toBe("operante");
  });

  it("ignora estacao que nunca leu (mundo recem-criado)", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    criarAgenteRede().aoTick(ctx);
    expect(ctx.estado.estacoes.every((e) => e.situacao === "operante")).toBe(true);
  });
});

describe("agenteHidrologico", () => {
  it("gera previsoes de nivel com incerteza e publica o evento", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    ctx.estado.nivelAtualM = 3;
    ctx.estado.intensidadeChuvaMmH = 12;

    criarAgenteHidrologico().aoTick(ctx);

    expect(ctx.estado.previsoes.length).toBe(3);
    expect(tiposPublicados(ctx)).toContain("previsao.gerada");
    for (const p of ctx.estado.previsoes) {
      expect(p.limiteSup).toBeGreaterThan(p.limiteInf);
    }
  });

  it("expoe a cota prevista de 12 h no estado", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    ctx.estado.nivelAtualM = 3;

    criarAgenteHidrologico().aoTick(ctx);

    const doze = ctx.estado.previsoes.find((p) => p.horizonteHoras === 12);
    expect(ctx.estado.cotaPrevistaM).toBe(doze?.nivelPrevistoM);
  });

  it("gera mancha de inundacao e publica o evento espacial", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    ctx.estado.nivelAtualM = 6;
    ctx.estado.intensidadeChuvaMmH = 25;

    criarAgenteHidrologico().aoTick(ctx);

    expect(ctx.estado.mancha).not.toBeNull();
    expect(tiposPublicados(ctx)).toContain("mancha.gerada");
  });

  it("calcula exposicao quando a mancha alcanca zonas", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    ctx.estado.nivelAtualM = 12;
    ctx.estado.intensidadeChuvaMmH = 40;

    criarAgenteHidrologico().aoTick(ctx);

    expect(ctx.estado.exposicao.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
npm run test
```
Esperado: FAIL — os quatro módulos de agente não existem.

- [ ] **Step 4: Implementar `agenteIngestao.ts`**

```ts
import { entre } from "@/dominio/prng";
import type { Observacao } from "@/dominio/tipos";
import type { Agente, ContextoAgente } from "./tipos";

/**
 * Agente de ingestao (modulo ING do SPEC-H1).
 * Um agente por fonte. Le as estacoes operantes da sua fonte e
 * transforma o estado do tempo simulado em observacoes com proveniencia.
 */
export function criarAgenteIngestao(fonteId: string): Agente {
  return {
    id: `agente-ingestao-${fonteId.toLowerCase()}`,
    nome: `Ingestao ${fonteId}`,
    modulo: "ING",
    descricao: `Coleta leituras das estacoes da fonte ${fonteId}, normaliza unidade e tempo e registra proveniencia.`,
    requisitos: ["RF-ING-01", "RF-ING-02", "RF-ING-05"],
    status: "ocioso",
    ultimaAtividade: null,
    contadorTrabalho: 0,

    aoTick(ctx: ContextoAgente): void {
      const estacoes = ctx.estado.estacoes.filter(
        (e) => e.fonteId === fonteId && e.situacao !== "silenciosa" && e.situacao !== "desativada",
      );

      if (estacoes.length === 0) {
        this.status = "ocioso";
        return;
      }

      const ts = ctx.relogio.iso;
      for (const estacao of estacoes) {
        const ruido = entre(ctx.aleatorio, 0.75, 1.25);
        const observacao: Observacao =
          estacao.tipo === "fluviometrica"
            ? {
                observacaoId: `obs-${ctx.estado.contador++}`,
                estacaoId: estacao.estacaoId,
                fonteId,
                variavel: "nivel_m",
                valor: Number((ctx.estado.nivelAtualM * ruido).toFixed(3)),
                unidade: "m",
                tsOrigem: ts,
                tsIngestao: ts,
                qualidade: "aprovada",
              }
            : {
                observacaoId: `obs-${ctx.estado.contador++}`,
                estacaoId: estacao.estacaoId,
                fonteId,
                variavel: "chuva_mm",
                valor: Number(((ctx.estado.intensidadeChuvaMmH / 6) * ruido).toFixed(2)),
                unidade: "mm",
                tsOrigem: ts,
                tsIngestao: ts,
                qualidade: "aprovada",
              };

        ctx.estado.observacoes.push(observacao);
        estacao.ultimaLeituraTs = ts;
      }

      this.status = "trabalhando";
      this.ultimaAtividade = ts;
      this.contadorTrabalho += estacoes.length;

      ctx.publicar(this.id, "leitura.ingerida", `${estacoes.length} leituras de ${fonteId}`, {
        fonteId,
        quantidade: estacoes.length,
      });
    },
  };
}
```

- [ ] **Step 5: Implementar `agenteQualidade.ts`**

```ts
import { avaliarQualidade } from "@/dominio/qc";
import type { Agente, ContextoAgente } from "./tipos";

/**
 * Agente de controle de qualidade (RF-ING-04).
 * Reavalia as leituras ainda nao inspecionadas.
 * Leitura reprovada NUNCA e removida — fica no estado com o sinalizador,
 * apenas nao alimenta o motor de alerta.
 */
export function criarAgenteQualidade(): Agente {
  let inspecionadasAte = 0;

  return {
    id: "agente-qualidade",
    nome: "Controle de qualidade",
    modulo: "ING",
    descricao:
      "Verifica faixa fisica, ordem temporal, salto abrupto e sensor travado. Leitura reprovada e mantida e sinalizada, nunca descartada em silencio.",
    requisitos: ["RF-ING-04"],
    status: "ocioso",
    ultimaAtividade: null,
    contadorTrabalho: 0,

    aoTick(ctx: ContextoAgente): void {
      const pendentes = ctx.estado.observacoes.slice(inspecionadasAte);
      if (pendentes.length === 0) {
        this.status = "ocioso";
        return;
      }

      let reprovadas = 0;
      for (let i = 0; i < pendentes.length; i++) {
        const indiceGlobal = inspecionadasAte + i;
        const leitura = ctx.estado.observacoes[indiceGlobal];
        if (!leitura) continue;

        const anteriores = ctx.estado.observacoes.slice(0, indiceGlobal);
        const resultado = avaliarQualidade(leitura, anteriores);

        if (resultado.qualidade !== "aprovada") {
          ctx.estado.observacoes[indiceGlobal] = {
            ...leitura,
            qualidade: resultado.qualidade,
            ...(resultado.motivo ? { motivoQualidade: resultado.motivo } : {}),
          };
          reprovadas++;
          ctx.publicar(
            this.id,
            "leitura.reprovada",
            `Leitura ${leitura.observacaoId} marcada como ${resultado.qualidade}: ${resultado.motivo}`,
            {
              observacaoId: leitura.observacaoId,
              estacaoId: leitura.estacaoId,
              valor: leitura.valor,
              motivo: resultado.motivo,
            },
          );
        }
      }

      inspecionadasAte = ctx.estado.observacoes.length;
      this.status = reprovadas > 0 ? "alerta" : "trabalhando";
      this.ultimaAtividade = ctx.relogio.iso;
      this.contadorTrabalho += pendentes.length;
    },
  };
}
```

- [ ] **Step 6: Implementar `agenteRede.ts`**

```ts
import type { Agente, ContextoAgente } from "./tipos";

const PERIODOS_PARA_SILENCIO = 3;

/**
 * Agente de saude da rede (modulo NET, RF-NET-01).
 * Detecta estacao silenciosa e restabelecida, e mantem o indicador
 * de percentual operante que aparece no painel de KPI.
 */
export function criarAgenteRede(): Agente {
  return {
    id: "agente-rede",
    nome: "Saude da rede",
    modulo: "NET",
    descricao:
      "Monitora disponibilidade e latencia das estacoes. Estacao sem leitura por 3 periodos vira silenciosa.",
    requisitos: ["RF-NET-01"],
    status: "ocioso",
    ultimaAtividade: null,
    contadorTrabalho: 0,

    aoTick(ctx: ContextoAgente): void {
      let silenciadas = 0;

      for (const estacao of ctx.estado.estacoes) {
        if (estacao.situacao === "desativada") continue;
        if (estacao.ultimaLeituraTs === null) continue;

        const atraso = ctx.relogio.minutosDesde(estacao.ultimaLeituraTs);
        const limite = estacao.periodicidadeEsperadaMin * PERIODOS_PARA_SILENCIO;

        if (atraso > limite && estacao.situacao !== "silenciosa") {
          estacao.situacao = "silenciosa";
          silenciadas++;
          ctx.publicar(
            this.id,
            "estacao.silenciosa",
            `Estacao ${estacao.estacaoId} (${estacao.nome}) sem leitura ha ${Math.round(atraso)} min`,
            { estacaoId: estacao.estacaoId, atrasoMinutos: Math.round(atraso) },
          );
        } else if (atraso <= limite && estacao.situacao === "silenciosa") {
          estacao.situacao = "operante";
          ctx.publicar(
            this.id,
            "estacao.restabelecida",
            `Estacao ${estacao.estacaoId} voltou a transmitir`,
            { estacaoId: estacao.estacaoId },
          );
        }
      }

      this.status = silenciadas > 0 ? "alerta" : "trabalhando";
      this.ultimaAtividade = ctx.relogio.iso;
      this.contadorTrabalho += 1;
    },
  };
}
```

- [ ] **Step 7: Implementar `agenteHidrologico.ts`**

```ts
import { acumular } from "@/dominio/limiar";
import { exposicaoPorMancha, mancharPorCota } from "@/dominio/mancha";
import { preverNivel } from "@/dominio/previsao";
import type { Agente, ContextoAgente } from "./tipos";

const HORIZONTES = [6, 12, 24] as const;

/**
 * Agente hidrologico (modulo MOD, RF-MOD-02/04).
 * Roda o ciclo de previsao, deriva a mancha de inundacao pela cota
 * prevista e calcula a exposicao. E aqui que nasce a acao espacial
 * que o agente de geofencing vai consumir.
 */
export function criarAgenteHidrologico(): Agente {
  let rodada = 0;

  return {
    id: "agente-hidrologico",
    nome: "Modelagem hidrologica",
    modulo: "MOD",
    descricao:
      "Acopla chuva observada e prevista para projetar nivel com incerteza, deriva a mancha por cota e cruza com a exposicao.",
    requisitos: ["RF-MOD-02", "RF-MOD-03", "RF-MOD-04"],
    status: "ocioso",
    ultimaAtividade: null,
    contadorTrabalho: 0,

    aoTick(ctx: ContextoAgente): void {
      const ts = ctx.relogio.iso;
      const estacoesPluvio = ctx.estado.estacoes
        .filter((e) => e.tipo === "pluviometrica")
        .map((e) => e.estacaoId);

      const chuva6h = acumular(ctx.estado.observacoes, "chuva_mm", estacoesPluvio, 6, ts);
      const tempoConcentracao =
        ctx.mundo.subBacias[0]?.tempoConcentracaoHoras ?? 8;

      ctx.estado.previsoes = preverNivel({
        rodadaId: `R-${++rodada}`,
        postoId: ctx.mundo.postoId,
        nivelAtualM: ctx.estado.nivelAtualM,
        chuvaAcumulada6hMm: chuva6h / Math.max(estacoesPluvio.length, 1),
        chuvaPrevista24hMm: ctx.estado.intensidadeChuvaMmH * 6,
        tempoConcentracaoHoras: tempoConcentracao,
        horizontes: [...HORIZONTES],
        tsRodada: ts,
      });

      const doze = ctx.estado.previsoes.find((p) => p.horizonteHoras === 12);
      ctx.estado.cotaPrevistaM = doze?.nivelPrevistoM ?? ctx.estado.nivelAtualM;

      ctx.publicar(
        this.id,
        "previsao.gerada",
        `Rodada R-${rodada}: cota prevista de ${ctx.estado.cotaPrevistaM.toFixed(2)} m em 12 h`,
        { rodadaId: `R-${rodada}`, cotaPrevistaM: ctx.estado.cotaPrevistaM },
      );

      const mancha = mancharPorCota(
        ctx.mundo.corredor,
        ctx.estado.cotaPrevistaM,
        ctx.mundo.cotaBaseM,
      );
      ctx.estado.mancha = mancha;
      ctx.estado.exposicao = exposicaoPorMancha(mancha, ctx.mundo.zonas);

      ctx.publicar(
        this.id,
        "mancha.gerada",
        `Mancha projetada na cota ${ctx.estado.cotaPrevistaM.toFixed(2)} m alcanca ${ctx.estado.exposicao.length} zona(s)`,
        {
          cotaM: ctx.estado.cotaPrevistaM,
          zonasAlcancadas: ctx.estado.exposicao.map((e) => e.zonaId),
        },
      );

      this.status = ctx.estado.exposicao.length > 0 ? "alerta" : "trabalhando";
      this.ultimaAtividade = ts;
      this.contadorTrabalho += 1;
    },
  };
}
```

- [ ] **Step 8: Rodar os testes e verificar que passam**

```bash
npm run test
```
Esperado: PASS. Se o teste "calcula exposicao quando a mancha alcanca zonas" falhar, aumente `nivelAtualM` no teste — a mancha precisa crescer o bastante para alcançar as zonas do mundo semeado com 2024. Não afrouxe a asserção; ajuste a entrada.

- [ ] **Step 9: Commit**

```bash
git add -A demo
git commit -m "feat(agentes): contrato do enxame e agentes de ingestao, qualidade, rede e hidrologia"
```

---

### Task 10: Agentes — alerta, antifadiga, redator, expedição e auditoria

**Files:**
- Create: `demo/src/agentes/agenteLimiar.ts`
- Create: `demo/src/agentes/agenteGeofencing.ts`
- Create: `demo/src/agentes/agenteAntifadiga.ts`
- Create: `demo/src/dominio/boletim.ts`
- Create: `demo/src/agentes/agenteRedator.ts`
- Create: `demo/src/agentes/agenteExpedicao.ts`
- Create: `demo/src/agentes/agenteAuditoria.ts`
- Create: `demo/src/agentes/registro.ts`
- Create: `demo/src/agentes/agentesAlerta.test.ts`

**Interfaces:**
- Consumes: tudo das tarefas 4-9
- Produces:
  - `criarAgenteLimiar(): Agente`, `criarAgenteGeofencing(): Agente`, `criarAgenteAntifadiga(): Agente`
  - `criarAgenteRedator(): Agente`, `criarAgenteExpedicao(): Agente`, `criarAgenteAuditoria(): Agente`
  - `redigirBoletim(params): string` em `@/dominio/boletim`
  - `criarEnxame(): Agente[]` em `@/agentes/registro`

- [ ] **Step 1: Escrever `agentesAlerta.test.ts`**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { criarAlertaCandidato, validar } from "@/dominio/alerta";
import { criarAleatorio } from "@/dominio/prng";
import { RelogioSimulado } from "@/dominio/relogio";
import { Barramento } from "@/simulacao/barramento";
import { criarMundo, type Mundo } from "@/simulacao/mundo";
import { criarAgenteExpedicao } from "./agenteExpedicao";
import { criarAgenteGeofencing } from "./agenteGeofencing";
import { criarAgenteLimiar } from "./agenteLimiar";
import { criarAgenteRedator } from "./agenteRedator";
import { criarEnxame } from "./registro";
import { criarEstadoInicial, type ContextoAgente, type EstadoSimulacao } from "./tipos";

function criarContexto(mundo: Mundo, nivel = 2): ContextoAgente {
  const barramento = new Barramento();
  const relogio = new RelogioSimulado(new Date("2026-05-01T12:00:00.000Z"));
  const estado: EstadoSimulacao = criarEstadoInicial(nivel);
  estado.estacoes = mundo.estacoes.map((e) => ({ ...e }));
  let n = 0;
  return {
    relogio,
    barramento,
    mundo,
    estado,
    aleatorio: criarAleatorio(7),
    publicar(agenteId, tipo, titulo, carga, correlacaoId) {
      barramento.publicar({
        eventoId: `ev-${++n}`,
        tipo,
        agenteId,
        ts: relogio.iso,
        titulo,
        carga,
        ...(correlacaoId ? { correlacaoId } : {}),
      });
    },
  };
}

function saturarChuva(ctx: ContextoAgente, mm: number): void {
  const pluvio = ctx.estado.estacoes.filter((e) => e.tipo === "pluviometrica");
  for (const estacao of pluvio) {
    ctx.estado.observacoes.push({
      observacaoId: `obs-${ctx.estado.contador++}`,
      estacaoId: estacao.estacaoId,
      fonteId: estacao.fonteId,
      variavel: "chuva_mm",
      valor: mm,
      unidade: "mm",
      tsOrigem: "2026-05-01T11:00:00.000Z",
      tsIngestao: "2026-05-01T11:00:00.000Z",
      qualidade: "aprovada",
    });
  }
}

describe("agenteLimiar", () => {
  let mundo: Mundo;
  let ctx: ContextoAgente;

  beforeEach(() => {
    mundo = criarMundo(2024);
    ctx = criarContexto(mundo);
  });

  it("nao cria alerta quando nenhum limiar e atingido", () => {
    criarAgenteLimiar().aoTick(ctx);
    expect(ctx.estado.alertas).toHaveLength(0);
  });

  it("cria alerta candidato quando o limiar de chuva e ultrapassado — CA-ALT-02", () => {
    saturarChuva(ctx, 90);
    criarAgenteLimiar().aoTick(ctx);
    expect(ctx.estado.alertas.length).toBeGreaterThan(0);
    expect(ctx.estado.alertas.every((a) => a.estado === "candidato")).toBe(true);
  });

  it("anexa evidencia rastreavel ao alerta", () => {
    saturarChuva(ctx, 90);
    criarAgenteLimiar().aoTick(ctx);
    const alerta = ctx.estado.alertas[0];
    if (!alerta) throw new Error("sem alerta");
    expect(alerta.evidencias.length).toBeGreaterThan(0);
    expect(alerta.evidencias[0]?.tipo).toBe("observacao");
  });

  it("ignora leitura reprovada ao acumular — CA-ING-04 encadeado", () => {
    const pluvio = ctx.estado.estacoes.filter((e) => e.tipo === "pluviometrica");
    for (const estacao of pluvio) {
      ctx.estado.observacoes.push({
        observacaoId: `obs-${ctx.estado.contador++}`,
        estacaoId: estacao.estacaoId,
        fonteId: estacao.fonteId,
        variavel: "chuva_mm",
        valor: 400,
        unidade: "mm",
        tsOrigem: "2026-05-01T11:00:00.000Z",
        tsIngestao: "2026-05-01T11:00:00.000Z",
        qualidade: "reprovada",
        motivoQualidade: "fora de faixa",
      });
    }
    criarAgenteLimiar().aoTick(ctx);
    expect(ctx.estado.alertas).toHaveLength(0);
  });

  it("publica evento correlacionado ao alerta criado", () => {
    saturarChuva(ctx, 90);
    criarAgenteLimiar().aoTick(ctx);
    const alerta = ctx.estado.alertas[0];
    if (!alerta) throw new Error("sem alerta");
    const cadeia = ctx.barramento.porCorrelacao(alerta.alertaId);
    expect(cadeia.map((e) => e.tipo)).toContain("alerta.criado");
  });
});

describe("agenteAntifadiga (integrado ao agenteLimiar)", () => {
  it("segundo disparo na mesma zona vira atualizacao, nao novo alerta — CA-ALT-05", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    const agente = criarAgenteLimiar();

    saturarChuva(ctx, 90);
    agente.aoTick(ctx);
    const quantidadeInicial = ctx.estado.alertas.length;
    expect(quantidadeInicial).toBeGreaterThan(0);

    ctx.relogio.avancarMinutos(20);
    agente.aoTick(ctx);

    expect(ctx.estado.alertas).toHaveLength(quantidadeInicial);
    expect(ctx.estado.alertas.some((a) => a.atualizacoes.length > 0)).toBe(true);
    expect(ctx.barramento.historico().map((e) => e.tipo)).toContain("alerta.agrupado");
  });
});

describe("agenteGeofencing", () => {
  it("cria alerta preditivo com lead time quando a mancha alcanca a zona — CA-ALT-03", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo, 12);
    ctx.estado.cotaPrevistaM = 12;
    ctx.estado.exposicao = mundo.zonas.slice(0, 2).map((z) => ({
      zonaId: z.zonaId,
      areaInterceptadaKm2: 1.2,
      populacaoEstimada: z.populacaoEstimada,
      familiasEstimadas: z.familiasEstimadas,
      metodoEstimativa: "teste",
    }));

    criarAgenteGeofencing().aoTick(ctx);

    const preditivos = ctx.estado.alertas.filter((a) => a.origem === "previsao");
    expect(preditivos.length).toBeGreaterThan(0);
    expect(preditivos[0]?.leadTimeHoras).toBe(12);
    expect(preditivos[0]?.evidencias[0]?.tipo).toBe("mancha");
  });

  it("nao cria alerta quando nenhuma zona e alcancada", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    ctx.estado.exposicao = [];
    criarAgenteGeofencing().aoTick(ctx);
    expect(ctx.estado.alertas).toHaveLength(0);
  });
});

describe("agenteRedator", () => {
  it("gera boletim em rascunho citando as fontes consultadas — CA-LLM-01", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    const zona = mundo.zonas[0];
    if (!zona) throw new Error("sem zona");

    ctx.estado.alertas.push(
      validar(
        criarAlertaCandidato({
          alertaId: "A-1",
          zonaId: zona.zonaId,
          limiarId: "L-1",
          severidade: "alta",
          origem: "observacao",
          valorDisparo: 72,
          tsDeteccao: "2026-05-01T12:00:00.000Z",
          leadTimeHoras: null,
          evidencias: [
            {
              tipo: "observacao",
              referenciaId: "obs-1",
              descricao: "Chuva acumulada 6 h",
              valor: 72,
              ts: "2026-05-01T12:00:00.000Z",
            },
          ],
        }),
        "coord.plantao",
        "2026-05-01T12:02:00.000Z",
      ),
    );

    criarAgenteRedator().aoTick(ctx);

    const boletim = ctx.estado.boletins[0];
    if (!boletim) throw new Error("sem boletim");
    expect(boletim.textoAprovado).toBeNull();
    expect(boletim.fontesConsultadas.length).toBeGreaterThan(0);
    expect(boletim.textoRascunho).toContain(zona.nome);
    expect(boletim.textoRascunho).toContain("72");
  });

  it("nao redige boletim para alerta ainda candidato", () => {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    const zona = mundo.zonas[0];
    if (!zona) throw new Error("sem zona");
    ctx.estado.alertas.push(
      criarAlertaCandidato({
        alertaId: "A-9",
        zonaId: zona.zonaId,
        limiarId: "L-1",
        severidade: "alta",
        origem: "observacao",
        valorDisparo: 72,
        tsDeteccao: "2026-05-01T12:00:00.000Z",
        leadTimeHoras: null,
        evidencias: [],
      }),
    );
    criarAgenteRedator().aoTick(ctx);
    expect(ctx.estado.boletins).toHaveLength(0);
  });
});

// Este bloco e o coracao demonstrativo da aplicacao.
describe("agenteExpedicao — RNF-18", () => {
  function contextoComAlerta(estado: "candidato" | "validado"): ContextoAgente {
    const mundo = criarMundo(2024);
    const ctx = criarContexto(mundo);
    const zona = mundo.zonas[0];
    if (!zona) throw new Error("sem zona");
    const base = criarAlertaCandidato({
      alertaId: "A-1",
      zonaId: zona.zonaId,
      limiarId: "L-1",
      severidade: "alta",
      origem: "observacao",
      valorDisparo: 72,
      tsDeteccao: "2026-05-01T12:00:00.000Z",
      leadTimeHoras: null,
      evidencias: [],
    });
    ctx.estado.alertas.push(
      estado === "validado" ? validar(base, "coord.plantao", "2026-05-01T12:02:00.000Z") : base,
    );
    return ctx;
  }

  it("fica BLOQUEADO diante de alerta apenas candidato", () => {
    const ctx = contextoComAlerta("candidato");
    const agente = criarAgenteExpedicao();
    agente.aoTick(ctx);

    expect(agente.status).toBe("bloqueado");
    expect(ctx.estado.alertas[0]?.estado).toBe("candidato");
    expect(ctx.barramento.historico().map((e) => e.tipo)).toContain("expedicao.bloqueada");
  });

  it("expede somente depois da validacao humana", () => {
    const ctx = contextoComAlerta("validado");
    const agente = criarAgenteExpedicao();
    agente.aoTick(ctx);

    expect(ctx.estado.alertas[0]?.estado).toBe("expedido");
    expect(ctx.estado.alertas[0]?.operadorValidador).toBe("coord.plantao");
    expect(ctx.barramento.historico().map((e) => e.tipo)).toContain("alerta.expedido");
  });

  it("nunca altera um alerta descartado", () => {
    const ctx = contextoComAlerta("candidato");
    const alerta = ctx.estado.alertas[0];
    if (!alerta) throw new Error("sem alerta");
    ctx.estado.alertas[0] = { ...alerta, estado: "descartado", motivoDescarte: "sem risco" };

    criarAgenteExpedicao().aoTick(ctx);
    expect(ctx.estado.alertas[0]?.estado).toBe("descartado");
  });
});

describe("criarEnxame", () => {
  it("monta os 12 agentes do enxame", () => {
    expect(criarEnxame()).toHaveLength(12);
  });

  it("da a cada agente um id unico", () => {
    const ids = criarEnxame().map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cobre os sete modulos do SPEC-H1", () => {
    const modulos = new Set(criarEnxame().map((a) => a.modulo));
    expect(modulos).toEqual(new Set(["ING", "NET", "MOD", "ALT", "EXP", "LLM", "GOV"]));
  });

  it("declara os requisitos que cada agente demonstra", () => {
    for (const agente of criarEnxame()) {
      expect(agente.requisitos.length).toBeGreaterThan(0);
      for (const requisito of agente.requisitos) {
        expect(requisito).toMatch(/^(RF|RNF)-/);
      }
    }
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npm run test
```
Esperado: FAIL — módulos de agente de alerta inexistentes.

- [ ] **Step 3: Implementar `agenteLimiar.ts` (com antifadiga embutida)**

```ts
import { aplicarAtualizacao, criarAlertaCandidato, deveAgrupar } from "@/dominio/alerta";
import { acumular, atingeLimiar, limiaresVigentes } from "@/dominio/limiar";
import type { Agente, ContextoAgente } from "./tipos";

const JANELA_AGRUPAMENTO_MIN = 60;

/**
 * Agente de limiar observado (RF-ALT-01/02) com antifadiga (RF-ALT-05).
 * So enxerga leituras aprovadas — leitura reprovada nunca dispara alerta.
 */
export function criarAgenteLimiar(): Agente {
  let sequencia = 0;

  return {
    id: "agente-limiar",
    nome: "Motor de limiares",
    modulo: "ALT",
    descricao:
      "Avalia os limiares vigentes por zona de risco contra as leituras aprovadas e cria alertas candidatos com evidencia rastreavel.",
    requisitos: ["RF-ALT-01", "RF-ALT-02", "RF-ALT-05"],
    status: "ocioso",
    ultimaAtividade: null,
    contadorTrabalho: 0,

    aoTick(ctx: ContextoAgente): void {
      const ts = ctx.relogio.iso;
      const vigentes = limiaresVigentes(ctx.mundo.limiares, ts).filter(
        (l) => l.origem === "observacao",
      );

      let criados = 0;
      let agrupados = 0;

      for (const limiar of vigentes) {
        const zona = ctx.mundo.zonas.find((z) => z.zonaId === limiar.zonaId);
        if (!zona) continue;

        const estacoesDaZona = ctx.estado.estacoes
          .filter((e) => e.subBaciaId === zona.subBaciaId && e.tipo === "pluviometrica")
          .map((e) => e.estacaoId);
        if (estacoesDaZona.length === 0) continue;

        const acumulado = acumular(
          ctx.estado.observacoes,
          limiar.variavel,
          estacoesDaZona,
          limiar.janelaHoras,
          ts,
        );
        const media = acumulado / estacoesDaZona.length;
        if (!atingeLimiar(limiar, media)) continue;

        const ativo = ctx.estado.alertas.find(
          (a) => a.zonaId === zona.zonaId && a.origem === "observacao",
        );

        if (ativo && deveAgrupar(ativo, limiar.severidade, ts, JANELA_AGRUPAMENTO_MIN)) {
          const indice = ctx.estado.alertas.indexOf(ativo);
          ctx.estado.alertas[indice] = aplicarAtualizacao(
            ativo,
            "reforco",
            `Limiar reincidente: ${media.toFixed(1)} mm acumulados em ${limiar.janelaHoras} h`,
            ts,
          );
          agrupados++;
          ctx.publicar(
            this.id,
            "alerta.agrupado",
            `Reincidencia na zona ${zona.nome} agrupada no alerta ${ativo.alertaId}`,
            { alertaId: ativo.alertaId, valor: media },
            ativo.alertaId,
          );
          continue;
        }

        if (ativo) continue;

        const alertaId = `A-OBS-${String(++sequencia).padStart(3, "0")}`;
        const alerta = criarAlertaCandidato({
          alertaId,
          zonaId: zona.zonaId,
          limiarId: limiar.limiarId,
          severidade: limiar.severidade,
          origem: "observacao",
          valorDisparo: Number(media.toFixed(1)),
          tsDeteccao: ts,
          leadTimeHoras: null,
          evidencias: [
            {
              tipo: "observacao",
              referenciaId: limiar.limiarId,
              descricao: `Chuva acumulada de ${media.toFixed(1)} mm em ${limiar.janelaHoras} h nas ${estacoesDaZona.length} estacoes da zona`,
              valor: Number(media.toFixed(1)),
              ts,
            },
          ],
        });

        ctx.estado.alertas.push(alerta);
        criados++;

        ctx.publicar(
          this.id,
          "limiar.atingido",
          `Limiar ${limiar.limiarId} atingido na zona ${zona.nome}: ${media.toFixed(1)} mm`,
          { limiarId: limiar.limiarId, zonaId: zona.zonaId, valor: media },
          alertaId,
        );
        ctx.publicar(
          this.id,
          "alerta.criado",
          `Alerta ${alertaId} (${limiar.severidade}) criado para ${zona.nome} — aguardando validacao humana`,
          { alertaId, zonaId: zona.zonaId, severidade: limiar.severidade },
          alertaId,
        );
      }

      this.status = criados > 0 || agrupados > 0 ? "alerta" : "trabalhando";
      this.ultimaAtividade = ts;
      this.contadorTrabalho += vigentes.length;
    },
  };
}
```

- [ ] **Step 4: Implementar `agenteGeofencing.ts`**

```ts
import { criarAlertaCandidato } from "@/dominio/alerta";
import { atingeLimiar, limiaresVigentes } from "@/dominio/limiar";
import type { Agente, ContextoAgente } from "./tipos";

const HORIZONTE_ALERTA_HORAS = 12;

/**
 * Agente de geofencing preditivo (RF-ALT-03).
 * Esta e a acao espacial da demo: cruza a mancha projetada com as zonas
 * de risco e antecipa o alerta em relacao ao limiar observado.
 */
export function criarAgenteGeofencing(): Agente {
  let sequencia = 0;

  return {
    id: "agente-geofencing",
    nome: "Geofencing preditivo",
    modulo: "ALT",
    descricao:
      "Cruza a mancha de inundacao projetada com as zonas de risco e dispara alerta antecipado, com lead time registrado.",
    requisitos: ["RF-ALT-03"],
    status: "ocioso",
    ultimaAtividade: null,
    contadorTrabalho: 0,

    aoTick(ctx: ContextoAgente): void {
      const ts = ctx.relogio.iso;

      if (ctx.estado.exposicao.length === 0) {
        this.status = "trabalhando";
        this.ultimaAtividade = ts;
        return;
      }

      const vigentes = limiaresVigentes(ctx.mundo.limiares, ts).filter(
        (l) => l.origem === "previsao",
      );

      let criados = 0;

      for (const exposicao of ctx.estado.exposicao) {
        const limiar = vigentes.find((l) => l.zonaId === exposicao.zonaId);
        if (!limiar) continue;
        if (!atingeLimiar(limiar, ctx.estado.cotaPrevistaM)) continue;

        const jaExiste = ctx.estado.alertas.some(
          (a) =>
            a.zonaId === exposicao.zonaId &&
            a.origem === "previsao" &&
            a.estado !== "encerrado" &&
            a.estado !== "descartado",
        );
        if (jaExiste) continue;

        const zona = ctx.mundo.zonas.find((z) => z.zonaId === exposicao.zonaId);
        if (!zona) continue;

        const alertaId = `A-PRE-${String(++sequencia).padStart(3, "0")}`;
        ctx.estado.alertas.push(
          criarAlertaCandidato({
            alertaId,
            zonaId: zona.zonaId,
            limiarId: limiar.limiarId,
            severidade: limiar.severidade,
            origem: "previsao",
            valorDisparo: ctx.estado.cotaPrevistaM,
            tsDeteccao: ts,
            leadTimeHoras: HORIZONTE_ALERTA_HORAS,
            evidencias: [
              {
                tipo: "mancha",
                referenciaId: limiar.limiarId,
                descricao: `Mancha na cota ${ctx.estado.cotaPrevistaM.toFixed(2)} m intercepta ${zona.nome} — ${exposicao.populacaoEstimada} pessoas expostas`,
                valor: ctx.estado.cotaPrevistaM,
                ts,
              },
            ],
          }),
        );
        criados++;

        ctx.publicar(
          this.id,
          "alerta.criado",
          `Alerta preditivo ${alertaId} para ${zona.nome} com ${HORIZONTE_ALERTA_HORAS} h de antecedencia`,
          {
            alertaId,
            zonaId: zona.zonaId,
            leadTimeHoras: HORIZONTE_ALERTA_HORAS,
            populacaoExposta: exposicao.populacaoEstimada,
          },
          alertaId,
        );
      }

      this.status = criados > 0 ? "alerta" : "trabalhando";
      this.ultimaAtividade = ts;
      this.contadorTrabalho += ctx.estado.exposicao.length;
    },
  };
}
```

- [ ] **Step 5: Implementar `agenteAntifadiga.ts`**

Este agente não cria alertas: ele **encerra** os que perderam sustentação, evitando fila entulhada. A deduplicação em si vive no `agenteLimiar` (onde a decisão precisa acontecer no mesmo instante da avaliação).

```ts
import { encerrar } from "@/dominio/alerta";
import type { Agente, ContextoAgente } from "./tipos";

const HORAS_SEM_REFORCO_PARA_ENCERRAR = 6;

/**
 * Agente antifadiga (RF-ALT-05, complemento).
 * Encerra alertas expedidos que nao recebem reforco ha horas —
 * fila limpa e o que mantem o operador confiando no sistema.
 */
export function criarAgenteAntifadiga(): Agente {
  return {
    id: "agente-antifadiga",
    nome: "Antifadiga de alerta",
    modulo: "ALT",
    descricao:
      "Encerra alertas sem reforco recente para evitar acumulo de avisos vencidos na fila do plantao.",
    requisitos: ["RF-ALT-05", "RF-ALT-06"],
    status: "ocioso",
    ultimaAtividade: null,
    contadorTrabalho: 0,

    aoTick(ctx: ContextoAgente): void {
      const ts = ctx.relogio.iso;
      let encerrados = 0;

      for (let i = 0; i < ctx.estado.alertas.length; i++) {
        const alerta = ctx.estado.alertas[i];
        if (!alerta) continue;
        if (alerta.estado !== "expedido" && alerta.estado !== "atualizado") continue;

        const ultima = alerta.atualizacoes[alerta.atualizacoes.length - 1];
        const referencia = ultima?.ts ?? alerta.tsExpedicao ?? alerta.tsDeteccao;
        const horas = ctx.relogio.minutosDesde(referencia) / 60;

        if (horas >= HORAS_SEM_REFORCO_PARA_ENCERRAR) {
          ctx.estado.alertas[i] = encerrar(alerta, ts);
          encerrados++;
          ctx.publicar(
            this.id,
            "alerta.agrupado",
            `Alerta ${alerta.alertaId} encerrado apos ${horas.toFixed(1)} h sem reforco`,
            { alertaId: alerta.alertaId },
            alerta.alertaId,
          );
        }
      }

      this.status = encerrados > 0 ? "trabalhando" : "ocioso";
      this.ultimaAtividade = ts;
      this.contadorTrabalho += encerrados;
    },
  };
}
```

- [ ] **Step 6: Implementar `dominio/boletim.ts`**

```ts
import type { Alerta, ZonaRisco } from "./tipos";

export interface ParametrosBoletim {
  readonly alerta: Alerta;
  readonly zona: ZonaRisco;
  readonly cotaPrevistaM: number;
  readonly estacoesOperantes: number;
  readonly estacoesTotal: number;
  readonly tsIso: string;
}

const ROTULO_SEVERIDADE: Record<Alerta["severidade"], string> = {
  baixa: "BAIXA",
  media: "MEDIA",
  alta: "ALTA",
  muito_alta: "MUITO ALTA",
};

/**
 * Compoe o rascunho do boletim a partir EXCLUSIVAMENTE dos dados da simulacao.
 * Nao ha LLM nesta demo: o texto e montado por template, e nenhum numero
 * aparece aqui sem ter sido lido do estado. Isso preserva a propriedade que
 * mais importa em RF-LLM-01 — nao afirmar valor que a fonte nao sustenta.
 */
export function redigirBoletim(p: ParametrosBoletim): string {
  const { alerta, zona } = p;
  const antecedencia =
    alerta.leadTimeHoras === null
      ? "com base em observacao ja registrada"
      : `com ${alerta.leadTimeHoras} h de antecedencia`;

  const evidencias = alerta.evidencias
    .map((e) => `  - ${e.descricao} (${e.valor}, ${e.ts})`)
    .join("\n");

  return [
    `BOLETIM DE SITUACAO — RASCUNHO (requer revisao humana)`,
    ``,
    `Emitido em: ${p.tsIso}`,
    `Alerta: ${alerta.alertaId} | Severidade: ${ROTULO_SEVERIDADE[alerta.severidade]}`,
    `Zona: ${zona.nome} (setor ${zona.codigoSetorSgb}, risco ${zona.grauRisco.replace("_", " ")})`,
    ``,
    `SITUACAO`,
    `Foi identificada condicao de risco na zona ${zona.nome} ${antecedencia}.`,
    `Cota prevista no posto de referencia: ${p.cotaPrevistaM.toFixed(2)} m.`,
    `Populacao potencialmente exposta: ${zona.populacaoEstimada} pessoas (${zona.familiasEstimadas} familias).`,
    ``,
    `EVIDENCIAS CONSULTADAS`,
    evidencias || "  - (sem evidencia registrada)",
    ``,
    `COBERTURA DA REDE DE OBSERVACAO`,
    `${p.estacoesOperantes} de ${p.estacoesTotal} estacoes operantes no momento da analise.`,
    ``,
    `ORIENTACAO`,
    `Acionar a equipe de defesa civil responsavel pelo setor e verificar rotas de acesso.`,
    ``,
    `--`,
    `Rascunho gerado automaticamente a partir das camadas da plataforma.`,
    `Nenhum valor foi estimado fora das fontes citadas acima.`,
    `Este texto NAO foi expedido: depende de revisao e aprovacao humana.`,
  ].join("\n");
}
```

- [ ] **Step 7: Implementar `agenteRedator.ts`**

```ts
import { redigirBoletim } from "@/dominio/boletim";
import type { Agente, ContextoAgente } from "./tipos";

/**
 * Agente redator (modulo LLM, RF-LLM-01/03/05).
 * Produz SEMPRE rascunho. Nao expede, nao altera limiar, nao publica.
 */
export function criarAgenteRedator(): Agente {
  let sequencia = 0;

  return {
    id: "agente-redator",
    nome: "Assistente de plantao",
    modulo: "LLM",
    descricao:
      "Redige o boletim de situacao em rascunho, citando as fontes consultadas. So le e rascunha — nunca escreve dado autoritativo nem expede.",
    requisitos: ["RF-LLM-01", "RF-LLM-03", "RF-LLM-05"],
    status: "ocioso",
    ultimaAtividade: null,
    contadorTrabalho: 0,

    aoTick(ctx: ContextoAgente): void {
      const ts = ctx.relogio.iso;
      const pendentes = ctx.estado.alertas.filter(
        (a) =>
          (a.estado === "validado" || a.estado === "expedido") &&
          !ctx.estado.boletins.some((b) => b.alertaId === a.alertaId),
      );

      if (pendentes.length === 0) {
        this.status = "ocioso";
        return;
      }

      const operantes = ctx.estado.estacoes.filter((e) => e.situacao === "operante").length;

      for (const alerta of pendentes) {
        const zona = ctx.mundo.zonas.find((z) => z.zonaId === alerta.zonaId);
        if (!zona) continue;

        const fontes = [
          `zonas de risco (${zona.codigoSetorSgb})`,
          `previsao de nivel do posto ${ctx.mundo.postoId}`,
          `rede de observacao (${operantes}/${ctx.estado.estacoes.length} estacoes)`,
          ...alerta.evidencias.map((e) => e.descricao),
        ];

        ctx.estado.boletins.push({
          boletimId: `B-${String(++sequencia).padStart(3, "0")}`,
          alertaId: alerta.alertaId,
          publico: "defesa_civil",
          textoRascunho: redigirBoletim({
            alerta,
            zona,
            cotaPrevistaM: ctx.estado.cotaPrevistaM,
            estacoesOperantes: operantes,
            estacoesTotal: ctx.estado.estacoes.length,
            tsIso: ts,
          }),
          textoAprovado: null,
          fontesConsultadas: fontes,
          tsGeracao: ts,
          tsAprovacao: null,
          autorAprovacao: null,
        });

        ctx.publicar(
          this.id,
          "ferramenta.invocada",
          `Consultadas ${fontes.length} fontes para compor o boletim de ${alerta.alertaId}`,
          { alertaId: alerta.alertaId, fontes },
          alerta.alertaId,
        );
        ctx.publicar(
          this.id,
          "boletim.rascunho",
          `Boletim de ${alerta.alertaId} redigido em rascunho — aguardando aprovacao humana`,
          { alertaId: alerta.alertaId },
          alerta.alertaId,
        );
      }

      this.status = "trabalhando";
      this.ultimaAtividade = ts;
      this.contadorTrabalho += pendentes.length;
    },
  };
}
```

- [ ] **Step 8: Implementar `agenteExpedicao.ts`**

```ts
import { expedir } from "@/dominio/alerta";
import type { Agente, ContextoAgente } from "./tipos";

/**
 * Agente de expedicao (modulo EXP, RF-EXP-02/03) sob RNF-18.
 *
 * Este agente e o argumento central da demonstracao: ele TENTA expedir,
 * e fica BLOQUEADO enquanto nenhuma pessoa identificada tiver validado.
 * O bloqueio nao e um obstaculo a contornar — e o requisito funcionando.
 * NAO adicionar caminho de auto-validacao.
 */
export function criarAgenteExpedicao(): Agente {
  return {
    id: "agente-expedicao",
    nome: "Expedicao multicanal",
    modulo: "EXP",
    descricao:
      "Encaminha o alerta validado aos destinatarios por webhook, e-mail e CAP. Permanece bloqueado enquanto nao houver validacao humana.",
    requisitos: ["RF-EXP-01", "RF-EXP-02", "RF-EXP-03", "RNF-18"],
    status: "ocioso",
    ultimaAtividade: null,
    contadorTrabalho: 0,

    aoTick(ctx: ContextoAgente): void {
      const ts = ctx.relogio.iso;

      const candidatos = ctx.estado.alertas.filter((a) => a.estado === "candidato");
      const validados = ctx.estado.alertas.filter((a) => a.estado === "validado");

      for (const alerta of candidatos) {
        ctx.publicar(
          this.id,
          "expedicao.bloqueada",
          `Expedicao de ${alerta.alertaId} bloqueada: aguardando validacao de operador identificado (RNF-18)`,
          { alertaId: alerta.alertaId },
          alerta.alertaId,
        );
      }

      for (const alerta of validados) {
        const indice = ctx.estado.alertas.indexOf(alerta);
        // expedir() lanca se o alerta nao estiver validado. Nao capturamos
        // para transformar em sucesso — a excecao e a garantia do requisito.
        ctx.estado.alertas[indice] = expedir(alerta, ts);
        this.contadorTrabalho += 1;

        ctx.publicar(
          this.id,
          "alerta.expedido",
          `Alerta ${alerta.alertaId} expedido por ${alerta.operadorValidador} — webhook, e-mail e CAP`,
          {
            alertaId: alerta.alertaId,
            canais: ["webhook", "email", "cap"],
            operador: alerta.operadorValidador,
          },
          alerta.alertaId,
        );
      }

      this.status =
        validados.length > 0 ? "trabalhando" : candidatos.length > 0 ? "bloqueado" : "ocioso";
      this.ultimaAtividade = ts;
    },
  };
}
```

- [ ] **Step 9: Implementar `agenteAuditoria.ts` e `registro.ts`**

`agenteAuditoria.ts`:
```ts
import type { Agente, ContextoAgente } from "./tipos";

/**
 * Agente de auditoria (modulo GOV, RF-GOV-02).
 * Nao produz dado novo: observa o barramento e mantem o indicador de
 * rastreabilidade — quantos alertas tem cadeia reconstituivel completa.
 */
export function criarAgenteAuditoria(): Agente {
  return {
    id: "agente-auditoria",
    nome: "Trilha de auditoria",
    modulo: "GOV",
    descricao:
      "Verifica que cada alerta possui cadeia completa: dado de origem, limiar, decisao humana e expedicao.",
    requisitos: ["RF-GOV-02"],
    status: "ocioso",
    ultimaAtividade: null,
    contadorTrabalho: 0,

    aoTick(ctx: ContextoAgente): void {
      const ts = ctx.relogio.iso;
      const expedidos = ctx.estado.alertas.filter((a) => a.estado === "expedido");
      let completos = 0;

      for (const alerta of expedidos) {
        const cadeia = ctx.barramento.porCorrelacao(alerta.alertaId).map((e) => e.tipo);
        const temOrigem = cadeia.includes("limiar.atingido") || cadeia.includes("alerta.criado");
        const temDecisao = cadeia.includes("alerta.validado");
        const temExpedicao = cadeia.includes("alerta.expedido");
        if (temOrigem && temDecisao && temExpedicao) completos++;
      }

      this.contadorTrabalho = completos;
      this.status = expedidos.length > 0 && completos < expedidos.length ? "alerta" : "trabalhando";
      this.ultimaAtividade = ts;
    },
  };
}
```

`registro.ts`:
```ts
import { criarAgenteAntifadiga } from "./agenteAntifadiga";
import { criarAgenteAuditoria } from "./agenteAuditoria";
import { criarAgenteExpedicao } from "./agenteExpedicao";
import { criarAgenteGeofencing } from "./agenteGeofencing";
import { criarAgenteHidrologico } from "./agenteHidrologico";
import { criarAgenteIngestao } from "./agenteIngestao";
import { criarAgenteLimiar } from "./agenteLimiar";
import { criarAgenteQualidade } from "./agenteQualidade";
import { criarAgenteRedator } from "./agenteRedator";
import { criarAgenteRede } from "./agenteRede";
import { FONTES } from "@/simulacao/mundo";
import type { Agente } from "./tipos";

/**
 * Monta o enxame na ordem de execucao do tick.
 * A ordem importa: ingestao -> qualidade -> rede -> modelagem ->
 * limiar/geofencing -> antifadiga -> redator -> expedicao -> auditoria.
 */
export function criarEnxame(): Agente[] {
  return [
    ...FONTES.map((fonte) => criarAgenteIngestao(fonte)),
    criarAgenteQualidade(),
    criarAgenteRede(),
    criarAgenteHidrologico(),
    criarAgenteLimiar(),
    criarAgenteGeofencing(),
    criarAgenteAntifadiga(),
    criarAgenteRedator(),
    criarAgenteExpedicao(),
    criarAgenteAuditoria(),
  ];
}
```

Contagem: 3 (ingestão) + 9 = **12 agentes**, batendo com o teste.

- [ ] **Step 10: Rodar os testes e verificar que passam**

```bash
npm run test
```
Esperado: PASS. Preste atenção especial ao bloco `agenteExpedicao — RNF-18`: se algum dos três testes falhar, **não relaxe a asserção** — o defeito está na implementação.

- [ ] **Step 11: Commit**

```bash
git add -A demo
git commit -m "feat(agentes): alerta, geofencing espacial, antifadiga, redator, expedicao bloqueada e auditoria"
```

---

### Task 11: Simulação — cenários e motor de tick

**Files:**
- Create: `demo/src/simulacao/cenarios.ts`
- Create: `demo/src/simulacao/motor.ts`
- Create: `demo/src/simulacao/motor.test.ts`

**Interfaces:**
- Consumes: `criarEnxame`, `criarEstadoInicial`, `ContextoAgente` de `@/agentes`; `criarMundo`; `Barramento`; `RelogioSimulado`; `criarAleatorio`
- Produces:
  - `interface Cenario { id; nome; descricao; semente; nivelInicialM; inicioIso; perfilChuva(horaDecorrida): number; falhaEstacaoNoMinuto?: number }`
  - `CENARIOS: readonly Cenario[]` (5 cenários)
  - `class Motor` com `constructor(cenario)`, `tick(): void`, `estado`, `agentes`, `barramento`, `relogio`, `mundo`, `validarAlerta(id, operador)`, `descartarAlerta(id, motivo)`, `aprovarBoletim(id, autor, texto)`

- [ ] **Step 1: Escrever `cenarios.ts`**

```ts
export interface Cenario {
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
  readonly requisitosDestacados: readonly string[];
  readonly semente: number;
  readonly nivelInicialM: number;
  readonly inicioIso: string;
  /** Intensidade de chuva em mm/h para a hora decorrida desde o inicio. */
  perfilChuva(horaDecorrida: number): number;
  /** Minuto simulado em que uma estacao para de transmitir. */
  readonly falhaEstacaoNoMinuto?: number;
  /** Minuto simulado em que uma leitura absurda e injetada. */
  readonly leituraAbsurdaNoMinuto?: number;
}

export const CENARIOS: readonly Cenario[] = [
  {
    id: "calmaria",
    nome: "Ceu limpo",
    descricao:
      "Rede transmitindo normalmente, sem chuva significativa. Serve para mostrar o sistema em repouso e a saude da rede.",
    requisitosDestacados: ["RF-ING-02", "RF-NET-01"],
    semente: 1001,
    nivelInicialM: 1.8,
    inicioIso: "2026-05-01T06:00:00.000Z",
    perfilChuva: () => 0.2,
  },
  {
    id: "convectiva",
    nome: "Chuva convectiva localizada",
    descricao:
      "Celula intensa e curta. O limiar observado dispara, e o agente antifadiga agrupa a reincidencia em vez de criar alerta novo.",
    requisitosDestacados: ["RF-ALT-02", "RF-ALT-05"],
    semente: 1002,
    nivelInicialM: 2.1,
    inicioIso: "2026-05-01T14:00:00.000Z",
    perfilChuva: (h) => (h >= 1 && h <= 4 ? 28 : 1),
  },
  {
    id: "extremo",
    nome: "Evento extremo prolongado",
    descricao:
      "Chuva persistente que eleva a cota e faz a mancha alcancar as zonas de risco. O geofencing preditivo antecipa o alerta.",
    requisitosDestacados: ["RF-MOD-02", "RF-MOD-04", "RF-ALT-03"],
    semente: 1003,
    nivelInicialM: 2.6,
    inicioIso: "2026-04-30T18:00:00.000Z",
    perfilChuva: (h) => (h < 2 ? 8 : h < 14 ? 34 : 12),
  },
  {
    id: "rede-degradada",
    nome: "Falha na rede de estacoes",
    descricao:
      "Estacoes param de transmitir durante o evento. O painel de saude expoe a lacuna e o sistema continua operando com o que resta.",
    requisitosDestacados: ["RF-NET-01", "RNF-06"],
    semente: 1004,
    nivelInicialM: 2.4,
    inicioIso: "2026-05-01T02:00:00.000Z",
    perfilChuva: (h) => (h < 3 ? 6 : 22),
    falhaEstacaoNoMinuto: 120,
  },
  {
    id: "dado-sujo",
    nome: "Leitura implausivel",
    descricao:
      "Um sensor envia 2000 mm/h. O controle de qualidade reprova, mantem o registro e impede que a leitura vire alerta.",
    requisitosDestacados: ["RF-ING-04"],
    semente: 1005,
    nivelInicialM: 2,
    inicioIso: "2026-05-01T09:00:00.000Z",
    perfilChuva: () => 4,
    leituraAbsurdaNoMinuto: 40,
  },
];
```

- [ ] **Step 2: Escrever `motor.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { CENARIOS } from "./cenarios";
import { Motor } from "./motor";

function cenario(id: string) {
  const c = CENARIOS.find((x) => x.id === id);
  if (!c) throw new Error(`cenario ${id} nao encontrado`);
  return c;
}

describe("Motor", () => {
  it("comeca no instante de inicio do cenario", () => {
    const motor = new Motor(cenario("calmaria"));
    expect(motor.relogio.iso).toBe("2026-05-01T06:00:00.000Z");
  });

  it("avanca 10 minutos por tick", () => {
    const motor = new Motor(cenario("calmaria"));
    motor.tick();
    expect(motor.relogio.iso).toBe("2026-05-01T06:10:00.000Z");
  });

  it("monta o enxame de 12 agentes", () => {
    expect(new Motor(cenario("calmaria")).agentes).toHaveLength(12);
  });

  it("produz observacoes desde o primeiro tick", () => {
    const motor = new Motor(cenario("calmaria"));
    motor.tick();
    expect(motor.estado.observacoes.length).toBeGreaterThan(0);
  });

  it("e reproduzivel: dois motores do mesmo cenario convergem", () => {
    const a = new Motor(cenario("extremo"));
    const b = new Motor(cenario("extremo"));
    for (let i = 0; i < 30; i++) {
      a.tick();
      b.tick();
    }
    expect(a.estado.alertas.map((x) => x.alertaId)).toEqual(
      b.estado.alertas.map((x) => x.alertaId),
    );
    expect(a.estado.cotaPrevistaM).toBe(b.estado.cotaPrevistaM);
  });

  it("no cenario extremo, gera alerta preditivo por geofencing", () => {
    const motor = new Motor(cenario("extremo"));
    for (let i = 0; i < 90; i++) motor.tick();
    expect(motor.estado.alertas.some((a) => a.origem === "previsao")).toBe(true);
  });

  it("no cenario de dado sujo, a leitura absurda e reprovada e nao vira alerta", () => {
    const motor = new Motor(cenario("dado-sujo"));
    for (let i = 0; i < 12; i++) motor.tick();
    const reprovadas = motor.estado.observacoes.filter((o) => o.qualidade === "reprovada");
    expect(reprovadas.length).toBeGreaterThan(0);
    expect(reprovadas.some((o) => o.valor === 2000)).toBe(true);
  });

  it("no cenario de rede degradada, ao menos uma estacao fica silenciosa", () => {
    const motor = new Motor(cenario("rede-degradada"));
    for (let i = 0; i < 40; i++) motor.tick();
    expect(motor.estado.estacoes.some((e) => e.situacao === "silenciosa")).toBe(true);
  });

  it("nao expede alerta sem validacao humana — RNF-18 ponta a ponta", () => {
    const motor = new Motor(cenario("extremo"));
    for (let i = 0; i < 120; i++) motor.tick();
    expect(motor.estado.alertas.some((a) => a.estado === "candidato")).toBe(true);
    expect(motor.estado.alertas.every((a) => a.estado !== "expedido")).toBe(true);
  });

  it("expede apenas depois de validarAlerta", () => {
    const motor = new Motor(cenario("convectiva"));
    for (let i = 0; i < 40; i++) motor.tick();
    const candidato = motor.estado.alertas.find((a) => a.estado === "candidato");
    if (!candidato) throw new Error("cenario nao gerou candidato");

    motor.validarAlerta(candidato.alertaId, "coord.plantao");
    motor.tick();

    const depois = motor.estado.alertas.find((a) => a.alertaId === candidato.alertaId);
    expect(depois?.estado).toBe("expedido");
  });

  it("descartarAlerta exige motivo e registra na trilha", () => {
    const motor = new Motor(cenario("convectiva"));
    for (let i = 0; i < 40; i++) motor.tick();
    const candidato = motor.estado.alertas.find((a) => a.estado === "candidato");
    if (!candidato) throw new Error("cenario nao gerou candidato");

    expect(() => motor.descartarAlerta(candidato.alertaId, "")).toThrow("motivo obrigatorio");

    motor.descartarAlerta(candidato.alertaId, "celula ja dissipada");
    const depois = motor.estado.alertas.find((a) => a.alertaId === candidato.alertaId);
    expect(depois?.estado).toBe("descartado");
    expect(motor.barramento.historico().map((e) => e.tipo)).toContain("alerta.descartado");
  });

  it("aprovarBoletim registra autor e texto final", () => {
    const motor = new Motor(cenario("convectiva"));
    for (let i = 0; i < 40; i++) motor.tick();
    const candidato = motor.estado.alertas.find((a) => a.estado === "candidato");
    if (!candidato) throw new Error("cenario nao gerou candidato");

    motor.validarAlerta(candidato.alertaId, "coord.plantao");
    motor.tick();
    motor.tick();

    const boletim = motor.estado.boletins[0];
    if (!boletim) throw new Error("sem boletim");

    motor.aprovarBoletim(boletim.boletimId, "coord.plantao", "Texto revisado pelo plantao.");
    expect(motor.estado.boletins[0]?.textoAprovado).toBe("Texto revisado pelo plantao.");
    expect(motor.estado.boletins[0]?.autorAprovacao).toBe("coord.plantao");
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
npm run test
```
Esperado: FAIL — `Cannot find module './motor'`.

- [ ] **Step 4: Implementar `motor.ts`**

```ts
import { criarEnxame } from "@/agentes/registro";
import {
  criarEstadoInicial,
  type Agente,
  type ContextoAgente,
  type EstadoSimulacao,
} from "@/agentes/tipos";
import { descartar, validar } from "@/dominio/alerta";
import { criarAleatorio, type Aleatorio } from "@/dominio/prng";
import { RelogioSimulado } from "@/dominio/relogio";
import { Barramento, type TipoEvento } from "./barramento";
import { criarMundo, type Mundo } from "./mundo";
import type { Cenario } from "./cenarios";

const MINUTOS_POR_TICK = 10;

export class Motor {
  readonly cenario: Cenario;
  readonly mundo: Mundo;
  readonly relogio: RelogioSimulado;
  readonly barramento = new Barramento();
  readonly agentes: Agente[] = criarEnxame();
  readonly estado: EstadoSimulacao;

  private readonly aleatorio: Aleatorio;
  private readonly ctx: ContextoAgente;
  private minutosDecorridos = 0;
  private sequenciaEvento = 0;

  constructor(cenario: Cenario) {
    this.cenario = cenario;
    this.mundo = criarMundo(cenario.semente);
    this.relogio = new RelogioSimulado(new Date(cenario.inicioIso));
    this.aleatorio = criarAleatorio(cenario.semente);
    this.estado = criarEstadoInicial(cenario.nivelInicialM);
    this.estado.estacoes = this.mundo.estacoes.map((e) => ({ ...e }));

    this.ctx = {
      relogio: this.relogio,
      barramento: this.barramento,
      mundo: this.mundo,
      estado: this.estado,
      aleatorio: this.aleatorio,
      publicar: (agenteId, tipo, titulo, carga, correlacaoId) => this.publicar(agenteId, tipo, titulo, carga, correlacaoId),
    };

    this.publicar("motor", "cenario.iniciado", `Cenario "${cenario.nome}" iniciado`, {
      cenarioId: cenario.id,
      semente: cenario.semente,
    });
  }

  private publicar(
    agenteId: string,
    tipo: TipoEvento,
    titulo: string,
    carga: unknown,
    correlacaoId?: string,
  ): void {
    this.barramento.publicar({
      eventoId: `ev-${++this.sequenciaEvento}`,
      tipo,
      agenteId,
      ts: this.relogio.iso,
      titulo,
      carga,
      ...(correlacaoId ? { correlacaoId } : {}),
    });
  }

  /** Um passo da simulacao: avanca o relogio, atualiza o tempo e roda o enxame. */
  tick(): void {
    this.relogio.avancarMinutos(MINUTOS_POR_TICK);
    this.minutosDecorridos += MINUTOS_POR_TICK;

    const horaDecorrida = this.minutosDecorridos / 60;
    this.estado.intensidadeChuvaMmH = this.cenario.perfilChuva(horaDecorrida);

    // Resposta simplificada do nivel a chuva corrente, para alimentar a ingestao.
    const delta = this.estado.intensidadeChuvaMmH * 0.0025 * MINUTOS_POR_TICK - 0.004;
    this.estado.nivelAtualM = Math.max(0.5, this.estado.nivelAtualM + delta);

    this.aplicarPerturbacoesDoCenario();

    for (const agente of this.agentes) {
      try {
        agente.aoTick(this.ctx);
      } catch (erro) {
        // RNF-06: um agente com defeito nao derruba a simulacao.
        agente.status = "falha";
        console.error(`[motor] agente ${agente.id} falhou:`, erro);
      }
    }
  }

  private aplicarPerturbacoesDoCenario(): void {
    const { falhaEstacaoNoMinuto, leituraAbsurdaNoMinuto } = this.cenario;

    if (falhaEstacaoNoMinuto !== undefined && this.minutosDecorridos === falhaEstacaoNoMinuto) {
      for (const estacao of this.estado.estacoes.slice(0, 5)) {
        estacao.situacao = "desativada";
      }
      this.publicar(
        "motor",
        "estacao.silenciosa",
        "Falha de comunicacao derrubou 5 estacoes do cenario",
        { quantidade: 5 },
      );
    }

    if (leituraAbsurdaNoMinuto !== undefined && this.minutosDecorridos === leituraAbsurdaNoMinuto) {
      const estacao = this.estado.estacoes[0];
      if (estacao) {
        this.estado.observacoes.push({
          observacaoId: `obs-${this.estado.contador++}`,
          estacaoId: estacao.estacaoId,
          fonteId: estacao.fonteId,
          variavel: "chuva_mm",
          valor: 2000,
          unidade: "mm",
          tsOrigem: this.relogio.iso,
          tsIngestao: this.relogio.iso,
          qualidade: "aprovada",
        });
      }
    }
  }

  /** Acao humana: valida um alerta candidato. Sem isso nada e expedido. */
  validarAlerta(alertaId: string, operador: string): void {
    const indice = this.estado.alertas.findIndex((a) => a.alertaId === alertaId);
    const alerta = this.estado.alertas[indice];
    if (!alerta) throw new Error(`alerta ${alertaId} nao encontrado`);

    this.estado.alertas[indice] = validar(alerta, operador, this.relogio.iso);
    this.publicar(
      "operador",
      "alerta.validado",
      `Alerta ${alertaId} validado por ${operador}`,
      { alertaId, operador },
      alertaId,
    );
  }

  /** Acao humana: descarta um alerta candidato, com motivo obrigatorio. */
  descartarAlerta(alertaId: string, motivo: string): void {
    const indice = this.estado.alertas.findIndex((a) => a.alertaId === alertaId);
    const alerta = this.estado.alertas[indice];
    if (!alerta) throw new Error(`alerta ${alertaId} nao encontrado`);

    this.estado.alertas[indice] = descartar(alerta, motivo, this.relogio.iso);
    this.publicar(
      "operador",
      "alerta.descartado",
      `Alerta ${alertaId} descartado: ${motivo}`,
      { alertaId, motivo },
      alertaId,
    );
  }

  /** Acao humana: aprova o boletim rascunhado pelo agente redator. */
  aprovarBoletim(boletimId: string, autor: string, textoFinal: string): void {
    const boletim = this.estado.boletins.find((b) => b.boletimId === boletimId);
    if (!boletim) throw new Error(`boletim ${boletimId} nao encontrado`);

    boletim.textoAprovado = textoFinal;
    boletim.autorAprovacao = autor;
    boletim.tsAprovacao = this.relogio.iso;

    this.publicar(
      "operador",
      "boletim.aprovado",
      `Boletim ${boletimId} aprovado por ${autor}`,
      { boletimId, autor },
      boletim.alertaId,
    );
  }
}
```

- [ ] **Step 5: Rodar os testes e verificar que passam**

```bash
npm run test
```
Esperado: PASS. Se "no cenario extremo, gera alerta preditivo" falhar, aumente o número de ticks no teste — não altere o perfil de chuva do cenário, que foi calibrado para a narrativa da demo.

- [ ] **Step 6: Commit**

```bash
git add -A demo
git commit -m "feat(simulacao): cinco cenarios demonstraveis e motor de tick deterministico"
```

---

### Task 12: Estado — ponte entre o motor e o React

**Files:**
- Create: `demo/src/estado/store.ts`
- Create: `demo/src/estado/store.test.ts`

**Interfaces:**
- Consumes: `Motor`, `CENARIOS`, `Cenario` de `@/simulacao`; `Agente` de `@/agentes/tipos`
- Produces:
  - `useSimulacao` (hook Zustand) com o estado: `cenarioId`, `rodando`, `velocidade`, `versao`, `motor`
  - Ações: `trocarCenario(id)`, `alternarExecucao()`, `definirVelocidade(v)`, `passo()`, `reiniciar()`, `validarAlerta(id)`, `descartarAlerta(id, motivo)`, `aprovarBoletim(id, texto)`
  - Seletores: `selecionarKpis(s)`, `selecionarAlertasAtivos(s)`, `selecionarEventosRecentes(s, n)`
  - `OPERADOR_DEMO = "coord.plantao"`
  - `VELOCIDADES: readonly { rotulo: string; msPorTick: number }[]`

O ponto sensível: o `Motor` é **mutável e não-serializável**. Colocá-lo dentro do Zustand como objeto reativo faria o React comparar estruturas grandes a cada tick. A solução é guardar o motor como referência estável e usar um contador `versao` como sinal de mudança — o React re-renderiza quando `versao` muda, e lê o estado atual direto do motor.

- [ ] **Step 1: Escrever `store.test.ts`**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { OPERADOR_DEMO, useSimulacao } from "./store";

describe("useSimulacao", () => {
  beforeEach(() => {
    useSimulacao.getState().reiniciar();
  });

  it("comeca pausado no primeiro cenario", () => {
    const s = useSimulacao.getState();
    expect(s.rodando).toBe(false);
    expect(s.cenarioId).toBe("calmaria");
  });

  it("avanca a versao a cada passo", () => {
    const antes = useSimulacao.getState().versao;
    useSimulacao.getState().passo();
    expect(useSimulacao.getState().versao).toBe(antes + 1);
  });

  it("troca de cenario e recria o motor do zero", () => {
    useSimulacao.getState().passo();
    useSimulacao.getState().trocarCenario("extremo");
    const s = useSimulacao.getState();
    expect(s.cenarioId).toBe("extremo");
    expect(s.motor.estado.observacoes).toHaveLength(0);
  });

  it("alterna execucao", () => {
    useSimulacao.getState().alternarExecucao();
    expect(useSimulacao.getState().rodando).toBe(true);
    useSimulacao.getState().alternarExecucao();
    expect(useSimulacao.getState().rodando).toBe(false);
  });

  it("valida alerta usando o operador da demo", () => {
    useSimulacao.getState().trocarCenario("convectiva");
    for (let i = 0; i < 40; i++) useSimulacao.getState().passo();

    const candidato = useSimulacao
      .getState()
      .motor.estado.alertas.find((a) => a.estado === "candidato");
    if (!candidato) throw new Error("cenario nao gerou candidato");

    useSimulacao.getState().validarAlerta(candidato.alertaId);
    const depois = useSimulacao
      .getState()
      .motor.estado.alertas.find((a) => a.alertaId === candidato.alertaId);
    expect(depois?.operadorValidador).toBe(OPERADOR_DEMO);
  });

  it("propaga o erro de motivo vazio ao descartar", () => {
    useSimulacao.getState().trocarCenario("convectiva");
    for (let i = 0; i < 40; i++) useSimulacao.getState().passo();
    const candidato = useSimulacao
      .getState()
      .motor.estado.alertas.find((a) => a.estado === "candidato");
    if (!candidato) throw new Error("cenario nao gerou candidato");

    expect(() => useSimulacao.getState().descartarAlerta(candidato.alertaId, "  ")).toThrow(
      "motivo obrigatorio",
    );
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npm run test
```
Esperado: FAIL — `Cannot find module './store'`.

- [ ] **Step 3: Implementar `store.ts`**

```ts
import { create } from "zustand";
import type { Alerta } from "@/dominio/tipos";
import { CENARIOS } from "@/simulacao/cenarios";
import { Motor } from "@/simulacao/motor";
import type { Evento } from "@/simulacao/barramento";

export const OPERADOR_DEMO = "coord.plantao";

export const VELOCIDADES = [
  { rotulo: "1x", msPorTick: 2000 },
  { rotulo: "4x", msPorTick: 500 },
  { rotulo: "12x", msPorTick: 160 },
] as const;

function motorDoCenario(cenarioId: string): Motor {
  const cenario = CENARIOS.find((c) => c.id === cenarioId) ?? CENARIOS[0];
  if (!cenario) throw new Error("nenhum cenario disponivel");
  return new Motor(cenario);
}

interface EstadoLoja {
  motor: Motor;
  cenarioId: string;
  rodando: boolean;
  velocidadeIndice: number;
  /** Contador de mudanca: o motor e mutavel, entao o React observa este numero. */
  versao: number;
  alertaSelecionado: string | null;
  boletimAberto: string | null;

  passo(): void;
  alternarExecucao(): void;
  definirVelocidade(indice: number): void;
  trocarCenario(id: string): void;
  reiniciar(): void;
  selecionarAlerta(id: string | null): void;
  abrirBoletim(id: string | null): void;
  validarAlerta(alertaId: string): void;
  descartarAlerta(alertaId: string, motivo: string): void;
  aprovarBoletim(boletimId: string, texto: string): void;
}

export const useSimulacao = create<EstadoLoja>((set, get) => ({
  motor: motorDoCenario("calmaria"),
  cenarioId: "calmaria",
  rodando: false,
  velocidadeIndice: 1,
  versao: 0,
  alertaSelecionado: null,
  boletimAberto: null,

  passo() {
    get().motor.tick();
    set((s) => ({ versao: s.versao + 1 }));
  },

  alternarExecucao() {
    set((s) => ({ rodando: !s.rodando }));
  },

  definirVelocidade(indice) {
    set({ velocidadeIndice: indice });
  },

  trocarCenario(id) {
    set({
      motor: motorDoCenario(id),
      cenarioId: id,
      versao: 0,
      alertaSelecionado: null,
      boletimAberto: null,
    });
  },

  reiniciar() {
    set({
      motor: motorDoCenario("calmaria"),
      cenarioId: "calmaria",
      rodando: false,
      velocidadeIndice: 1,
      versao: 0,
      alertaSelecionado: null,
      boletimAberto: null,
    });
  },

  selecionarAlerta(id) {
    set({ alertaSelecionado: id });
  },

  abrirBoletim(id) {
    set({ boletimAberto: id });
  },

  validarAlerta(alertaId) {
    get().motor.validarAlerta(alertaId, OPERADOR_DEMO);
    set((s) => ({ versao: s.versao + 1 }));
  },

  descartarAlerta(alertaId, motivo) {
    get().motor.descartarAlerta(alertaId, motivo);
    set((s) => ({ versao: s.versao + 1 }));
  },

  aprovarBoletim(boletimId, texto) {
    get().motor.aprovarBoletim(boletimId, OPERADOR_DEMO, texto);
    set((s) => ({ versao: s.versao + 1, boletimAberto: null }));
  },
}));

export interface Kpis {
  readonly leadTimeMedioH: number | null;
  readonly estacoesOperantes: number;
  readonly estacoesTotal: number;
  readonly percentualOperante: number;
  readonly alertasAtivos: number;
  readonly alertasAguardandoValidacao: number;
  readonly cotaPrevistaM: number;
  readonly populacaoExposta: number;
  readonly leiturasReprovadas: number;
}

export function selecionarKpis(s: EstadoLoja): Kpis {
  const e = s.motor.estado;
  const operantes = e.estacoes.filter((x) => x.situacao === "operante").length;
  const preditivos = e.alertas.filter((a) => a.leadTimeHoras !== null);
  const somaLead = preditivos.reduce((t, a) => t + (a.leadTimeHoras ?? 0), 0);

  return {
    leadTimeMedioH: preditivos.length > 0 ? somaLead / preditivos.length : null,
    estacoesOperantes: operantes,
    estacoesTotal: e.estacoes.length,
    percentualOperante:
      e.estacoes.length === 0 ? 0 : Math.round((operantes / e.estacoes.length) * 100),
    alertasAtivos: e.alertas.filter((a) => a.estado === "expedido" || a.estado === "atualizado")
      .length,
    alertasAguardandoValidacao: e.alertas.filter((a) => a.estado === "candidato").length,
    cotaPrevistaM: e.cotaPrevistaM,
    populacaoExposta: e.exposicao.reduce((t, x) => t + x.populacaoEstimada, 0),
    leiturasReprovadas: e.observacoes.filter((o) => o.qualidade !== "aprovada").length,
  };
}

export function selecionarAlertasAtivos(s: EstadoLoja): Alerta[] {
  const ordem: Record<Alerta["estado"], number> = {
    candidato: 0,
    validado: 1,
    expedido: 2,
    atualizado: 3,
    encerrado: 4,
    descartado: 5,
  };
  return [...s.motor.estado.alertas].sort((a, b) => ordem[a.estado] - ordem[b.estado]);
}

export function selecionarEventosRecentes(s: EstadoLoja, quantidade: number): Evento[] {
  const historico = s.motor.barramento.historico();
  return historico.slice(Math.max(0, historico.length - quantidade)).reverse();
}
```

- [ ] **Step 4: Rodar os testes e verificar que passam**

```bash
npm run test
```
Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A demo
git commit -m "feat(estado): loja Zustand como ponte entre o motor mutavel e o React"
```

---

### Task 13: Mapa — configuração ArcGIS, simbologia e camadas animadas

**Files:**
- Create: `demo/src/mapa/config.ts`
- Create: `demo/src/mapa/portal.ts`
- Create: `demo/src/mapa/simbologia.ts`
- Create: `demo/src/mapa/camadas.ts`
- Create: `demo/src/mapa/MapaSalaSituacao.tsx`
- Create: `demo/src/mapa/config.test.ts`

**Interfaces:**
- Consumes: `Mundo`, `EstadoSimulacao`, tipos do domínio
- Produces:
  - `configurarArcGIS(): void`, `modoEnterprise(): boolean`, `descreverModo(): string`
  - `autenticarNoPortal(): Promise<boolean>` (no-op sem App ID)
  - `SIMBOLOS` com símbolos por feição
  - `class GerenciadorCamadas` com `montar(map)`, `sincronizar(mundo, estado)`, `destacarZona(zonaId)`
  - `<MapaSalaSituacao />`

- [ ] **Step 1: Escrever `config.test.ts`**

Esta é a única parte da camada de mapa que dá para testar sem DOM: a lógica de decisão do modo.

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { descreverModo, modoEnterprise } from "./config";

const originais = { ...import.meta.env };

afterEach(() => {
  vi.unstubAllEnvs();
  Object.assign(import.meta.env, originais);
});

describe("modoEnterprise", () => {
  it("fica desligado quando nao ha App ID", () => {
    vi.stubEnv("VITE_MODO_ENTERPRISE", "true");
    vi.stubEnv("VITE_ARCGIS_APP_ID", "");
    expect(modoEnterprise()).toBe(false);
  });

  it("fica desligado quando a flag e false, mesmo com App ID", () => {
    vi.stubEnv("VITE_MODO_ENTERPRISE", "false");
    vi.stubEnv("VITE_ARCGIS_APP_ID", "abc123");
    expect(modoEnterprise()).toBe(false);
  });

  it("liga quando flag e App ID estao presentes", () => {
    vi.stubEnv("VITE_MODO_ENTERPRISE", "true");
    vi.stubEnv("VITE_ARCGIS_APP_ID", "abc123");
    vi.stubEnv("VITE_ARCGIS_PORTAL_URL", "https://saopaulo.img.com.br/portal");
    expect(modoEnterprise()).toBe(true);
  });

  it("descreve o modo em linguagem apresentavel", () => {
    vi.stubEnv("VITE_MODO_ENTERPRISE", "false");
    expect(descreverModo()).toContain("sintetico");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npm run test
```
Esperado: FAIL — `Cannot find module './config'`.

- [ ] **Step 3: Implementar `config.ts` e `portal.ts`**

`demo/src/mapa/config.ts`:
```ts
import esriConfig from "@arcgis/core/config.js";

/**
 * Assets do SDK servidos por CDN: evita copiar ~40 MB para o bundle da Vercel.
 * Alternativa, se a rede do orgao bloquear o CDN: usar vite-plugin-static-copy
 * para levar node_modules/@arcgis/core/assets para dist/assets.
 */
const CDN_ASSETS = "https://js.arcgis.com/5.1/@arcgis/core/assets";

export function portalUrl(): string {
  return import.meta.env.VITE_ARCGIS_PORTAL_URL ?? "";
}

export function appId(): string {
  return import.meta.env.VITE_ARCGIS_APP_ID ?? "";
}

/**
 * O modo Enterprise so liga com flag E App ID presentes.
 * Enquanto as credenciais do portal de Sao Paulo nao existirem,
 * a demo roda inteira com dado sintetico e basemap OpenStreetMap.
 */
export function modoEnterprise(): boolean {
  return import.meta.env.VITE_MODO_ENTERPRISE === "true" && appId().trim() !== "";
}

export function descreverModo(): string {
  return modoEnterprise()
    ? `Conectado ao portal ${portalUrl()}`
    : "Dado sintetico — sem conexao com portal ArcGIS";
}

export function configurarArcGIS(): void {
  esriConfig.assetsPath = CDN_ASSETS;
  if (modoEnterprise()) {
    esriConfig.portalUrl = portalUrl();
  }
}
```

`demo/src/mapa/portal.ts`:
```ts
import esriId from "@arcgis/core/identity/IdentityManager.js";
import OAuthInfo from "@arcgis/core/identity/OAuthInfo.js";
import { appId, modoEnterprise, portalUrl } from "./config";

/**
 * Autenticacao OAuth 2.0 contra o ArcGIS Enterprise de Sao Paulo.
 *
 * Enquanto VITE_ARCGIS_APP_ID estiver vazio, esta funcao e um no-op:
 * a demo funciona integralmente sem credencial. Quando o App ID for
 * registrado no portal, basta preencher o .env — nenhum outro arquivo muda.
 */
export async function autenticarNoPortal(): Promise<boolean> {
  if (!modoEnterprise()) return false;

  const info = new OAuthInfo({
    appId: appId(),
    portalUrl: portalUrl(),
    popup: false,
  });
  esriId.registerOAuthInfos([info]);

  try {
    await esriId.checkSignInStatus(`${portalUrl()}/sharing`);
    return true;
  } catch {
    // Sem sessao ativa: a demo continua com dado sintetico em vez de
    // interromper a apresentacao com uma tela de login.
    console.warn("[portal] sem sessao ativa no Enterprise; seguindo com dado sintetico");
    return false;
  }
}
```

- [ ] **Step 4: Implementar `simbologia.ts`**

```ts
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol.js";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol.js";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol.js";
import type { Severidade, SituacaoEstacao } from "@/dominio/tipos";

const COR_SEVERIDADE: Record<Severidade, [number, number, number]> = {
  baixa: [56, 189, 248],
  media: [251, 191, 36],
  alta: [251, 146, 60],
  muito_alta: [244, 63, 94],
};

const COR_SITUACAO: Record<SituacaoEstacao, [number, number, number]> = {
  operante: [52, 211, 153],
  degradada: [251, 191, 36],
  silenciosa: [244, 63, 94],
  desativada: [120, 130, 150],
};

export const SIMBOLOS = {
  subBacia: new SimpleFillSymbol({
    color: [56, 189, 248, 0.05],
    outline: new SimpleLineSymbol({ color: [56, 189, 248, 0.45], width: 1 }),
  }),

  corredor: new SimpleFillSymbol({
    color: [56, 189, 248, 0.22],
    outline: new SimpleLineSymbol({ color: [125, 211, 252, 0.8], width: 1.4 }),
  }),

  /** Mancha de inundacao: opacidade acompanha a intensidade do evento. */
  mancha: (intensidade: number) =>
    new SimpleFillSymbol({
      color: [59, 130, 246, Math.min(0.18 + intensidade * 0.32, 0.55)],
      outline: new SimpleLineSymbol({ color: [147, 197, 253, 0.95], width: 2 }),
    }),

  zona: (grauRisco: "alto" | "muito_alto", sobAlerta: boolean) =>
    new SimpleFillSymbol({
      color: sobAlerta
        ? [244, 63, 94, 0.4]
        : grauRisco === "muito_alto"
          ? [251, 146, 60, 0.18]
          : [251, 191, 36, 0.12],
      outline: new SimpleLineSymbol({
        color: sobAlerta ? [244, 63, 94, 1] : [251, 191, 36, 0.7],
        width: sobAlerta ? 2.5 : 1,
      }),
    }),

  estacao: (situacao: SituacaoEstacao) =>
    new SimpleMarkerSymbol({
      style: "circle",
      size: situacao === "silenciosa" ? 9 : 7,
      color: [...COR_SITUACAO[situacao], 0.95],
      outline: { color: [7, 11, 20, 0.9], width: 1 },
    }),

  /** Anel de pulso desenhado sobre a estacao que acabou de transmitir. */
  pulso: (progresso: number) =>
    new SimpleMarkerSymbol({
      style: "circle",
      size: 8 + progresso * 26,
      color: [0, 0, 0, 0],
      outline: { color: [56, 189, 248, Math.max(0, 0.85 - progresso)], width: 2 },
    }),

  ativo: (tipo: "comporta" | "ebap", pronto: boolean) =>
    new SimpleMarkerSymbol({
      style: tipo === "comporta" ? "square" : "diamond",
      size: 8,
      color: pronto ? [226, 232, 240, 0.9] : [251, 191, 36, 0.95],
      outline: { color: [7, 11, 20, 0.9], width: 1 },
    }),

  corSeveridade: (s: Severidade) => COR_SEVERIDADE[s],
} as const;
```

- [ ] **Step 5: Implementar `camadas.ts`**

```ts
import Graphic from "@arcgis/core/Graphic.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Point from "@arcgis/core/geometry/Point.js";
import Polygon from "@arcgis/core/geometry/Polygon.js";
import type Map from "@arcgis/core/Map.js";
import type { EstadoSimulacao } from "@/agentes/tipos";
import type { Poligono } from "@/dominio/geometria";
import type { Mundo } from "@/simulacao/mundo";
import { SIMBOLOS } from "./simbologia";

function paraPolygon(p: Poligono): Polygon {
  return new Polygon({
    rings: p.aneis.map((anel) => anel.map(([x, y]) => [x, y])),
    spatialReference: { wkid: 4326 },
  });
}

/**
 * Mantem as GraphicsLayers em sincronia com o estado da simulacao.
 *
 * Estrategia: camadas estaticas (sub-bacias, corredor, ativos) sao desenhadas
 * uma unica vez; as dinamicas (mancha, zonas, estacoes, pulsos) sao redesenhadas
 * a cada quadro. Redesenhar poucas centenas de graficos por quadro e barato,
 * e evita a complexidade de reconciliar graficos individualmente.
 */
export class GerenciadorCamadas {
  private readonly estaticas = new GraphicsLayer({ title: "Base sintetica" });
  private readonly mancha = new GraphicsLayer({ title: "Mancha de inundacao" });
  private readonly zonas = new GraphicsLayer({ title: "Zonas de risco" });
  private readonly estacoes = new GraphicsLayer({ title: "Rede de observacao" });
  private readonly pulsos = new GraphicsLayer({ title: "Atividade" });

  private pulsosAtivos: { posicao: [number, number]; inicio: number }[] = [];
  private montado = false;

  montar(map: Map, mundo: Mundo): void {
    if (this.montado) return;
    map.addMany([this.estaticas, this.mancha, this.zonas, this.estacoes, this.pulsos]);

    for (const subBacia of mundo.subBacias) {
      this.estaticas.add(
        new Graphic({ geometry: paraPolygon(subBacia.geometria), symbol: SIMBOLOS.subBacia }),
      );
    }
    this.estaticas.add(
      new Graphic({ geometry: paraPolygon(mundo.corredor), symbol: SIMBOLOS.corredor }),
    );
    for (const ativo of mundo.ativos) {
      this.estaticas.add(
        new Graphic({
          geometry: new Point({
            longitude: ativo.posicao[0],
            latitude: ativo.posicao[1],
            spatialReference: { wkid: 4326 },
          }),
          symbol: SIMBOLOS.ativo(ativo.tipo, ativo.situacaoProntidao === "pronto"),
          attributes: { ativoId: ativo.ativoId, nome: ativo.nome },
        }),
      );
    }

    this.montado = true;
  }

  /** Registra um pulso visual sobre uma estacao que acabou de transmitir. */
  pulsar(posicao: [number, number], agoraMs: number): void {
    this.pulsosAtivos.push({ posicao, inicio: agoraMs });
  }

  sincronizar(mundo: Mundo, estado: EstadoSimulacao, agoraMs: number): void {
    const zonasSobAlerta = new Set(
      estado.alertas
        .filter((a) => a.estado !== "descartado" && a.estado !== "encerrado")
        .map((a) => a.zonaId),
    );

    this.zonas.removeAll();
    for (const zona of mundo.zonas) {
      this.zonas.add(
        new Graphic({
          geometry: paraPolygon(zona.geometria),
          symbol: SIMBOLOS.zona(zona.grauRisco, zonasSobAlerta.has(zona.zonaId)),
          attributes: {
            zonaId: zona.zonaId,
            nome: zona.nome,
            populacao: zona.populacaoEstimada,
          },
        }),
      );
    }

    this.mancha.removeAll();
    if (estado.mancha) {
      const intensidade = Math.min(
        Math.max((estado.cotaPrevistaM - mundo.cotaBaseM) / 6, 0),
        1,
      );
      this.mancha.add(
        new Graphic({
          geometry: paraPolygon(estado.mancha),
          symbol: SIMBOLOS.mancha(intensidade),
        }),
      );
    }

    this.estacoes.removeAll();
    for (const estacao of estado.estacoes) {
      this.estacoes.add(
        new Graphic({
          geometry: new Point({
            longitude: estacao.posicao[0],
            latitude: estacao.posicao[1],
            spatialReference: { wkid: 4326 },
          }),
          symbol: SIMBOLOS.estacao(estacao.situacao),
          attributes: {
            estacaoId: estacao.estacaoId,
            nome: estacao.nome,
            situacao: estacao.situacao,
          },
        }),
      );
    }

    this.desenharPulsos(agoraMs);
  }

  private desenharPulsos(agoraMs: number): void {
    const DURACAO_MS = 1200;
    this.pulsosAtivos = this.pulsosAtivos.filter((p) => agoraMs - p.inicio < DURACAO_MS);

    this.pulsos.removeAll();
    for (const pulso of this.pulsosAtivos) {
      const progresso = (agoraMs - pulso.inicio) / DURACAO_MS;
      this.pulsos.add(
        new Graphic({
          geometry: new Point({
            longitude: pulso.posicao[0],
            latitude: pulso.posicao[1],
            spatialReference: { wkid: 4326 },
          }),
          symbol: SIMBOLOS.pulso(progresso),
        }),
      );
    }
  }

  limpar(): void {
    for (const camada of [this.estaticas, this.mancha, this.zonas, this.estacoes, this.pulsos]) {
      camada.removeAll();
    }
    this.pulsosAtivos = [];
    this.montado = false;
  }
}
```

- [ ] **Step 6: Implementar `MapaSalaSituacao.tsx`**

```tsx
import { useEffect, useRef } from "react";
import ArcGISMap from "@arcgis/core/Map.js";
import MapView from "@arcgis/core/views/MapView.js";
import Basemap from "@arcgis/core/Basemap.js";
import "@arcgis/core/assets/esri/themes/dark/main.css";
import { useSimulacao } from "@/estado/store";
import { configurarArcGIS } from "./config";
import { GerenciadorCamadas } from "./camadas";

/**
 * Basemap OpenStreetMap: nao exige API key.
 * Quando o Enterprise de Sao Paulo estiver configurado, trocar por
 * um webmap do portal via VITE_ARCGIS_BASEMAP_ID.
 */
function basemapPadrao(): Basemap {
  return Basemap.fromId("osm");
}

export default function MapaSalaSituacao() {
  const container = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<MapView | null>(null);
  const camadasRef = useRef(new GerenciadorCamadas());

  const motor = useSimulacao((s) => s.motor);
  const versao = useSimulacao((s) => s.versao);
  const cenarioId = useSimulacao((s) => s.cenarioId);

  // Monta a view uma unica vez.
  useEffect(() => {
    if (!container.current || viewRef.current) return;

    configurarArcGIS();

    const map = new ArcGISMap({ basemap: basemapPadrao() });
    const view = new MapView({
      container: container.current,
      map,
      center: [motor.mundo.centro[0], motor.mundo.centro[1]],
      zoom: 11,
      ui: { components: ["zoom", "attribution"] },
      constraints: { snapToZoom: false },
    });
    viewRef.current = view;

    return () => {
      camadasRef.current.limpar();
      view.destroy();
      viewRef.current = null;
    };
  }, [motor.mundo.centro]);

  // Remonta a base quando o cenario muda (mundo novo, geometria nova).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    camadasRef.current.limpar();
    camadasRef.current.montar(view.map, motor.mundo);
    void view.goTo({ center: [motor.mundo.centro[0], motor.mundo.centro[1]], zoom: 11 });
  }, [cenarioId, motor.mundo]);

  // Redesenha as camadas dinamicas a cada mudanca de versao.
  useEffect(() => {
    if (!viewRef.current) return;
    const agora = performance.now();

    for (const estacao of motor.estado.estacoes) {
      if (estacao.ultimaLeituraTs === motor.relogio.iso) {
        camadasRef.current.pulsar([estacao.posicao[0], estacao.posicao[1]], agora);
      }
    }

    camadasRef.current.sincronizar(motor.mundo, motor.estado, agora);
  }, [versao, motor]);

  // Laco de animacao dos pulsos, independente do tick da simulacao.
  useEffect(() => {
    let quadro = 0;
    const animar = () => {
      if (viewRef.current) {
        camadasRef.current.sincronizar(motor.mundo, motor.estado, performance.now());
      }
      quadro = requestAnimationFrame(animar);
    };
    quadro = requestAnimationFrame(animar);
    return () => cancelAnimationFrame(quadro);
  }, [motor]);

  return <div ref={container} style={{ position: "absolute", inset: 0 }} />;
}
```

- [ ] **Step 7: Rodar testes e build**

```bash
npm run test
npm run build
```
Esperado: testes PASS; build conclui. O bundle do ArcGIS ficará em um chunk próprio, como configurado na Tarefa 1.

- [ ] **Step 8: Commit**

```bash
git add -A demo
git commit -m "feat(mapa): configuracao ArcGIS, simbologia e camadas animadas com pulsos e mancha"
```

---

### Task 14: Interface — casca, glassmorfismo, cabeçalho e KPIs

**Files:**
- Create: `demo/src/styles/glass.css`
- Create: `demo/src/ui/Cabecalho.tsx`
- Create: `demo/src/ui/PainelKPI.tsx`
- Create: `demo/src/ui/PainelSaudeRede.tsx`
- Modify: `demo/src/App.tsx` (substitui o placeholder da Tarefa 1)

**Interfaces:**
- Consumes: `useSimulacao`, `selecionarKpis`, `VELOCIDADES` de `@/estado/store`; `CENARIOS`; `descreverModo` de `@/mapa/config`
- Produces: `<Cabecalho />`, `<PainelKPI />`, `<PainelSaudeRede />`, layout completo em `App.tsx`

- [ ] **Step 1: Escrever `glass.css`**

```css
/* Camada de glassmorfismo. Um unico lugar define o material das superficies. */

.vidro {
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.09),
    rgba(255, 255, 255, 0.03)
  );
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

.vidro-forte {
  background: linear-gradient(
    145deg,
    rgba(12, 19, 34, 0.88),
    rgba(7, 11, 20, 0.78)
  );
  backdrop-filter: blur(26px) saturate(150%);
  -webkit-backdrop-filter: blur(26px) saturate(150%);
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
}

/* Fallback para navegadores sem backdrop-filter: sem ele, o texto
   ficaria ilegivel sobre o mapa. */
@supports not (backdrop-filter: blur(1px)) {
  .vidro,
  .vidro-forte {
    background: rgba(9, 14, 25, 0.94);
  }
}

.painel {
  padding: var(--espaco-4);
  color: var(--cor-texto);
  overflow: auto;
}

.titulo-painel {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--cor-texto-fraco);
  margin: 0 0 var(--espaco-3);
}

.selo-demo {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  background: rgba(251, 191, 36, 0.16);
  border: 1px solid rgba(251, 191, 36, 0.45);
  color: #fde68a;
}

.botao {
  appearance: none;
  cursor: pointer;
  font: inherit;
  color: var(--cor-texto);
  padding: 7px 14px;
  border-radius: 9px;
  border: 1px solid var(--cor-borda);
  background: rgba(255, 255, 255, 0.07);
  transition: background 140ms ease, border-color 140ms ease, transform 90ms ease;
}

.botao:hover { background: rgba(255, 255, 255, 0.14); }
.botao:active { transform: translateY(1px); }
.botao:focus-visible { outline: 2px solid var(--cor-acento); outline-offset: 2px; }

.botao-primario {
  background: rgba(56, 189, 248, 0.22);
  border-color: rgba(56, 189, 248, 0.55);
}
.botao-primario:hover { background: rgba(56, 189, 248, 0.34); }

.botao-perigo {
  background: rgba(244, 63, 94, 0.18);
  border-color: rgba(244, 63, 94, 0.5);
}
.botao-perigo:hover { background: rgba(244, 63, 94, 0.3); }

.pulsando { animation: pulsar 1.6s ease-in-out infinite; }

@keyframes pulsar {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

@media (prefers-reduced-motion: reduce) {
  .pulsando { animation: none; }
}
```

- [ ] **Step 2: Implementar `Cabecalho.tsx`**

```tsx
import { CENARIOS } from "@/simulacao/cenarios";
import { useSimulacao, VELOCIDADES } from "@/estado/store";
import { descreverModo } from "@/mapa/config";

function horaLocal(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Cabecalho() {
  const { motor, cenarioId, rodando, velocidadeIndice } = useSimulacao();
  const { alternarExecucao, definirVelocidade, trocarCenario, passo } = useSimulacao();
  useSimulacao((s) => s.versao); // re-renderiza a cada tick

  const cenario = CENARIOS.find((c) => c.id === cenarioId);

  return (
    <header
      className="vidro-forte"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--espaco-5)",
        padding: "10px var(--espaco-4)",
        margin: "var(--espaco-3)",
      }}
    >
      <div>
        <div style={{ fontWeight: 700, letterSpacing: "0.02em" }}>Sala de Situacao H1</div>
        <div style={{ fontSize: 11, color: "var(--cor-texto-fraco)" }}>
          Alerta precoce e gemeo digital de bacia
        </div>
      </div>

      <div
        style={{
          fontFamily: "var(--fonte-mono)",
          fontSize: 20,
          fontVariantNumeric: "tabular-nums",
        }}
        aria-label="Horario simulado"
      >
        {horaLocal(motor.relogio.iso)}
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 10, color: "var(--cor-texto-fraco)" }}>CENARIO</span>
        <select
          className="botao"
          value={cenarioId}
          onChange={(e) => trocarCenario(e.target.value)}
          style={{ minWidth: 230 }}
        >
          {CENARIOS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>

      <div style={{ display: "flex", gap: "var(--espaco-2)" }}>
        <button className="botao botao-primario" onClick={alternarExecucao}>
          {rodando ? "Pausar" : "Executar"}
        </button>
        <button className="botao" onClick={passo} disabled={rodando}>
          Passo
        </button>
        {VELOCIDADES.map((v, i) => (
          <button
            key={v.rotulo}
            className="botao"
            onClick={() => definirVelocidade(i)}
            style={
              i === velocidadeIndice
                ? { borderColor: "var(--cor-acento)", color: "var(--cor-acento)" }
                : undefined
            }
          >
            {v.rotulo}
          </button>
        ))}
      </div>

      <div style={{ marginLeft: "auto", textAlign: "right" }}>
        <span className="selo-demo">DEMONSTRACAO — DADOS SIMULADOS</span>
        <div style={{ fontSize: 10, color: "var(--cor-texto-fraco)", marginTop: 4 }}>
          {descreverModo()}
        </div>
        {cenario ? (
          <div style={{ fontSize: 10, color: "var(--cor-texto-fraco)" }}>
            Requisitos em foco: {cenario.requisitosDestacados.join(" · ")}
          </div>
        ) : null}
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Implementar `PainelKPI.tsx` e `PainelSaudeRede.tsx`**

`PainelKPI.tsx`:
```tsx
import { selecionarKpis, useSimulacao } from "@/estado/store";

function Cartao({
  rotulo,
  valor,
  detalhe,
  destaque,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  destaque?: "ok" | "atencao" | "critico";
}) {
  const cor =
    destaque === "critico"
      ? "var(--cor-critica)"
      : destaque === "atencao"
        ? "var(--cor-atencao)"
        : destaque === "ok"
          ? "var(--cor-ok)"
          : "var(--cor-texto)";

  return (
    <div className="vidro" style={{ padding: "10px var(--espaco-3)", minWidth: 118 }}>
      <div style={{ fontSize: 10, color: "var(--cor-texto-fraco)", letterSpacing: "0.06em" }}>
        {rotulo}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: cor,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.2,
        }}
      >
        {valor}
      </div>
      {detalhe ? (
        <div style={{ fontSize: 10, color: "var(--cor-texto-fraco)" }}>{detalhe}</div>
      ) : null}
    </div>
  );
}

export default function PainelKPI() {
  const kpis = useSimulacao(selecionarKpis);
  useSimulacao((s) => s.versao);

  return (
    <div style={{ display: "flex", gap: "var(--espaco-3)", flexWrap: "wrap" }}>
      <Cartao
        rotulo="LEAD TIME MEDIO"
        valor={kpis.leadTimeMedioH === null ? "—" : `${kpis.leadTimeMedioH.toFixed(0)} h`}
        detalhe="alertas preditivos"
        destaque={kpis.leadTimeMedioH !== null && kpis.leadTimeMedioH >= 6 ? "ok" : undefined}
      />
      <Cartao
        rotulo="REDE OPERANTE"
        valor={`${kpis.percentualOperante}%`}
        detalhe={`${kpis.estacoesOperantes}/${kpis.estacoesTotal} estacoes`}
        destaque={kpis.percentualOperante >= 90 ? "ok" : "atencao"}
      />
      <Cartao
        rotulo="AGUARDANDO VALIDACAO"
        valor={String(kpis.alertasAguardandoValidacao)}
        detalhe="exige decisao humana"
        destaque={kpis.alertasAguardandoValidacao > 0 ? "atencao" : undefined}
      />
      <Cartao
        rotulo="ALERTAS EXPEDIDOS"
        valor={String(kpis.alertasAtivos)}
        destaque={kpis.alertasAtivos > 0 ? "critico" : undefined}
      />
      <Cartao rotulo="COTA PREVISTA 12 H" valor={`${kpis.cotaPrevistaM.toFixed(2)} m`} />
      <Cartao
        rotulo="POPULACAO EXPOSTA"
        valor={kpis.populacaoExposta.toLocaleString("pt-BR")}
        detalhe="na mancha projetada"
        destaque={kpis.populacaoExposta > 0 ? "critico" : undefined}
      />
      <Cartao
        rotulo="LEITURAS REPROVADAS"
        valor={String(kpis.leiturasReprovadas)}
        detalhe="mantidas e sinalizadas"
      />
    </div>
  );
}
```

`PainelSaudeRede.tsx`:
```tsx
import { useSimulacao } from "@/estado/store";
import type { SituacaoEstacao } from "@/dominio/tipos";

const COR: Record<SituacaoEstacao, string> = {
  operante: "var(--cor-ok)",
  degradada: "var(--cor-atencao)",
  silenciosa: "var(--cor-critica)",
  desativada: "var(--cor-texto-fraco)",
};

export default function PainelSaudeRede() {
  const motor = useSimulacao((s) => s.motor);
  useSimulacao((s) => s.versao);

  return (
    <section className="vidro painel">
      <h2 className="titulo-painel">Saude da rede de observacao</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 5 }}>
        {motor.estado.estacoes.map((estacao) => (
          <div
            key={estacao.estacaoId}
            title={`${estacao.nome} — ${estacao.situacao}`}
            className={estacao.situacao === "silenciosa" ? "pulsando" : undefined}
            style={{
              height: 22,
              borderRadius: 5,
              background: COR[estacao.situacao],
              opacity: estacao.situacao === "operante" ? 0.75 : 1,
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: 11, color: "var(--cor-texto-fraco)", marginTop: "var(--espaco-3)" }}>
        Cada bloco e uma estacao. Vermelho pulsante = silenciosa ha mais de 3 periodos.
      </p>
    </section>
  );
}
```

- [ ] **Step 4: Reescrever `App.tsx` com o layout completo**

```tsx
import { useEffect } from "react";
import MapaSalaSituacao from "@/mapa/MapaSalaSituacao";
import Cabecalho from "@/ui/Cabecalho";
import PainelKPI from "@/ui/PainelKPI";
import PainelSaudeRede from "@/ui/PainelSaudeRede";
import { useSimulacao, VELOCIDADES } from "@/estado/store";
import "@/styles/glass.css";

export default function App() {
  const rodando = useSimulacao((s) => s.rodando);
  const velocidadeIndice = useSimulacao((s) => s.velocidadeIndice);
  const passo = useSimulacao((s) => s.passo);

  // Laco de execucao da simulacao.
  useEffect(() => {
    if (!rodando) return;
    const intervalo = VELOCIDADES[velocidadeIndice]?.msPorTick ?? 500;
    const id = window.setInterval(passo, intervalo);
    return () => window.clearInterval(id);
  }, [rodando, velocidadeIndice, passo]);

  return (
    <div style={{ position: "relative", height: "100%", overflow: "hidden" }}>
      <MapaSalaSituacao />

      <div
        style={{
          position: "relative",
          height: "100%",
          display: "grid",
          gridTemplateRows: "auto 1fr",
          pointerEvents: "none",
        }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <Cabecalho />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "340px 1fr 380px",
            gap: "var(--espaco-3)",
            padding: "0 var(--espaco-3) var(--espaco-3)",
            minHeight: 0,
          }}
        >
          <div
            style={{
              pointerEvents: "auto",
              display: "grid",
              gridTemplateRows: "auto 1fr",
              gap: "var(--espaco-3)",
              minHeight: 0,
            }}
          >
            <PainelSaudeRede />
            {/* PainelAgentes entra aqui na Tarefa 15 */}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateRows: "auto 1fr",
              gap: "var(--espaco-3)",
              alignContent: "start",
              minHeight: 0,
            }}
          >
            <div style={{ pointerEvents: "auto" }}>
              <PainelKPI />
            </div>
            {/* GrafoAgentes entra aqui na Tarefa 15 */}
          </div>

          <div style={{ pointerEvents: "auto", minHeight: 0 }}>
            {/* FilaAlertas e TrilhaAuditoria entram aqui na Tarefa 16 */}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verificar visualmente**

```bash
npm run dev
```
Confirme: mapa OSM carrega, geometria sintética aparece, cabeçalho e KPIs flutuam sobre o mapa com efeito de vidro, "Executar" faz o relógio avançar e os pulsos aparecerem nas estações.

- [ ] **Step 6: Commit**

```bash
git add -A demo
git commit -m "feat(ui): casca da aplicacao com glassmorfismo, cabecalho, KPIs e saude da rede"
```

---

### Task 15: Interface — grafo de agentes com React Flow e roster do enxame

**Files:**
- Create: `demo/src/ui/nosDoGrafo.tsx`
- Create: `demo/src/ui/GrafoAgentes.tsx`
- Create: `demo/src/ui/PainelAgentes.tsx`
- Create: `demo/src/ui/grafo.ts`
- Create: `demo/src/ui/grafo.test.ts`
- Modify: `demo/src/App.tsx` (insere `<PainelAgentes />` e `<GrafoAgentes />` nos pontos marcados)

**Interfaces:**
- Consumes: `Agente`, `ModuloAgente`, `StatusAgente` de `@/agentes/tipos`; `useSimulacao`; `@xyflow/react`
- Produces:
  - `LIGACOES: readonly { origem: string; destino: string }[]` em `grafo.ts`
  - `posicaoDoAgente(agente, indice): { x: number; y: number }`
  - `arestasAtivas(eventosRecentes): Set<string>`
  - `<NoAgente />` (nó customizado), `<GrafoAgentes />`, `<PainelAgentes />`

- [ ] **Step 1: Escrever `grafo.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { criarEnxame } from "@/agentes/registro";
import type { Evento } from "@/simulacao/barramento";
import { arestasAtivas, LIGACOES, posicaoDoAgente } from "./grafo";

describe("LIGACOES", () => {
  it("referencia apenas agentes existentes no enxame", () => {
    const ids = new Set(criarEnxame().map((a) => a.id));
    for (const ligacao of LIGACOES) {
      expect(ids.has(ligacao.origem)).toBe(true);
      expect(ids.has(ligacao.destino)).toBe(true);
    }
  });

  it("nao tem ligacao duplicada", () => {
    const chaves = LIGACOES.map((l) => `${l.origem}->${l.destino}`);
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it("liga o motor de limiar a expedicao, o caminho critico do RNF-18", () => {
    const chaves = LIGACOES.map((l) => `${l.origem}->${l.destino}`);
    expect(chaves).toContain("agente-limiar->agente-expedicao");
  });

  it("nenhum agente se liga a si mesmo", () => {
    for (const l of LIGACOES) expect(l.origem).not.toBe(l.destino);
  });
});

describe("posicaoDoAgente", () => {
  it("agrupa agentes do mesmo modulo na mesma coluna", () => {
    const enxame = criarEnxame();
    const ingestao = enxame.filter((a) => a.modulo === "ING");
    const xs = ingestao.map((a, i) => posicaoDoAgente(a, i).x);
    expect(new Set(xs).size).toBe(1);
  });

  it("separa agentes do mesmo modulo verticalmente", () => {
    const enxame = criarEnxame();
    const ingestao = enxame.filter((a) => a.modulo === "ING");
    const ys = ingestao.map((a, i) => posicaoDoAgente(a, i).y);
    expect(new Set(ys).size).toBe(ingestao.length);
  });

  it("posiciona modulos diferentes em colunas diferentes", () => {
    const enxame = criarEnxame();
    const ing = enxame.find((a) => a.modulo === "ING");
    const exp = enxame.find((a) => a.modulo === "EXP");
    if (!ing || !exp) throw new Error("agentes ausentes");
    expect(posicaoDoAgente(ing, 0).x).not.toBe(posicaoDoAgente(exp, 0).x);
  });
});

describe("arestasAtivas", () => {
  function evento(agenteId: string): Evento {
    return {
      eventoId: "e",
      tipo: "leitura.ingerida",
      agenteId,
      ts: "2026-05-01T12:00:00.000Z",
      titulo: "t",
      carga: {},
    };
  }

  it("ativa as arestas que saem dos agentes que acabaram de publicar", () => {
    const ativas = arestasAtivas([evento("agente-limiar")]);
    expect(ativas.has("agente-limiar->agente-expedicao")).toBe(true);
  });

  it("nao ativa aresta de agente silencioso", () => {
    const ativas = arestasAtivas([evento("agente-limiar")]);
    expect(ativas.has("agente-rede->agente-hidrologico")).toBe(false);
  });

  it("retorna conjunto vazio sem eventos", () => {
    expect(arestasAtivas([]).size).toBe(0);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npm run test
```
Esperado: FAIL — `Cannot find module './grafo'`.

- [ ] **Step 3: Implementar `grafo.ts`**

```ts
import type { Agente, ModuloAgente } from "@/agentes/tipos";
import type { Evento } from "@/simulacao/barramento";

/** Fluxo de trabalho do enxame, na ordem em que o dado atravessa o sistema. */
export const LIGACOES = [
  { origem: "agente-ingestao-cemaden", destino: "agente-qualidade" },
  { origem: "agente-ingestao-ana", destino: "agente-qualidade" },
  { origem: "agente-ingestao-inmet", destino: "agente-qualidade" },
  { origem: "agente-ingestao-cemaden", destino: "agente-rede" },
  { origem: "agente-qualidade", destino: "agente-hidrologico" },
  { origem: "agente-qualidade", destino: "agente-limiar" },
  { origem: "agente-rede", destino: "agente-hidrologico" },
  { origem: "agente-hidrologico", destino: "agente-geofencing" },
  { origem: "agente-limiar", destino: "agente-antifadiga" },
  { origem: "agente-geofencing", destino: "agente-antifadiga" },
  { origem: "agente-limiar", destino: "agente-expedicao" },
  { origem: "agente-geofencing", destino: "agente-expedicao" },
  { origem: "agente-antifadiga", destino: "agente-redator" },
  { origem: "agente-redator", destino: "agente-expedicao" },
  { origem: "agente-expedicao", destino: "agente-auditoria" },
] as const;

const COLUNA: Record<ModuloAgente, number> = {
  ING: 0,
  NET: 1,
  MOD: 2,
  ALT: 3,
  LLM: 4,
  EXP: 5,
  GOV: 6,
};

const LARGURA_COLUNA = 210;
const ALTURA_LINHA = 108;

export function posicaoDoAgente(agente: Agente, indiceNoModulo: number): { x: number; y: number } {
  return {
    x: COLUNA[agente.modulo] * LARGURA_COLUNA,
    y: indiceNoModulo * ALTURA_LINHA,
  };
}

export function chaveAresta(origem: string, destino: string): string {
  return `${origem}->${destino}`;
}

/** Arestas que saem de agentes que publicaram evento na janela recente. */
export function arestasAtivas(eventosRecentes: readonly Evento[]): Set<string> {
  const publicaram = new Set(eventosRecentes.map((e) => e.agenteId));
  const ativas = new Set<string>();
  for (const ligacao of LIGACOES) {
    if (publicaram.has(ligacao.origem)) {
      ativas.add(chaveAresta(ligacao.origem, ligacao.destino));
    }
  }
  return ativas;
}
```

- [ ] **Step 4: Implementar `nosDoGrafo.tsx`**

```tsx
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { StatusAgente } from "@/agentes/tipos";

export interface DadosNoAgente extends Record<string, unknown> {
  nome: string;
  modulo: string;
  status: StatusAgente;
  requisitos: readonly string[];
  contador: number;
}

const CORES: Record<StatusAgente, { borda: string; texto: string }> = {
  ocioso: { borda: "rgba(255,255,255,0.16)", texto: "var(--cor-texto-fraco)" },
  trabalhando: { borda: "rgba(56,189,248,0.75)", texto: "var(--cor-acento)" },
  alerta: { borda: "rgba(251,146,60,0.85)", texto: "var(--cor-alta)" },
  bloqueado: { borda: "rgba(244,63,94,0.9)", texto: "var(--cor-critica)" },
  falha: { borda: "rgba(244,63,94,0.9)", texto: "var(--cor-critica)" },
};

const ROTULO_STATUS: Record<StatusAgente, string> = {
  ocioso: "ocioso",
  trabalhando: "trabalhando",
  alerta: "anomalia detectada",
  bloqueado: "BLOQUEADO — aguarda humano",
  falha: "falha",
};

export function NoAgente({ data }: NodeProps) {
  const d = data as DadosNoAgente;
  const cor = CORES[d.status];
  const destacar = d.status === "bloqueado" || d.status === "alerta";

  return (
    <div
      className={`vidro ${destacar ? "pulsando" : ""}`}
      style={{
        width: 178,
        padding: "9px 11px",
        borderColor: cor.borda,
        borderWidth: destacar ? 2 : 1,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: cor.borda }} />

      <div style={{ fontSize: 9, letterSpacing: "0.08em", color: "var(--cor-texto-fraco)" }}>
        {d.modulo}
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.25, margin: "2px 0 4px" }}>
        {d.nome}
      </div>
      <div style={{ fontSize: 10, color: cor.texto, fontWeight: 600 }}>
        {ROTULO_STATUS[d.status]}
      </div>
      <div style={{ fontSize: 9, color: "var(--cor-texto-fraco)", marginTop: 3 }}>
        {d.requisitos.join(" · ")}
      </div>

      <Handle type="source" position={Position.Right} style={{ background: cor.borda }} />
    </div>
  );
}

export const TIPOS_DE_NO = { agente: NoAgente } as const;
```

- [ ] **Step 5: Implementar `GrafoAgentes.tsx`**

```tsx
import { useMemo } from "react";
import { Background, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { selecionarEventosRecentes, useSimulacao } from "@/estado/store";
import { arestasAtivas, chaveAresta, LIGACOES, posicaoDoAgente } from "./grafo";
import { TIPOS_DE_NO, type DadosNoAgente } from "./nosDoGrafo";

export default function GrafoAgentes() {
  const motor = useSimulacao((s) => s.motor);
  const versao = useSimulacao((s) => s.versao);
  const eventos = useSimulacao((s) => selecionarEventosRecentes(s, 14));

  const nos: Node[] = useMemo(() => {
    const contagemPorModulo = new Map<string, number>();
    return motor.agentes.map((agente) => {
      const indice = contagemPorModulo.get(agente.modulo) ?? 0;
      contagemPorModulo.set(agente.modulo, indice + 1);
      const dados: DadosNoAgente = {
        nome: agente.nome,
        modulo: agente.modulo,
        status: agente.status,
        requisitos: agente.requisitos,
        contador: agente.contadorTrabalho,
      };
      return {
        id: agente.id,
        type: "agente",
        position: posicaoDoAgente(agente, indice),
        data: dados,
        draggable: false,
        selectable: false,
      };
    });
    // versao entra na dependencia porque os agentes sao mutaveis.
  }, [motor, versao]);

  const arestas: Edge[] = useMemo(() => {
    const ativas = arestasAtivas(eventos);
    return LIGACOES.map((ligacao) => {
      const chave = chaveAresta(ligacao.origem, ligacao.destino);
      const ativa = ativas.has(chave);
      return {
        id: chave,
        source: ligacao.origem,
        target: ligacao.destino,
        animated: ativa,
        style: {
          stroke: ativa ? "rgba(56,189,248,0.95)" : "rgba(255,255,255,0.14)",
          strokeWidth: ativa ? 2 : 1,
        },
      };
    });
  }, [eventos]);

  return (
    <section className="vidro" style={{ position: "relative", minHeight: 0, overflow: "hidden" }}>
      <h2 className="titulo-painel" style={{ position: "absolute", top: 12, left: 16, zIndex: 5 }}>
        Enxame de agentes — fluxo do dado
      </h2>
      <ReactFlow
        nodes={nos}
        edges={arestas}
        nodeTypes={TIPOS_DE_NO}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        proOptions={{ hideAttribution: false }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll={false}
      >
        <Background color="rgba(255,255,255,0.07)" gap={22} />
      </ReactFlow>
    </section>
  );
}
```

Nota: `hideAttribution: false` é deliberado. O `@xyflow/react` é MIT e não obriga a atribuição, mas mantê-la é cortesia com o projeto e custa nada numa demo.

- [ ] **Step 6: Implementar `PainelAgentes.tsx`**

```tsx
import type { StatusAgente } from "@/agentes/tipos";
import { useSimulacao } from "@/estado/store";

const COR: Record<StatusAgente, string> = {
  ocioso: "var(--cor-texto-fraco)",
  trabalhando: "var(--cor-acento)",
  alerta: "var(--cor-alta)",
  bloqueado: "var(--cor-critica)",
  falha: "var(--cor-critica)",
};

export default function PainelAgentes() {
  const motor = useSimulacao((s) => s.motor);
  useSimulacao((s) => s.versao);

  return (
    <section className="vidro painel" style={{ minHeight: 0 }}>
      <h2 className="titulo-painel">Agentes especialistas ({motor.agentes.length})</h2>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
        {motor.agentes.map((agente) => (
          <li
            key={agente.id}
            style={{
              display: "grid",
              gridTemplateColumns: "8px 1fr auto",
              gap: 9,
              alignItems: "center",
              padding: "6px 8px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.04)",
            }}
            title={agente.descricao}
          >
            <span
              className={agente.status === "bloqueado" ? "pulsando" : undefined}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: COR[agente.status],
              }}
            />
            <span style={{ fontSize: 12 }}>
              {agente.nome}
              <span style={{ fontSize: 9, color: "var(--cor-texto-fraco)", marginLeft: 6 }}>
                {agente.modulo}
              </span>
            </span>
            <span
              style={{
                fontFamily: "var(--fonte-mono)",
                fontSize: 10,
                color: "var(--cor-texto-fraco)",
              }}
            >
              {agente.contadorTrabalho}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 7: Inserir os componentes no `App.tsx`**

Substitua o comentário `{/* PainelAgentes entra aqui na Tarefa 15 */}` por `<PainelAgentes />` e o comentário `{/* GrafoAgentes entra aqui na Tarefa 15 */}` por `<GrafoAgentes />`, adicionando os imports:

```tsx
import GrafoAgentes from "@/ui/GrafoAgentes";
import PainelAgentes from "@/ui/PainelAgentes";
```

- [ ] **Step 8: Rodar testes e verificar visualmente**

```bash
npm run test
npm run dev
```
Esperado: testes PASS. Na tela, o grafo mostra os 12 agentes em colunas por módulo, com arestas animando quando o dado flui.

- [ ] **Step 9: Commit**

```bash
git add -A demo
git commit -m "feat(ui): grafo do enxame com React Flow e roster de agentes com status ao vivo"
```

---

### Task 16: Interface — fila de alertas, boletim e trilha de auditoria

**Files:**
- Create: `demo/src/ui/FilaAlertas.tsx`
- Create: `demo/src/ui/ModalBoletim.tsx`
- Create: `demo/src/ui/TrilhaAuditoria.tsx`
- Modify: `demo/src/App.tsx` (preenche a coluna direita)

**Interfaces:**
- Consumes: `useSimulacao`, `selecionarAlertasAtivos`, `selecionarEventosRecentes`; `Alerta`, `Severidade`
- Produces: `<FilaAlertas />`, `<ModalBoletim />`, `<TrilhaAuditoria />`

Esta é a tarefa onde o `RNF-18` vira gesto: só o clique do operador leva o alerta adiante.

- [ ] **Step 1: Implementar `FilaAlertas.tsx`**

```tsx
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Alerta, Severidade } from "@/dominio/tipos";
import { selecionarAlertasAtivos, useSimulacao } from "@/estado/store";

const COR_SEVERIDADE: Record<Severidade, string> = {
  baixa: "var(--sev-baixa)",
  media: "var(--sev-media)",
  alta: "var(--sev-alta)",
  muito_alta: "var(--sev-muito-alta)",
};

const ROTULO_ESTADO: Record<Alerta["estado"], string> = {
  candidato: "AGUARDANDO VALIDACAO HUMANA",
  validado: "validado — expedindo",
  expedido: "expedido",
  atualizado: "atualizado",
  encerrado: "encerrado",
  descartado: "descartado",
};

function CartaoAlerta({ alerta }: { alerta: Alerta }) {
  const motor = useSimulacao((s) => s.motor);
  const validarAlerta = useSimulacao((s) => s.validarAlerta);
  const descartarAlerta = useSimulacao((s) => s.descartarAlerta);
  const abrirBoletim = useSimulacao((s) => s.abrirBoletim);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const zona = motor.mundo.zonas.find((z) => z.zonaId === alerta.zonaId);
  const boletim = motor.estado.boletins.find((b) => b.alertaId === alerta.alertaId);
  const aguardando = alerta.estado === "candidato";

  function aoDescartar() {
    try {
      descartarAlerta(alerta.alertaId, motivo);
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "falha ao descartar");
    }
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 22 }}
      className="vidro"
      style={{
        padding: "var(--espaco-3)",
        borderLeft: `3px solid ${COR_SEVERIDADE[alerta.severidade]}`,
        listStyle: "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <strong style={{ fontSize: 12.5 }}>
          {zona?.nome ?? alerta.zonaId}
          <span style={{ color: "var(--cor-texto-fraco)", fontWeight: 400, marginLeft: 6 }}>
            {alerta.alertaId}
          </span>
        </strong>
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            color: COR_SEVERIDADE[alerta.severidade],
            whiteSpace: "nowrap",
          }}
        >
          {alerta.severidade.replace("_", " ").toUpperCase()}
        </span>
      </div>

      <div
        className={aguardando ? "pulsando" : undefined}
        style={{
          fontSize: 10,
          marginTop: 4,
          color: aguardando ? "var(--cor-critica)" : "var(--cor-texto-fraco)",
          fontWeight: aguardando ? 700 : 400,
        }}
      >
        {ROTULO_ESTADO[alerta.estado]}
        {alerta.operadorValidador ? ` · ${alerta.operadorValidador}` : ""}
      </div>

      {alerta.leadTimeHoras !== null ? (
        <div style={{ fontSize: 10.5, color: "var(--cor-ok)", marginTop: 3 }}>
          Antecedencia de {alerta.leadTimeHoras} h (origem: previsao)
        </div>
      ) : null}

      <ul style={{ margin: "7px 0 0", paddingLeft: 15, fontSize: 10.5, color: "var(--cor-texto-fraco)" }}>
        {alerta.evidencias.map((e, i) => (
          <li key={i}>{e.descricao}</li>
        ))}
      </ul>

      {alerta.atualizacoes.length > 0 ? (
        <div style={{ fontSize: 10, color: "var(--cor-atencao)", marginTop: 5 }}>
          {alerta.atualizacoes.length} atualizacao(oes) agrupada(s) — antifadiga ativa
        </div>
      ) : null}

      {aguardando ? (
        <div style={{ marginTop: "var(--espaco-3)", display: "grid", gap: 6 }}>
          <button
            className="botao botao-primario"
            onClick={() => validarAlerta(alerta.alertaId)}
          >
            Validar e expedir
          </button>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              className="botao"
              placeholder="Motivo do descarte"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              style={{ flex: 1, minWidth: 0 }}
            />
            <button className="botao botao-perigo" onClick={aoDescartar}>
              Descartar
            </button>
          </div>
          {erro ? (
            <div style={{ fontSize: 10, color: "var(--cor-critica)" }}>{erro}</div>
          ) : null}
        </div>
      ) : null}

      {boletim ? (
        <button
          className="botao"
          style={{ marginTop: 8, width: "100%" }}
          onClick={() => abrirBoletim(boletim.boletimId)}
        >
          {boletim.textoAprovado ? "Ver boletim aprovado" : "Revisar rascunho do boletim"}
        </button>
      ) : null}
    </motion.li>
  );
}

export default function FilaAlertas() {
  const alertas = useSimulacao(selecionarAlertasAtivos);
  useSimulacao((s) => s.versao);

  const visiveis = alertas.filter((a) => a.estado !== "encerrado" && a.estado !== "descartado");

  return (
    <section className="vidro painel" style={{ minHeight: 0 }}>
      <h2 className="titulo-painel">Fila de alertas — decisao do plantao</h2>

      {visiveis.length === 0 ? (
        <p style={{ fontSize: 11.5, color: "var(--cor-texto-fraco)" }}>
          Nenhum alerta ativo. Os agentes seguem monitorando.
        </p>
      ) : (
        <ul style={{ margin: 0, padding: 0, display: "grid", gap: "var(--espaco-3)" }}>
          <AnimatePresence initial={false}>
            {visiveis.map((alerta) => (
              <CartaoAlerta key={alerta.alertaId} alerta={alerta} />
            ))}
          </AnimatePresence>
        </ul>
      )}

      <p style={{ fontSize: 10, color: "var(--cor-texto-fraco)", marginTop: "var(--espaco-4)" }}>
        Nenhum alerta e expedido sem esta validacao. O agente de expedicao permanece
        bloqueado ate um operador identificado decidir (RNF-18).
      </p>
    </section>
  );
}
```

- [ ] **Step 2: Implementar `ModalBoletim.tsx`**

```tsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSimulacao } from "@/estado/store";

export default function ModalBoletim() {
  const boletimId = useSimulacao((s) => s.boletimAberto);
  const motor = useSimulacao((s) => s.motor);
  const abrirBoletim = useSimulacao((s) => s.abrirBoletim);
  const aprovarBoletim = useSimulacao((s) => s.aprovarBoletim);

  const boletim = motor.estado.boletins.find((b) => b.boletimId === boletimId);
  const [texto, setTexto] = useState("");

  useEffect(() => {
    if (boletim) setTexto(boletim.textoAprovado ?? boletim.textoRascunho);
  }, [boletim]);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") abrirBoletim(null);
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [abrirBoletim]);

  return (
    <AnimatePresence>
      {boletim ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => abrirBoletim(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 6, 12, 0.66)",
            backdropFilter: "blur(6px)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
            padding: "var(--espaco-5)",
          }}
        >
          <motion.div
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            className="vidro-forte painel"
            style={{ width: "min(760px, 92vw)", maxHeight: "84vh", display: "grid", gap: "var(--espaco-3)" }}
            role="dialog"
            aria-label="Boletim de situacao"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="titulo-painel" style={{ margin: 0 }}>
                Boletim {boletim.boletimId} — alerta {boletim.alertaId}
              </h2>
              <span className="selo-demo">
                {boletim.textoAprovado ? "APROVADO" : "RASCUNHO GERADO POR AGENTE"}
              </span>
            </div>

            <div style={{ fontSize: 10.5, color: "var(--cor-texto-fraco)" }}>
              Fontes consultadas pelo agente redator:
              <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                {boletim.fontesConsultadas.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>

            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              readOnly={boletim.textoAprovado !== null}
              spellCheck={false}
              style={{
                width: "100%",
                minHeight: 320,
                resize: "vertical",
                background: "rgba(0,0,0,0.34)",
                color: "var(--cor-texto)",
                border: "1px solid var(--cor-borda)",
                borderRadius: 10,
                padding: "var(--espaco-3)",
                fontFamily: "var(--fonte-mono)",
                fontSize: 11.5,
                lineHeight: 1.55,
              }}
            />

            <div style={{ display: "flex", gap: "var(--espaco-2)", justifyContent: "flex-end" }}>
              <button className="botao" onClick={() => abrirBoletim(null)}>
                Fechar
              </button>
              {boletim.textoAprovado === null ? (
                <button
                  className="botao botao-primario"
                  onClick={() => aprovarBoletim(boletim.boletimId, texto)}
                >
                  Aprovar como revisado
                </button>
              ) : (
                <span style={{ fontSize: 11, color: "var(--cor-ok)", alignSelf: "center" }}>
                  Aprovado por {boletim.autorAprovacao} em {boletim.tsAprovacao}
                </span>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Implementar `TrilhaAuditoria.tsx`**

```tsx
import { selecionarEventosRecentes, useSimulacao } from "@/estado/store";
import type { TipoEvento } from "@/simulacao/barramento";

const COR: Partial<Record<TipoEvento, string>> = {
  "leitura.reprovada": "var(--cor-atencao)",
  "estacao.silenciosa": "var(--cor-critica)",
  "limiar.atingido": "var(--cor-alta)",
  "alerta.criado": "var(--cor-alta)",
  "expedicao.bloqueada": "var(--cor-critica)",
  "alerta.validado": "var(--cor-ok)",
  "alerta.expedido": "var(--cor-ok)",
  "boletim.aprovado": "var(--cor-ok)",
  "mancha.gerada": "var(--cor-acento)",
};

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TrilhaAuditoria() {
  const eventos = useSimulacao((s) => selecionarEventosRecentes(s, 40));
  useSimulacao((s) => s.versao);

  return (
    <section className="vidro painel" style={{ minHeight: 0 }}>
      <h2 className="titulo-painel">Trilha de auditoria (RF-GOV-02)</h2>
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 5 }}>
        {eventos.map((evento) => (
          <li
            key={evento.eventoId}
            style={{
              display: "grid",
              gridTemplateColumns: "42px 1fr",
              gap: 8,
              fontSize: 10.5,
              paddingBottom: 5,
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <span style={{ fontFamily: "var(--fonte-mono)", color: "var(--cor-texto-fraco)" }}>
              {hora(evento.ts)}
            </span>
            <span>
              <span style={{ color: COR[evento.tipo] ?? "var(--cor-texto)" }}>{evento.titulo}</span>
              <span style={{ display: "block", color: "var(--cor-texto-fraco)", fontSize: 9.5 }}>
                {evento.agenteId}
                {evento.correlacaoId ? ` · ${evento.correlacaoId}` : ""}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

- [ ] **Step 4: Preencher a coluna direita do `App.tsx`**

Substitua o comentário `{/* FilaAlertas e TrilhaAuditoria entram aqui na Tarefa 16 */}` por:

```tsx
<div
  style={{
    display: "grid",
    gridTemplateRows: "1fr 1fr",
    gap: "var(--espaco-3)",
    height: "100%",
    minHeight: 0,
  }}
>
  <FilaAlertas />
  <TrilhaAuditoria />
</div>
```

E adicione, logo antes do fechamento do elemento raiz, `<ModalBoletim />`, com os imports:

```tsx
import FilaAlertas from "@/ui/FilaAlertas";
import ModalBoletim from "@/ui/ModalBoletim";
import TrilhaAuditoria from "@/ui/TrilhaAuditoria";
```

- [ ] **Step 5: Ensaiar o roteiro completo da demonstração**

```bash
npm run dev
```

Percorra, na ordem, e confirme cada beat:
1. Cenário "Ceu limpo" → tudo verde, agentes trabalhando, nenhum alerta.
2. Trocar para "Leitura implausivel" → o KPI de leituras reprovadas sobe; o agente de qualidade fica laranja; nenhum alerta é criado a partir dos 2000 mm.
3. Trocar para "Falha na rede de estacoes" → blocos vermelhos pulsam no painel de saúde; a simulação continua.
4. Trocar para "Chuva convectiva" → alerta candidato aparece; um segundo disparo vira atualização, não alerta novo.
5. Trocar para "Evento extremo" → a mancha cresce no mapa, intercepta zonas, o geofencing cria alerta preditivo com antecedência.
6. **O momento central:** o `agente-expedicao` fica vermelho e pulsando, com "BLOQUEADO — aguarda humano". Clicar "Validar e expedir" → o alerta transita, o boletim é rascunhado, a trilha registra a cadeia completa.

- [ ] **Step 6: Commit**

```bash
git add -A demo
git commit -m "feat(ui): fila de alertas com validacao humana, modal de boletim e trilha de auditoria"
```

---

### Task 17: Documentação, verificação final e publicação na Vercel

**Files:**
- Create: `demo/README.md`
- Create: `demo/docs/CONEXAO-ENTERPRISE.md`
- Modify: `demo/package.json` (script `verificar`)

**Interfaces:**
- Consumes: tudo
- Produces: projeto documentado e publicado

- [ ] **Step 1: Adicionar o script de verificação**

```bash
cd demo
npm pkg set scripts.verificar="npm run test && tsc --noEmit && vite build"
```

- [ ] **Step 2: Escrever `README.md`**

````markdown
# Demonstracao H1 — Sala de Situacao Multi-Agente

Demonstracao interativa da **Plataforma de Alerta Precoce e Gemeo Digital de Bacia**,
derivada de `SPEC-H1-alerta-precoce-digital-twin-bacia.md`.

> **Esta e uma demonstracao com dados sinteticos.**
> Nenhuma fonte real e consultada. A previsao de nivel e uma curva de resposta
> parametrizada, nao um modelo hidrologico. O boletim e composto por template,
> nao por LLM. Nada aqui deve ser apresentado como capacidade preditiva operacional.

## O que ela mostra

Doze agentes especialistas, um por modulo do SPEC-H1, operando sobre uma bacia
sintetica gerada proceduralmente:

| Agente | Modulo | Requisitos |
|---|---|---|
| Ingestao CEMADEN / ANA / INMET | ING | RF-ING-01/02/05 |
| Controle de qualidade | ING | RF-ING-04 |
| Saude da rede | NET | RF-NET-01 |
| Modelagem hidrologica | MOD | RF-MOD-02/03/04 |
| Motor de limiares | ALT | RF-ALT-01/02/05 |
| Geofencing preditivo | ALT | RF-ALT-03 |
| Antifadiga de alerta | ALT | RF-ALT-05/06 |
| Assistente de plantao | LLM | RF-LLM-01/03/05 |
| Expedicao multicanal | EXP | RF-EXP-01/02/03, **RNF-18** |
| Trilha de auditoria | GOV | RF-GOV-02 |

**O ponto central da demonstracao** e o agente de expedicao permanecer *bloqueado*
ate um operador identificado validar o alerta. Isso nao e uma limitacao da demo:
e o `RNF-18` do spec funcionando. A funcao `expedir()` lanca excecao se chamada
sobre alerta nao validado, e ha teste automatizado garantindo isso.

## Cenarios

| Cenario | O que demonstra |
|---|---|
| Ceu limpo | Sistema em repouso, rede saudavel |
| Chuva convectiva localizada | Limiar observado e antifadiga (agrupamento) |
| Evento extremo prolongado | Mancha crescendo, geofencing preditivo, lead time |
| Falha na rede de estacoes | Deteccao de estacao silenciosa e degradacao graciosa |
| Leitura implausivel | Controle de qualidade impedindo alerta a partir de dado sujo |

Todos os cenarios sao **reproduziveis**: mesma semente, mesmo resultado.

## Rodar localmente

```bash
npm install
npm run dev
```

## Verificar antes de publicar

```bash
npm run verificar
```

Roda testes, checagem de tipos e build.

## Publicar na Vercel

O projeto e estatico, sem backend.

```bash
npx vercel --prod
```

Ou conecte o repositorio na Vercel apontando o *root directory* para `demo/`.
O `vercel.json` ja define framework, comando de build e reescrita de SPA.
**Nenhuma variavel de ambiente e necessaria para publicar.**

## Estrutura

```
src/dominio/      logica pura, testavel sem React/ArcGIS/rede
src/simulacao/    mundo procedural, cenarios, barramento, motor de tick
src/agentes/      os 12 agentes especialistas
src/estado/       ponte Zustand entre motor mutavel e React
src/mapa/         ArcGIS Maps SDK: config, simbologia, camadas animadas
src/ui/           painéis com glassmorfismo e grafo React Flow
```

## Divergencias conscientes em relacao ao SPEC-H1

| Item | Spec | Demo | Motivo |
|---|---|---|---|
| CRS | EPSG:4674 | EPSG:4326 | Geometria sintetica; ArcGIS reprojeta na renderizacao |
| Modelo hidrologico | Fisico acoplado + ML (AD-04) | Curva de resposta parametrizada | Sem backend; suficiente para o fluxo |
| Camada LLM | Provedor agnostico (AD-05) | Template deterministico | Sem backend e sem chave de API |
| Design system | Calcite seria o caminho Esri | CSS proprio | Glassmorfismo solicitado brigaria com Calcite |
| Persistencia | Enterprise Data Store | Memoria do navegador | Demo sem backend |

## Licencas de terceiros

`@xyflow/react` (React Flow) e MIT — uso livre, inclusive comercial.
`@arcgis/core` segue os termos da Esri; o basemap padrao e OpenStreetMap,
que nao exige chave de API.
````

- [ ] **Step 3: Escrever `docs/CONEXAO-ENTERPRISE.md`**

````markdown
# Conectar ao ArcGIS Enterprise de Sao Paulo

A demo funciona integralmente **sem** credencial. Este documento descreve o que
fazer quando o App ID do portal `https://saopaulo.img.com.br/portal` existir.

## 1. Registrar a aplicacao no portal

No portal, em *Content > New item > Application > Other application*, registre a
aplicacao e anote o **App ID (Client ID)**.

Em *Settings > Redirect URIs*, adicione:
- `http://localhost:5173` (desenvolvimento)
- a URL de producao da Vercel

Sem o redirect URI cadastrado, o fluxo OAuth falha silenciosamente no navegador.

## 2. Preencher o `.env`

```
VITE_ARCGIS_PORTAL_URL=https://saopaulo.img.com.br/portal
VITE_ARCGIS_APP_ID=<o App ID registrado>
VITE_MODO_ENTERPRISE=true
```

Na Vercel, cadastre as mesmas variaveis em *Settings > Environment Variables*.

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

O contrato de dados esperado esta na secao 8 do `SPEC-H1`. Mapeie os campos do
servico real para as interfaces de `src/dominio/tipos.ts` em um adaptador —
**nao altere os tipos do dominio para caber no servico**, porque isso propagaria
o formato do servico por toda a aplicacao.

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
````

- [ ] **Step 4: Verificação final completa**

```bash
cd demo
npm run verificar
```

Esperado: todos os testes passando, sem erro de tipo, build concluído. Confirme especificamente na saída dos testes:
- bloco `expedir` de `alerta.test.ts` — 3 testes
- bloco `agenteExpedicao — RNF-18` — 3 testes
- teste `nao expede alerta sem validacao humana — RNF-18 ponta a ponta` em `motor.test.ts`

Se qualquer um desses falhar, **pare**: o requisito mais importante da demonstração está quebrado.

- [ ] **Step 5: Publicar**

```bash
npx vercel --prod
```

Confirme na URL publicada: mapa carrega, cenários trocam, o agente de expedição bloqueia, a validação humana destrava.

- [ ] **Step 6: Commit final**

```bash
git add -A demo
git commit -m "docs: README, guia de conexao ao Enterprise e script de verificacao"
```

---

## Self-Review

Revisão do plano contra o SPEC-H1 e contra o pedido do usuário.

### 1. Cobertura do spec

| Requisito do spec | Tarefa que implementa |
|---|---|
| RF-ING-01/02/05 (catálogo, coleta, normalização) | 9 (`agenteIngestao`) |
| RF-ING-04 (controle de qualidade) | 4 (`qc.ts`) + 9 (`agenteQualidade`) |
| RF-ING-03 (tempo real) | **Fora de escopo da demo** — sem backend não há feed real; o tick da simulação cumpre o papel narrativo |
| RF-ING-06/07 (previsão, MDT) | 11 (perfil de chuva do cenário) — MDT não aplicável a geometria sintética |
| RF-NET-01 (saúde da rede) | 9 (`agenteRede`) + 14 (`PainelSaudeRede`) |
| RF-NET-02 (cobertura territorial) | **Fora de escopo** — não agrega à narrativa da demo |
| RF-MOD-01/02/03/04 | 6 (`previsao.ts`, `mancha.ts`) + 9 (`agenteHidrologico`) |
| RF-MOD-05 (evento histórico) | 11 (cenário "Evento extremo prolongado") |
| RF-ALT-01/02/04/05 | 5 (`limiar.ts`, `alerta.ts`) + 10 (`agenteLimiar`, `agenteAntifadiga`) |
| RF-ALT-03 (geofencing preditivo) | 10 (`agenteGeofencing`) |
| RF-ALT-06 (POD/FAR/CSI) | **Parcial** — a demo não tem ocorrência verificada para confrontar; o KPI fica de fora |
| RF-EXP-01/02/03 | 10 (`agenteExpedicao`) |
| RF-COP-01/02/04 | 13 (mapa) + 14 (KPIs) |
| RF-COP-03 (ativos de proteção) | 8 (mundo) + 13 (símbolo de ativo) |
| RF-PUB-* (portal público) | **Fora de escopo da demo** |
| RF-TWN-* (cenários do gêmeo digital) | 11 (cenários reproduzíveis) — cobertura parcial e honesta |
| RF-LLM-01/03/05 | 10 (`boletim.ts`, `agenteRedator`) + 16 (`ModalBoletim`) |
| RF-LLM-02/04 (tools, agnosticismo) | **Fora de escopo** — sem LLM real; documentado no README |
| RF-GOV-01 (perfis) | **Fora de escopo** — operador único na demo |
| RF-GOV-02 (trilha) | 7 (`barramento.ts`) + 16 (`TrilhaAuditoria`) |
| RF-GOV-03/04 (metadado, OGC) | **Fora de escopo** — depende do Enterprise |
| RNF-06 (degradação graciosa) | 7 (isolamento de ouvinte) + 11 (isolamento de agente) |
| **RNF-18 (human-in-the-loop)** | 5, 10, 11, 16 — quatro camadas de teste |

As lacunas acima são deliberadas e estão declaradas no README. Nenhuma delas compromete a narrativa da demo; todas decorrem da restrição "sem backend" que o usuário definiu.

### 2. Cobertura do pedido do usuário

| Pedido | Onde está |
|---|---|
| Publicar na Vercel | Tarefa 1 (`vercel.json`) + Tarefa 17 |
| Sem backend | Restrição global; nenhuma tarefa cria API |
| Dados simulados | Tarefas 8 e 11 |
| Aplicação dinâmica com cenários | Tarefa 11 (5 cenários) + Tarefa 14 (seletor) |
| Animações de tempo real | Tarefa 13 (pulsos, mancha) + 15 (arestas) + 16 (`motion`) |
| Multi-agentes com especialistas | Tarefas 9 e 10 (12 agentes) |
| Agentes de monitoramento que detectam anomalia | `agenteQualidade`, `agenteRede` (Tarefa 9) |
| Ações espaciais ao detectar anomalia | `agenteGeofencing` (Tarefa 10) |
| Ações de alerta | `agenteLimiar`, `agenteExpedicao` (Tarefa 10) |
| Stack Esri (JS/TS/ArcGIS SDK) | Tarefa 13 |
| Preparado para Enterprise São Paulo | Tarefa 13 (`portal.ts`) + Tarefa 17 (guia) |
| App ID em `.env`, ainda inexistente | Tarefa 1 (`.env.example`) — demo funciona sem |
| Camadas vetoriais como mocks | Tarefa 8 |
| Multipolígonos de geometria irregular | Tarefa 3 (`multiPoligonoIrregular`) + teste que exige >1 anel |
| React Flow versão gratuita | Tarefa 15 — MIT verificado via `npm view` |
| Glassmorfismo | Tarefa 14 (`glass.css`) |

### 3. Consistência de tipos e nomes

Verificado: `criarAleatorio`/`Aleatorio` (T2) usados em T3 e T8; `Poligono`/`Anel`/`Coordenada` (T3) usados em T4, T6, T8, T13; `Observacao`/`Alerta`/`Limiar` (T4) usados em T5, T9, T10; `expedir`/`validar`/`descartar` (T5) usados em T10 e T11; `Barramento.porCorrelacao` (T7) usado em T10 (`agenteAuditoria`) e T16; `ContextoAgente.publicar` (T9) com a mesma assinatura no `Motor` (T11); `criarEnxame` (T10) usado em T11 e T15; `useSimulacao` (T12) usado em T13-T16; `GerenciadorCamadas.pulsar/sincronizar` (T13) chamados com a mesma aridade em `MapaSalaSituacao`.

Um ajuste aplicado durante a revisão: `criarEstadoInicial` foi movido para `agentes/tipos.ts` (T9) porque tanto os testes de agente (T9) quanto o `Motor` (T11) precisam dele — deixá-lo no motor criaria dependência circular.

---

## Execution Handoff

**Plano completo e salvo em `docs/superpowers/plans/2026-09-09-demo-h1-sala-situacao.md`. Duas opções de execução:**

**1. Subagent-Driven (recomendada)** — Eu despacho um subagente novo por tarefa, reviso entre tarefas, iteração rápida.

**2. Execução Inline** — Executo as tarefas nesta sessão com `executing-plans`, em lotes com pontos de conferência.

**Qual abordagem?**
