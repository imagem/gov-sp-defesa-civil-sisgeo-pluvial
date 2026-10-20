import { beforeEach, describe, expect, it } from "vitest";
import { buscarRotaOsrm, comprimentoRota, limparCacheRotas } from "./roteamento";

beforeEach(() => limparCacheRotas());

describe("buscarRotaOsrm", () => {
  it("devolve array de coordenadas em caso de sucesso", async () => {
    const fetchFake = async () =>
      new Response(
        JSON.stringify({
          code: "Ok",
          routes: [
            {
              geometry: {
                coordinates: [
                  [-46.4, -23.9],
                  [-46.39, -23.88],
                  [-46.38, -23.87],
                ],
              },
            },
          ],
        }),
        { status: 200 },
      );
    const rota = await buscarRotaOsrm([-46.4, -23.9], [-46.38, -23.87], {
      fetchFn: fetchFake as unknown as typeof fetch,
    });
    expect(rota).toEqual([
      [-46.4, -23.9],
      [-46.39, -23.88],
      [-46.38, -23.87],
    ]);
  });

  it("devolve null quando o servico responde erro HTTP", async () => {
    const fetchFake = async () => new Response("boom", { status: 500 });
    const rota = await buscarRotaOsrm([-46.4, -23.9], [-46.38, -23.87], {
      fetchFn: fetchFake as unknown as typeof fetch,
    });
    expect(rota).toBeNull();
  });

  it("devolve null quando o fetch lanca", async () => {
    const fetchFake = async () => {
      throw new Error("rede caiu");
    };
    const rota = await buscarRotaOsrm([-46.4, -23.9], [-46.38, -23.87], {
      fetchFn: fetchFake as unknown as typeof fetch,
    });
    expect(rota).toBeNull();
  });

  it("devolve null quando a resposta vem sem rota utilizavel", async () => {
    const fetchFake = async () =>
      new Response(JSON.stringify({ code: "NoRoute", routes: [] }), { status: 200 });
    const rota = await buscarRotaOsrm([-46.4, -23.9], [-46.38, -23.87], {
      fetchFn: fetchFake as unknown as typeof fetch,
    });
    expect(rota).toBeNull();
  });
});

describe("comprimentoRota", () => {
  it("devolve 0 para rota de menos de dois pontos", () => {
    expect(comprimentoRota([])).toBe(0);
    expect(comprimentoRota([[-46.4, -23.9]])).toBe(0);
  });

  it("soma segmentos euclidianos em graus", () => {
    const soma = comprimentoRota([
      [0, 0],
      [3, 0],
      [3, 4],
    ]);
    expect(soma).toBeCloseTo(7, 6);
  });
});
