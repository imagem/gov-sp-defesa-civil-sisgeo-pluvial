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
