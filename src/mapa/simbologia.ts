import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol.js";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol.js";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol.js";
import TextSymbol from "@arcgis/core/symbols/TextSymbol.js";
import type { EstadoDespacho } from "@/dominio/despacho";
import type { EstacaoMonitoramento, SituacaoEstacao } from "@/dominio/tipos";

/**
 * Viatura vista DE CIMA, apontada para o norte: o marcador e girado pelo rumo
 * do segmento em que a equipe esta, entao a silhueta precisa ser a de um carro
 * visto do alto (capo, cabine, porta-malas), nao de perfil. Um carro de perfil
 * girado parece tombar na curva.
 */
const GLIFO_VIATURA =
  "M11 2h10l2 6v19a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3V8l2-6z M13 9h6v5h-6V9z";

/** Cor do marcador e do rotulo da equipe, por etapa do despacho. */
const COR_DESPACHO: Record<EstadoDespacho, [number, number, number]> = {
  preparando: [203, 213, 225],
  a_caminho: [251, 191, 36],
  em_atendimento: [56, 189, 248],
  concluido: [52, 211, 153],
};

const COR_SITUACAO: Record<SituacaoEstacao, [number, number, number]> = {
  operante: [52, 211, 153],
  degradada: [251, 191, 36],
  silenciosa: [244, 63, 94],
  desativada: [120, 130, 150],
};

/*
 * Glifos dos marcadores. Todos desenhados num quadro 0..32 — o ArcGIS
 * normaliza o path pelo `size` do simbolo.
 *
 * A FORMA diz o que a coisa e; a COR diz como ela esta. Antes, estacoes e
 * ativos eram circulos, quadrados e losangos coloridos: a cor carregava os
 * dois papeis ao mesmo tempo e o operador precisava da legenda para ler o
 * mapa. Com silhuetas distintas, o tipo e reconhecivel mesmo em preto e
 * branco, e a cor fica livre para significar so a situacao.
 */

/** Pluviometro: funil de captacao sobre o coletor. */
const GLIFO_PLUVIOMETRO = "M3 4h26l-9 12v12a4 4 0 0 1-8 0V16L3 4z";

/** Regua limnimetrica: haste graduada, com os tracos da escala. */
const GLIFO_REGUA =
  "M11 2h8v28h-8V2z M19 6h7v3h-7z M19 13h7v3h-7z M19 20h7v3h-7z";

/** Comporta: duas vigas e as tres pranchas que descem entre elas. */
const GLIFO_COMPORTA =
  "M2 5h28v5H2V5z M2 25h28v5H2v-5z M6 10h5v15H6V10z M13.5 10h5v15h-5V10z M21 10h5v15h-5V10z";

/** EBAP: seta de recalque — a estacao levanta a agua para fora da celula. */
const GLIFO_EBAP = "M16 2 30 18h-8v12H10V18H2L16 2z";

