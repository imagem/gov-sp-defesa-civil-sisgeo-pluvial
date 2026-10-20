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
