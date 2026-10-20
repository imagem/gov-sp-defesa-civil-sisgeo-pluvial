import type { Coordenada } from "@/dominio/geometria";

/**
 * Recorte geografico sobre o qual um cenario e simulado. A geometria do mundo
 * continua sendo sintetica e procedural (ver `mundo.ts`); a regiao so define
 * o palco: centro do mapa, nomes das sub-bacias que o `mundo` usa como rotulo,
 * carteira de bairros plausiveis para as zonas de risco, prefixo e base
 * numerica do codigo setorial, e identificador do posto fluviometrico.
 *
 * Ter esse conceito explicito e o que permite rodar a mesma demonstracao em
 * Varzea do Tiete, Serra do Mar/Baixada Santista ou Porto Alegre sem tocar na
 * fisica do motor — e deixa o caminho aberto para um seletor de regiao no
 * cabecalho (ver docs/ROADMAP.md).
 */
export interface Regiao {
  readonly id: string;
  readonly nome: string;
  readonly uf: "SP" | "RS";
  readonly centro: Coordenada;
  readonly subBacias: readonly string[];
  readonly bairros: readonly string[];
  /** Prefixo literal do codigo setorial sintetico (ex.: "SGB-SP-RMSP"). */
  readonly prefixoSgb: string;
  /** Deslocamento numerico inicial usado para formar o codigo setorial. */
  readonly baseSetor: number;
  /** Identificador do posto fluviometrico de referencia da regiao. */
  readonly postoId: string;
  /**
   * Setor angular (em radianos, convencao matematica: 0 = leste, pi/2 = norte)
   * no qual as sub-bacias sao distribuidas em volta do centro. Default: anel
   * completo `[0, 2*PI]`. Use para evitar que a geometria procedural caia em
   * areas sem territorio — por exemplo, numa regiao costeira o oceano fica
   * no setor sul e deve ficar fora do arco.
   */
  readonly setorAngularRad?: readonly [number, number];
  /**
   * Probabilidade (0..1) de cada zona ser classificada como deslizamento. O
   * complemento vira inundacao. Default: 0.25 — maior parte das zonas e
   * inundacao, consistente com uma bacia hidrica urbana. Serra do Mar
   * inverte essa logica (predominantemente deslizamento).
   */
  readonly pesoDeslizamento?: number;
  /**
   * Paleta usada para a mancha. "agua" = azul fluvial (padrao de regiao
   * ribeirinha); "encosta" = ocre/terra, apropriado para massa de solo em
   * escorregamento. Default: "agua".
   */
  readonly paletaMancha?: "agua" | "encosta";
  /**
   * Oculta a regiao do seletor de regioes no cabecalho. Util para manter um
   * palco historico no catalogo (acessivel pelo codigo dos cenarios) sem que
   * ele apareca para a plateia.
   */
  readonly oculta?: boolean;
}

/**
 * Varzea do Tiete, Regiao Metropolitana de Sao Paulo. Palco padrao da demo —
 * casa com a cena operacional da CGE-SP e Defesa Civil estadual e cobre
 * bairros da Zona Leste com historico de alagamento.
 */
export const REGIAO_VARZEA_TIETE_SP: Regiao = {
  id: "sp-varzea-tiete",
  nome: "Várzea do Tietê, SP",
  uf: "SP",
  centro: [-46.56, -23.52],
  subBacias: ["Alto Tietê", "Tamanduateí", "Aricanduva", "Rio Pinheiros"],
  bairros: [
    "Penha", "Vila Formosa", "Belém", "Mooca", "Vila Prudente",
    "Água Rasa", "Tatuapé", "Carrão", "Vila Matilde", "Aricanduva",
    "Vila Jacuí", "São Miguel Paulista", "Ermelino Matarazzo", "Cangaíba",
  ],
  prefixoSgb: "SGB-SP-RMSP",
  baseSetor: 3550,
  postoId: "P-TIETE-EDU-01",
};

/**
 * Serra do Mar / Baixada Santista, SP. Recorte orientado a eventos
 * orograficos e deslizamentos sobre a vertente paulista da Serra. Centrada em
 * Cubatao para enquadrar da planicie da Baixada Santista ate as encostas do
 * Grande ABC, e com `setorAngularRad` restrito ao semicirculo norte: o
 * quadrante sul do centro cai no oceano e precisa ficar de fora.
 */
export const REGIAO_SERRA_MAR_SP: Regiao = {
  id: "sp-serra-mar",
  nome: "Serra do Mar / Baixada Santista, SP",
  uf: "SP",
  centro: [-46.42, -23.88],
  subBacias: [
    "Rio Cubatão",
    "Rio Mogi",
    "Serra do Mar — vertente ABC",
    "Rio das Pedras",
  ],
  bairros: [
    "Vila dos Pescadores", "Vila Esperança", "Pilões", "Vila Natal", "Fabril",
    "Vila São José", "Vila Nova", "Chico de Paula",
    "Vicente de Carvalho", "Perequê",
    "Catiapoã", "Macuco", "Marapé", "Riacho Grande",
  ],
  prefixoSgb: "SGB-SP-BS",
  baseSetor: 3548,
  postoId: "P-RIO-CUBATAO-01",
  setorAngularRad: [0, Math.PI],
  pesoDeslizamento: 0.75,
  paletaMancha: "encosta",
};

/**
 * Guaíba, Porto Alegre — RS. Palco historico-didatico: a demo inteira foi
 * prototipada aqui, e manter o recorte como cenario preserva o case real da
 * enchente de maio de 2024 ao lado dos cenarios paulistas.
 */
export const REGIAO_GUAIBA_RS: Regiao = {
  id: "rs-guaiba",
  nome: "Guaíba, Porto Alegre — RS",
  uf: "RS",
  centro: [-51.22, -30.03],
  subBacias: ["Alto Taquari", "Médio Antas", "Baixo Caí", "Arroio Dilúvio"],
  bairros: [
    "Partenon", "Glória", "Sarandi", "Restinga", "Lomba do Pinheiro",
    "Cristal", "Navegantes", "Humaitá", "Rubem Berta", "Bom Jesus",
    "Cavalhada", "Belém Novo", "Ipanema", "Tristeza",
  ],
  prefixoSgb: "SGB-RS",
  baseSetor: 4300,
  postoId: "P-GUAIBA-01",
  pesoDeslizamento: 0.1,
  oculta: true,
};

export const REGIOES: readonly Regiao[] = [
  REGIAO_VARZEA_TIETE_SP,
  REGIAO_SERRA_MAR_SP,
  REGIAO_GUAIBA_RS,
];

/** So as regioes visiveis no seletor do cabecalho. Oculta nao e deletada: continua ativa pelo cenario que a usa. */
export const REGIOES_VISIVEIS: readonly Regiao[] = REGIOES.filter((r) => !r.oculta);

export function acharRegiao(id: string): Regiao | undefined {
  return REGIOES.find((r) => r.id === id);
}
