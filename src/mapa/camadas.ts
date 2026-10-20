import Graphic from "@arcgis/core/Graphic.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Point from "@arcgis/core/geometry/Point.js";
import Polygon from "@arcgis/core/geometry/Polygon.js";
import Polyline from "@arcgis/core/geometry/Polyline.js";
import type ArcGISMap from "@arcgis/core/Map.js";
import type { EstadoSimulacao } from "@/agentes/tipos";
import type { Coordenada, Poligono } from "@/dominio/geometria";
import {
  minutosRestantes,
  pontoNaRota,
  progressoTrajeto,
  rotuloDespacho,
  type DespachoCampo,
  type Rota,
} from "@/dominio/despacho";
import type { Mundo } from "@/simulacao/mundo";
import { SIMBOLOS } from "./simbologia";
import type { CamadaId } from "./visibilidade";

export type TipoPulsoZona = "novo" | "validado";

const COR_PULSO_ZONA: Record<TipoPulsoZona, readonly [number, number, number]> = {
  novo: [244, 63, 94],
  validado: [52, 211, 153],
};

/**
 * Suavizacao do deslocamento das equipes: a cada quadro a posicao desenhada
 * caminha esta fracao da distancia ate a posicao-alvo do tick. Sem isso a
 * viatura saltaria em degraus a cada tick (10 min simulados por passo).
 */
const SUAVIZACAO_EQUIPE = 0.08;
/** Abaixo desta diferenca de progresso, assume-se a posicao-alvo. */
const EPSILON_EQUIPE = 0.0005;

const DURACAO_PULSO_MS = 1200;
const DURACAO_PULSO_ZONA_MS = 2200;
/** Defasagem do segundo anel do pulso de zona, como fracao da duracao. */
const DEFASAGEM_ANEL_ZONA = 0.35;

/**
 * Vertices que faltam percorrer: a posicao atual da viatura seguida dos
 * vertices da rota que ainda estao a frente dela. Sem isso, o tracejado do
 * "que falta" voltaria em linha reta ate a estacao e desmentiria a rota.
 */
function trechoRestante(rota: Rota, posicao: Coordenada, t: number): number[][] {
  const pontos = rota.pontos;
  if (rota.comprimentoGraus <= 0 || pontos.length < 2) {
    return [[posicao[0], posicao[1]]];
  }

  const alvo = Math.min(Math.max(t, 0), 1) * rota.comprimentoGraus;
  let percorrido = 0;
  let proximoVertice = pontos.length - 1;

  for (let i = 1; i < pontos.length; i++) {
    const seg = Math.hypot(pontos[i]![0] - pontos[i - 1]![0], pontos[i]![1] - pontos[i - 1]![1]);
    if (percorrido + seg >= alvo) {
      proximoVertice = i;
      break;
    }
    percorrido += seg;
  }

  return [
    [posicao[0], posicao[1]],
    ...pontos.slice(proximoVertice).map((p) => [p[0], p[1]]),
  ];
}

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
 * uma unica vez; as camadas de dados (mancha, zonas, estacoes) sao redesenhadas
 * apenas a cada tick da simulacao via sincronizar, ja que so mudam nesse
 * cadenciamento; a camada de pulsos e redesenhada a cada quadro via
 * desenharPulsos, pois seus aneis se expandem suavemente entre os ticks.
 * Separar os dois cadenciamentos evita reconstruir centenas de graficos
 * estaticos sessenta vezes por segundo.
 */
export class GerenciadorCamadas {
  private estaticas = new GraphicsLayer({ title: "Base sintética" });
  private mancha = new GraphicsLayer({ title: "Mancha de inundação" });
  private zonas = new GraphicsLayer({ title: "Zonas de risco" });
  private ativos = new GraphicsLayer({ title: "Ativos de proteção" });
  private estacoes = new GraphicsLayer({ title: "Rede de observação" });
  private equipes = new GraphicsLayer({ title: "Equipes em campo" });
  private destaqueGemeo = new GraphicsLayer({ title: "Gemeo digital" });
  private pulsos = new GraphicsLayer({ title: "Atividade" });

  /** Despachos do ultimo tick, redesenhados por quadro para animar o trajeto. */
  private despachos: readonly DespachoCampo[] = [];
  /** Progresso efetivamente desenhado por despacho, que persegue o do tick. */
  private readonly progressoDesenhado = new Map<string, number>();

  private pulsosAtivos: { posicao: [number, number]; inicio: number }[] = [];
  private pulsosZona: { centro: [number, number]; inicio: number; tipo: TipoPulsoZona }[] = [];
  private montado = false;

