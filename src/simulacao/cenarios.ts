import {
  REGIAO_GUAIBA_RS,
  REGIAO_SERRA_MAR_SP,
  REGIAO_VARZEA_TIETE_SP,
  type Regiao,
} from "./regioes";

export interface Cenario {
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
  readonly requisitosDestacados: readonly string[];
  readonly semente: number;
  readonly nivelInicialM: number;
  readonly inicioIso: string;
  /**
   * Palco geografico do cenario. Determina centro do mapa, nomes de
   * sub-bacias, carteira de bairros, codigo setorial e posto fluviometrico.
   * Nao altera o motor nem a cadeia de agentes — so o "onde".
   */
  readonly regiao: Regiao;
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
    nome: "Céu limpo — Várzea do Tietê",
    descricao:
      "Rede do Alto Tietê transmitindo normalmente, sem chuva significativa. Serve para mostrar o sistema em repouso e a saúde da rede sobre a Zona Leste de São Paulo.",
    requisitosDestacados: ["RF-ING-02", "RF-NET-01"],
    semente: 1001,
    nivelInicialM: 1.8,
    inicioIso: "2026-05-01T06:00:00.000Z",
    regiao: REGIAO_VARZEA_TIETE_SP,
    perfilChuva: () => 0.2,
  },
  {
    id: "convectiva",
    nome: "Chuva convectiva — ZL de SP",
    descricao:
      "Célula intensa e curta sobre a Zona Leste de São Paulo. O limiar observado dispara, e o agente antifadiga agrupa a reincidência em vez de criar alerta novo.",
    requisitosDestacados: ["RF-ALT-02", "RF-ALT-05"],
    semente: 1002,
    nivelInicialM: 2.1,
    inicioIso: "2026-05-01T14:00:00.000Z",
    regiao: REGIAO_VARZEA_TIETE_SP,
    perfilChuva: (h) => (h >= 1 && h <= 4 ? 28 : 1),
  },
  {
    id: "serra-orografica",
    nome: "Frente orográfica — Serra do Mar",
    descricao:
      "Chuva orográfica persistente sobre a encosta. A mancha avança sobre bairros de risco do Litoral Norte paulista e o geofencing preditivo antecipa o alerta de deslizamento — evoca o episódio de fevereiro de 2023 em São Sebastião.",
    requisitosDestacados: ["RF-MOD-02", "RF-MOD-04", "RF-ALT-03"],
    semente: 1006,
    nivelInicialM: 2.4,
    inicioIso: "2026-02-18T20:00:00.000Z",
    regiao: REGIAO_SERRA_MAR_SP,
    perfilChuva: (h) => (h < 2 ? 8 : h < 14 ? 30 : 12),
  },
  {
    id: "rede-degradada",
    nome: "Falha na rede — Litoral Norte",
    descricao:
      "Estações do Litoral Norte param de transmitir durante uma frente. O painel de saúde expõe a lacuna e o sistema continua operando com o que resta.",
    requisitosDestacados: ["RF-NET-01", "RNF-06"],
    semente: 1004,
    nivelInicialM: 2.4,
    inicioIso: "2026-05-01T02:00:00.000Z",
    regiao: REGIAO_SERRA_MAR_SP,
    perfilChuva: (h) => (h < 3 ? 6 : 22),
    falhaEstacaoNoMinuto: 120,
  },
  {
    id: "dado-sujo",
    nome: "Leitura implausível no Tietê",
    descricao:
      "Um sensor da várzea envia 2000 mm/h. O controle de qualidade reprova, mantém o registro e impede que a leitura vire alerta.",
    requisitosDestacados: ["RF-ING-04"],
    semente: 1005,
    nivelInicialM: 2,
    inicioIso: "2026-05-01T09:00:00.000Z",
    regiao: REGIAO_VARZEA_TIETE_SP,
    perfilChuva: () => 4,
    leituraAbsurdaNoMinuto: 40,
  },
  {
    id: "extremo",
    nome: "Enchente Guaíba — maio/2024",
    descricao:
      "Reconstrução didática do evento histórico de maio de 2024 em Porto Alegre: chuva persistente eleva a cota, a mancha alcança as zonas de risco e o geofencing preditivo antecipa o alerta. Mantido no catálogo como palco de origem desta demonstração; o relógio da simulação roda no horizonte dos demais cenários (2026) para honrar a vigência dos limiares semeados em `mundo.ts`.",
    requisitosDestacados: ["RF-MOD-02", "RF-MOD-04", "RF-ALT-03"],
    semente: 1003,
    nivelInicialM: 2.6,
    inicioIso: "2026-04-30T18:00:00.000Z",
    regiao: REGIAO_GUAIBA_RS,
    perfilChuva: (h) => (h < 2 ? 8 : h < 14 ? 34 : 12),
  },
];
