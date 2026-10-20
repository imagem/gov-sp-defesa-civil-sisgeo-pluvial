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
import type { Regiao } from "./regioes";

export const FONTES = ["CEMADEN", "ANA", "INMET"] as const;

export interface Mundo {
  readonly semente: number;
  readonly regiao: Regiao;
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
 * Gera um mundo sintetico completo e reproduzivel a partir de uma semente e
 * de uma regiao (centro, nomes de sub-bacias, carteira de bairros, prefixo
 * do codigo setorial, posto fluviometrico). Toda a geometria segue
 * procedural e irregular — a regiao so define o palco, nao substitui
 * shapefiles reais.
 */
export function criarMundo(semente: number, regiao: Regiao): Mundo {
  const r = criarAleatorio(semente);
  const centro = regiao.centro;
  const nomesSubBacia = regiao.subBacias;
  const bairros = regiao.bairros;

  const setor = regiao.setorAngularRad;
  const subBacias: SubBacia[] = nomesSubBacia.map((nome, i) => {
    // Sem setor explicito: anel completo com angulos 0, 2pi/N, 4pi/N, ... (compat
    // com o comportamento original). Com setor [a, b]: angulos uniformemente
    // espacados DENTRO do arco, centrados em cada fatia para nao esbarrarem
    // nas pontas — assim uma regiao costeira pode excluir o oceano a sul sem
    // concentrar bacias nas bordas do arco.
    const angulo = setor
      ? setor[0] + ((i + 0.5) / nomesSubBacia.length) * (setor[1] - setor[0])
      : (i / nomesSubBacia.length) * Math.PI * 2;
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
      nome: bairros[i % bairros.length] ?? `Setor ${i + 1}`,
      codigoSetorSgb: `${regiao.prefixoSgb}-${regiao.baseSetor + i}`,
      subBaciaId: subBacia.subBaciaId,
      grauRisco: r() > 0.55 ? "muito_alto" : "alto",
      // Tipo da zona varia com a vocacao da regiao: regioes de encosta
      // (Serra do Mar) tem predominancia de deslizamento; bacias ribeirinhas
      // (Varzea do Tiete, Guaiba) tem predominancia de inundacao.
      tipo: r() < (regiao.pesoDeslizamento ?? 0.25) ? "deslizamento" : "inundacao",
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
      justificativaTecnica: `Chuva acumulada de ${chuvaLimite} mm em 6 h satura o solo do setor ${zona.codigoSetorSgb} (parâmetro sintético de demonstração).`,
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
      justificativaTecnica: `Cota prevista de ${cotaLimite} m projeta mancha sobre o setor ${zona.codigoSetorSgb} (parâmetro sintético de demonstração).`,
      autor: "analista.demo",
    });
  }

  return {
    semente,
    regiao,
    centro,
    subBacias,
    corredor,
    zonas,
    estacoes,
    ativos,
    limiares,
    cotaBaseM,
    postoId: regiao.postoId,
  };
}
