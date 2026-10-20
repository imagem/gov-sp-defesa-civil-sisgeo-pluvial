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
    nome: "Céu limpo",
    descricao:
      "Rede transmitindo normalmente, sem chuva significativa. Serve para mostrar o sistema em repouso e a saúde da rede.",
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
      "Célula intensa e curta. O limiar observado dispara, e o agente antifadiga agrupa a reincidência em vez de criar alerta novo.",
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
      "Chuva persistente que eleva a cota e faz a mancha alcançar as zonas de risco. O geofencing preditivo antecipa o alerta.",
    requisitosDestacados: ["RF-MOD-02", "RF-MOD-04", "RF-ALT-03"],
    semente: 1003,
    nivelInicialM: 2.6,
    inicioIso: "2026-04-30T18:00:00.000Z",
    perfilChuva: (h) => (h < 2 ? 8 : h < 14 ? 34 : 12),
  },
  {
    id: "rede-degradada",
    nome: "Falha na rede de estações",
    descricao:
      "Estações param de transmitir durante o evento. O painel de saúde expõe a lacuna e o sistema continua operando com o que resta.",
    requisitosDestacados: ["RF-NET-01", "RNF-06"],
    semente: 1004,
    nivelInicialM: 2.4,
    inicioIso: "2026-05-01T02:00:00.000Z",
    perfilChuva: (h) => (h < 3 ? 6 : 22),
    falhaEstacaoNoMinuto: 120,
  },
  {
    id: "dado-sujo",
    nome: "Leitura implausível",
    descricao:
      "Um sensor envia 2000 mm/h. O controle de qualidade reprova, mantém o registro e impede que a leitura vire alerta.",
    requisitosDestacados: ["RF-ING-04"],
    semente: 1005,
    nivelInicialM: 2,
    inicioIso: "2026-05-01T09:00:00.000Z",
    perfilChuva: () => 4,
    leituraAbsurdaNoMinuto: 40,
  },
];