export const SIMBOLOS = {
  /*
   * Sub-bacia: contorno TRACEJADO, sem preenchimento. E um limite
   * administrativo-hidrografico, nao uma area de agua — preenchida de azul
   * claro ela era lida como "mais mancha de inundacao", que e justamente o
   * que ela nao e. Sem preenchimento, nada compete com a mancha.
   */
  subBacia: new SimpleFillSymbol({
    color: [0, 0, 0, 0],
    outline: new SimpleLineSymbol({
      style: "dash",
      color: [148, 163, 184, 0.85],
      width: 1.2,
    }),
  }),

  /*
   * Corredor fluvial: faixa estreita de agua permanente, em azul-petroleo
   * saturado e com contorno continuo fino. A mancha de inundacao, por cima,
   * e sempre mais clara e tem contorno grosso — a leitura e "o rio e isto;
   * o que transborda dele e aquilo".
   */
  corredor: new SimpleFillSymbol({
    color: [14, 116, 144, 0.55],
    outline: new SimpleLineSymbol({ color: [103, 232, 249, 0.9], width: 1 }),
  }),

  /**
   * Mancha afetada pelo evento. "agua" (azul fluvial) e o padrao de bacia
   * ribeirinha; "encosta" (ocre/terra) representa massa de solo mobilizada
   * em escorregamentos, apropriado para a Serra do Mar.
   */
  mancha: (intensidade: number, paleta: "agua" | "encosta" = "agua") => {
    const alfa = Math.min(0.18 + intensidade * 0.32, 0.55);
    const corInterna: [number, number, number] =
      paleta === "encosta" ? [161, 98, 7] : [59, 130, 246];
    const corContorno: [number, number, number] =
      paleta === "encosta" ? [217, 119, 6] : [147, 197, 253];
    return new SimpleFillSymbol({
      color: [...corInterna, alfa],
      outline: new SimpleLineSymbol({ color: [...corContorno, 0.95], width: 2 }),
    });
  },

  /**
   * Zona de risco. A cor base agora depende do TIPO (inundacao vs
   * deslizamento) alem do grau de risco; alerta ativo prevalece sobre
   * ambos. Inundacao usa a paleta amarelo/laranja original (bacias
   * ribeirinhas); deslizamento usa vermelho-terra/tijolo, que distingue
   * sem precisar de legenda.
   */
  zona: (
    grauRisco: "alto" | "muito_alto",
    tipo: "inundacao" | "deslizamento",
    sobAlerta: boolean,
  ) => {
    if (sobAlerta) {
      return new SimpleFillSymbol({
        color: [244, 63, 94, 0.4],
        outline: new SimpleLineSymbol({ color: [244, 63, 94, 1], width: 2.5 }),
      });
    }
    if (tipo === "deslizamento") {
      return new SimpleFillSymbol({
        color: grauRisco === "muito_alto" ? [185, 28, 28, 0.22] : [220, 38, 38, 0.14],
        outline: new SimpleLineSymbol({ color: [185, 28, 28, 0.8], width: 1.2 }),
      });
    }
    return new SimpleFillSymbol({
      color: grauRisco === "muito_alto" ? [251, 146, 60, 0.18] : [251, 191, 36, 0.12],
      outline: new SimpleLineSymbol({ color: [251, 191, 36, 0.7], width: 1 }),
    });
  },

  /**
   * Estacao de monitoramento: a silhueta diz o que ela mede (funil de
   * pluviometro, regua de nivel) e a cor diz como ela esta.
   */
  estacao: (tipo: EstacaoMonitoramento["tipo"], situacao: SituacaoEstacao) =>
    new SimpleMarkerSymbol({
      style: "path",
      path: tipo === "pluviometrica" ? GLIFO_PLUVIOMETRO : GLIFO_REGUA,
      size: situacao === "silenciosa" ? 13 : 11,
      color: [...COR_SITUACAO[situacao], 1],
      outline: { color: [7, 11, 20, 0.95], width: 1 },
    }),

  /** Anel de pulso desenhado sobre a estacao que acabou de transmitir. */
  pulso: (progresso: number) =>
    new SimpleMarkerSymbol({
      style: "circle",
      size: 8 + progresso * 26,
      color: [0, 0, 0, 0],
      outline: { color: [56, 189, 248, Math.max(0, 0.85 - progresso)], width: 2 },
    }),

  /**
   * Anel de pulso de ZONA: maior e mais forte que o da estacao, com halo
   * translucido que se dissipa. Cor definida pelo tipo do evento
   * (novo alerta = vermelho, validado = verde).
   */
  pulsoAlerta: (progresso: number, cor: readonly [number, number, number]) =>
    new SimpleMarkerSymbol({
      style: "circle",
      size: 28 + progresso * 110,
      color: [cor[0], cor[1], cor[2], Math.max(0, 0.22 * (1 - progresso))],
      outline: {
        color: [cor[0], cor[1], cor[2], Math.max(0, 1 - progresso * 0.9)],
        width: 3.5 - progresso * 1.5,
      },
    }),

  /**
   * Realce de zona afetada por um ativo do gemeo digital, ao passar o cursor
   * sobre ele no painel. Verde = a acao protege esta zona; ambar = a acao
   * represa agua e passa a expor esta zona.
   */
  zonaAfetadaGemeo: (efeito: "protege" | "expoe") => {
    const cor: [number, number, number] = efeito === "protege" ? [52, 211, 153] : [251, 191, 36];
    return new SimpleFillSymbol({
      color: [...cor, 0.3],
      outline: new SimpleLineSymbol({ color: [...cor, 1], width: 3 }),
    });
  },

  /** Percurso ja vencido pela equipe: traco continuo e apagado. */
  trajetoPercorrido: (estado: EstadoDespacho) =>
    new SimpleLineSymbol({
      color: [...COR_DESPACHO[estado], 0.3],
      width: 2,
    }),

  /** Percurso que falta: tracejado, do ponto atual ate a estacao. */
  trajetoRestante: (estado: EstadoDespacho) =>
    new SimpleLineSymbol({
      style: "short-dash",
      color: [...COR_DESPACHO[estado], 0.75],
      width: 1.8,
    }),

  /** Halo sob a viatura, para destacar a equipe de qualquer basemap. */
  haloEquipe: (estado: EstadoDespacho) =>
    new SimpleMarkerSymbol({
      style: "circle",
      size: 24,
      color: [...COR_DESPACHO[estado], 0.22],
      outline: { color: [...COR_DESPACHO[estado], 0.75], width: 1.2 },
    }),

  /** Viatura da equipe, posicionada e GIRADA conforme o rumo do percurso. */
  equipe: (estado: EstadoDespacho, anguloGraus: number) =>
    new SimpleMarkerSymbol({
      style: "path",
      path: GLIFO_VIATURA,
      size: 15,
      angle: anguloGraus,
      color: [...COR_DESPACHO[estado], 1],
      outline: { color: [7, 11, 20, 0.9], width: 1 },
    }),

  /**
   * Rotulo acima da viatura: nome do especialista e tempo restante. Fonte
   * pequena e vivida, com halo escuro para continuar legivel sobre satelite.
   */
  rotuloEquipe: (texto: string, estado: EstadoDespacho) =>
    new TextSymbol({
      text: texto,
      color: [...COR_DESPACHO[estado], 1],
      haloColor: [7, 11, 20, 0.85],
      haloSize: 1.6,
      yoffset: 16,
      font: { size: 9, weight: "bold", family: "sans-serif" },
    }),

  /**
   * Ativo de protecao: a silhueta diz o que e (comporta ou EBAP) e a cor diz
   * o estado operacional no gemeo digital — verde = mitigando (comporta
   * fechada / EBAP operante), ambar = em manutencao, neutro = disponivel mas
   * sem mitigar (aberta / desligada).
   */
  ativo: (tipo: "comporta" | "ebap", estado: string) => {
    const mitigando = estado === "fechada" || estado === "operante";
    const manutencao = estado === "manutencao" || estado === "inoperante";
    const cor: [number, number, number] = manutencao
      ? [251, 191, 36]
      : mitigando
        ? [52, 211, 153]
        : [226, 232, 240];
    return new SimpleMarkerSymbol({
      style: "path",
      path: tipo === "comporta" ? GLIFO_COMPORTA : GLIFO_EBAP,
      size: mitigando ? 15 : 13,
      color: [...cor, 1],
      outline: {
        color: mitigando ? [16, 185, 129, 1] : [7, 11, 20, 0.95],
        width: mitigando ? 1.6 : 1,
      },
    });
  },
} as const;