  montar(map: ArcGISMap, mundo: Mundo): void {
    if (this.montado) return;

    // Instancias novas a cada montagem: o StrictMode do React remonta o
    // componente do mapa em desenvolvimento (montar -> desmontar -> montar),
    // e uma GraphicsLayer ja usada e destacada de um Map destruido nao cria
    // layerview num Map novo. Recriar aqui garante camadas sempre "frescas".
    this.estaticas = new GraphicsLayer({ title: "Base sintética" });
    this.mancha = new GraphicsLayer({ title: "Mancha de inundação" });
    this.zonas = new GraphicsLayer({ title: "Zonas de risco" });
    this.ativos = new GraphicsLayer({ title: "Ativos de proteção" });
    this.estacoes = new GraphicsLayer({ title: "Rede de observação" });
    this.equipes = new GraphicsLayer({ title: "Equipes em campo" });
    this.destaqueGemeo = new GraphicsLayer({ title: "Gemeo digital" });
    this.pulsos = new GraphicsLayer({ title: "Atividade" });

    map.addMany([
      this.estaticas,
      this.mancha,
      this.zonas,
      this.ativos,
      this.estacoes,
      this.equipes,
      this.destaqueGemeo,
      this.pulsos,
    ]);

    for (const subBacia of mundo.subBacias) {
      this.estaticas.add(
        new Graphic({ geometry: paraPolygon(subBacia.geometria), symbol: SIMBOLOS.subBacia }),
      );
    }
    this.estaticas.add(
      new Graphic({ geometry: paraPolygon(mundo.corredor), symbol: SIMBOLOS.corredor }),
    );

    this.montado = true;
  }

  /**
   * Liga/desliga as camadas conforme a escolha do operador. `subBacias` mapeia
   * para a camada de base sintetica (`estaticas`); as demais sao 1:1. A camada
   * de pulsos nao tem controle proprio: fica visivel se ao menos uma das fontes
   * dos pulsos (estacoes ou zonas) estiver visivel.
   */
  aplicarVisibilidade(v: Record<CamadaId, boolean>): void {
    this.mancha.visible = v.mancha;
    this.zonas.visible = v.zonas;
    this.estacoes.visible = v.estacoes;
    this.equipes.visible = v.equipes;
    this.ativos.visible = v.ativos;
    this.estaticas.visible = v.subBacias;
    this.pulsos.visible = v.estacoes || v.zonas;
  }

  /**
   * Redesenha os ativos de protecao com o simbolo do estado operacional atual
   * (gemeo digital, RF-TWN). Chamado a cada mudanca de estado what-if.
   */
  desenharAtivos(mundo: Mundo, estados: Record<string, string>): void {
    this.ativos.removeAll();
    for (const ativo of mundo.ativos) {
      const estado =
        estados[ativo.ativoId] ??
        (ativo.situacaoProntidao === "pronto"
          ? ativo.tipo === "comporta"
            ? "aberta"
            : "operante"
          : "manutencao");
      this.ativos.add(
        new Graphic({
          geometry: new Point({
            longitude: ativo.posicao[0],
            latitude: ativo.posicao[1],
            spatialReference: { wkid: 4326 },
          }),
          symbol: SIMBOLOS.ativo(ativo.tipo, estado),
          attributes: { ativoId: ativo.ativoId, nome: ativo.nome, estado },
        }),
      );
    }
  }

  /**
   * Realca no mapa as zonas que um ativo do gemeo digital afetaria. Chamado
   * quando o operador passa o cursor sobre o ativo no painel; com listas
   * vazias, limpa o realce.
   */
  destacarZonasGemeo(
    mundo: Mundo,
    protegidas: readonly string[],
    expostas: readonly string[],
  ): void {
    this.destaqueGemeo.removeAll();
    const porId = new Map(mundo.zonas.map((z) => [z.zonaId, z]));

    for (const [ids, efeito] of [
      [protegidas, "protege"],
      [expostas, "expoe"],
    ] as const) {
      for (const zonaId of ids) {
        const zona = porId.get(zonaId);
        if (!zona) continue;
        this.destaqueGemeo.add(
          new Graphic({
            geometry: paraPolygon(zona.geometria),
            symbol: SIMBOLOS.zonaAfetadaGemeo(efeito),
            attributes: { zonaId, efeito },
          }),
        );
      }
    }
  }

  /** Registra um pulso visual sobre uma estacao que acabou de transmitir. */
  pulsar(posicao: [number, number], agoraMs: number): void {
    this.pulsosAtivos.push({ posicao, inicio: agoraMs });
  }

  /**
   * Realca uma zona alertada com um pulso maior e mais duradouro que o de
   * estacao. "novo" = alerta candidato recem-surgido; "validado" = alerta que
   * acabou de ser validado por um operador. Pulsos expirados sao descartados
   * em desenharPulsos.
   */
  pulsarZona(centro: [number, number], agoraMs: number, tipo: TipoPulsoZona = "novo"): void {
    this.pulsosZona.push({ centro, inicio: agoraMs, tipo });
  }

  sincronizar(mundo: Mundo, estado: EstadoSimulacao): void {
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

    // As equipes sao desenhadas por quadro (desenharEquipes); aqui so
    // guardamos o alvo do tick para a animacao perseguir.
    this.despachos = estado.despachos;

    this.estacoes.removeAll();
    for (const estacao of estado.estacoes) {
      this.estacoes.add(
        new Graphic({
          geometry: new Point({
            longitude: estacao.posicao[0],
            latitude: estacao.posicao[1],
            spatialReference: { wkid: 4326 },
          }),
          symbol: SIMBOLOS.estacao(estacao.tipo, estacao.situacao),
          attributes: {
            estacaoId: estacao.estacaoId,
            nome: estacao.nome,
            situacao: estacao.situacao,
          },
        }),
      );
    }
  }

