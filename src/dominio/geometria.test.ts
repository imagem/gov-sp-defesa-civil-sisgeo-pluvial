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
