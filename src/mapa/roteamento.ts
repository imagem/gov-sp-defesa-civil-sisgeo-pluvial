import type { Coordenada } from "@/dominio/geometria";

/**
 * Rota real de viatura a partir do servico publico do projeto OSRM.
 *
 * Por que:
 *   - A rota em L semeada em `dominio/despacho.ts` e geometria sintetica —
 *     parece via, mas nao segue arruamento. Visualmente desmente a demo
 *     quando o fundo mostra as ruas reais. Chamar um servico de rota real
 *     corrige isso sem obrigar a demo a ter um servidor proprio.
 *
 * Como fica honesta:
 *   - Sem chave de API nem backend: `router.project-osrm.org` e publico,
 *     mantem a demo publicavel em host estatico.
 *   - Timeout curto (padrao 2000 ms) e `null` em qualquer falha — a demo
 *     continua funcionando com a rota em L original.
 *   - A chamada e opcional: quem usa (motor/estado) decide se dispara,
 *     e aplica o resultado so se o despacho ainda esta no estado de
 *     `preparando` (ver store), para a viatura nao teleportar no meio
 *     do caminho.
 *
 * Nao substitui o estimador de duracao: o `deslocamentoMin` ja foi fixado
 * pela rota original; a rota real so troca a GEOMETRIA. Alterar o tempo
 * em tempo de execucao mudaria o fim previsto do despacho e romperia a
 * contagem de minutos restantes que o operador ja esta vendo.
 */

export interface OpcoesRota {
  readonly timeoutMs?: number;
  readonly fetchFn?: typeof fetch;
}

const BASE_OSRM = "https://router.project-osrm.org/route/v1/driving";
const TIMEOUT_PADRAO_MS = 2000;

const cache = new Map<string, Promise<readonly Coordenada[] | null>>();

function chaveCache(origem: Coordenada, destino: Coordenada): string {
  return `${origem[0].toFixed(5)},${origem[1].toFixed(5)}|${destino[0].toFixed(5)},${destino[1].toFixed(5)}`;
}

interface RespostaOsrm {
  readonly code?: string;
  readonly routes?: readonly {
    readonly geometry?: {
      readonly coordinates?: ReadonlyArray<readonly [number, number]>;
    };
  }[];
}

export async function buscarRotaOsrm(
  origem: Coordenada,
  destino: Coordenada,
  opcoes: OpcoesRota = {},
): Promise<readonly Coordenada[] | null> {
  const chave = chaveCache(origem, destino);
  const emCache = cache.get(chave);
  if (emCache) return emCache;

  const promessa = executarBusca(origem, destino, opcoes);
  cache.set(chave, promessa);
  // Em falha, nao mantemos o cache ruim — podem tentar de novo depois.
  promessa.then((v) => {
    if (!v) cache.delete(chave);
  });
  return promessa;
}

async function executarBusca(
  origem: Coordenada,
  destino: Coordenada,
  opcoes: OpcoesRota,
): Promise<readonly Coordenada[] | null> {
  const fn = opcoes.fetchFn ?? fetch;
  const timeout = opcoes.timeoutMs ?? TIMEOUT_PADRAO_MS;
  const url = `${BASE_OSRM}/${origem[0]},${origem[1]};${destino[0]},${destino[1]}?overview=full&geometries=geojson`;

  const controle = new AbortController();
  const idTimeout = setTimeout(() => controle.abort(), timeout);

  try {
    const resposta = await fn(url, { signal: controle.signal });
    if (!resposta.ok) return null;
    const dados = (await resposta.json()) as RespostaOsrm;
    const coords = dados.routes?.[0]?.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;
    return coords.map(([lon, lat]) => [lon, lat] as Coordenada);
  } catch {
    // AbortError, rede, CORS, JSON invalido — tudo cai aqui e vira "sem rota real".
    return null;
  } finally {
    clearTimeout(idTimeout);
  }
}

/** Comprimento euclidiano acumulado da rota, em graus. */
export function comprimentoRota(pontos: readonly Coordenada[]): number {
  let soma = 0;
  for (let i = 1; i < pontos.length; i++) {
    const a = pontos[i - 1]!;
    const b = pontos[i]!;
    soma += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return soma;
}

/** Limpa o cache de rotas. Usado nos testes. */
export function limparCacheRotas(): void {
  cache.clear();
}