  /**
   * Redesenha as equipes de campo no cadenciamento de quadro. A posicao-alvo
   * so muda a cada tick (10 min simulados), entao interpolamos por quadro:
   * a viatura desliza ate o alvo em vez de saltar.
   */
  desenharEquipes(): void {
    const abertos = this.despachos.filter((d) => d.estado !== "concluido");

    for (const id of [...this.progressoDesenhado.keys()]) {
      if (!abertos.some((d) => d.despachoId === id)) this.progressoDesenhado.delete(id);
    }

    this.equipes.removeAll();

    for (const despacho of abertos) {
      const alvo = progressoTrajeto(despacho);
      const anterior = this.progressoDesenhado.get(despacho.despachoId) ?? 0;
      const atual =
        Math.abs(alvo - anterior) < EPSILON_EQUIPE
          ? alvo
          : anterior + (alvo - anterior) * SUAVIZACAO_EQUIPE;
      this.progressoDesenhado.set(despacho.despachoId, atual);

      const { posicao, anguloGraus } = pontoNaRota(despacho.rota, atual);

      // O percurso e desenhado em duas partes: o que ja foi vencido fica
      // apagado atras da viatura, o que falta segue tracejado a frente. E
      // assim que se le o avanco da equipe sem precisar de numero nenhum.
      const vertices = despacho.rota.pontos.map((p) => [p[0], p[1]]);
      this.equipes.add(
        new Graphic({
          geometry: new Polyline({ paths: [vertices], spatialReference: { wkid: 4326 } }),
          symbol: SIMBOLOS.trajetoPercorrido(despacho.estado),
        }),
      );
      this.equipes.add(
        new Graphic({
          geometry: new Polyline({
            paths: [trechoRestante(despacho.rota, posicao, atual)],
            spatialReference: { wkid: 4326 },
          }),
          symbol: SIMBOLOS.trajetoRestante(despacho.estado),
        }),
      );

      const ponto = new Point({
        longitude: posicao[0],
        latitude: posicao[1],
        spatialReference: { wkid: 4326 },
      });
      const atributos = {
        despachoId: despacho.despachoId,
        estacaoId: despacho.estacaoId,
        especialista: despacho.especialista,
        equipe: despacho.equipe,
        minutosRestantes: minutosRestantes(despacho),
      };

      this.equipes.add(new Graphic({ geometry: ponto, symbol: SIMBOLOS.haloEquipe(despacho.estado) }));
      this.equipes.add(
        new Graphic({
          geometry: ponto,
          symbol: SIMBOLOS.equipe(despacho.estado, anguloGraus),
          attributes: atributos,
        }),
      );
      this.equipes.add(
        new Graphic({
          geometry: ponto,
          symbol: SIMBOLOS.rotuloEquipe(rotuloDespacho(despacho), despacho.estado),
        }),
      );
    }
  }

  /** Redesenha apenas a camada de pulsos, no cadenciamento de quadro de animacao. */
  desenharPulsos(agoraMs: number): void {
    this.pulsosAtivos = this.pulsosAtivos.filter((p) => agoraMs - p.inicio < DURACAO_PULSO_MS);
    this.pulsosZona = this.pulsosZona.filter((p) => agoraMs - p.inicio < DURACAO_PULSO_ZONA_MS);

    this.pulsos.removeAll();
    for (const pulso of this.pulsosAtivos) {
      const progresso = (agoraMs - pulso.inicio) / DURACAO_PULSO_MS;
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

    for (const pulso of this.pulsosZona) {
      const base = (agoraMs - pulso.inicio) / DURACAO_PULSO_ZONA_MS;
      const geometria = new Point({
        longitude: pulso.centro[0],
        latitude: pulso.centro[1],
        spatialReference: { wkid: 4326 },
      });
      // Dois aneis defasados dao a sensacao de onda continua.
      for (const progresso of [base, base - DEFASAGEM_ANEL_ZONA]) {
        if (progresso < 0 || progresso >= 1) continue;
        this.pulsos.add(
          new Graphic({
            geometry: geometria,
            symbol: SIMBOLOS.pulsoAlerta(progresso, COR_PULSO_ZONA[pulso.tipo]),
          }),
        );
      }
    }
  }

  limpar(): void {
    for (const camada of [
      this.estaticas,
      this.mancha,
      this.zonas,
      this.ativos,
      this.estacoes,
      this.equipes,
      this.destaqueGemeo,
      this.pulsos,
    ]) {
      camada.removeAll();
    }
    this.despachos = [];
    this.progressoDesenhado.clear();
    this.pulsosAtivos = [];
    this.pulsosZona = [];
    this.montado = false;
  }
}
