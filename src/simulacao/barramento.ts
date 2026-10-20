export type TipoEvento =
  | "leitura.ingerida"
  | "leitura.reprovada"
  | "estacao.silenciosa"
  | "estacao.restabelecida"
  | "equipe.despachada"
  | "equipe.chegou"
  | "equipe.concluiu"
  | "previsao.gerada"
  | "mancha.gerada"
  | "limiar.atingido"
  | "alerta.criado"
  | "alerta.agrupado"
  | "alerta.encerrado"
  | "alerta.validado"
  | "alerta.descartado"
  | "alerta.expedido"
  | "expedicao.bloqueada"
  | "boletim.rascunho"
  | "boletim.aprovado"
  | "ferramenta.invocada"
  | "cenario.iniciado";

export interface Evento<C = unknown> {
  readonly eventoId: string;
  readonly tipo: TipoEvento;
  readonly agenteId: string;
  readonly ts: string;
  readonly correlacaoId?: string;
  readonly titulo: string;
  readonly carga: C;
}

type Ouvinte = (evento: Evento) => void;

/**
 * Barramento de eventos do enxame de agentes.
 * O historico acumulado E a trilha de auditoria do SPEC-H1 (RF-GOV-02):
 * imutavel para quem consome e reconstituivel por correlacao.
 */
export class Barramento {
  private readonly ouvintesPorTipo = new Map<TipoEvento, Set<Ouvinte>>();
  private readonly ouvintesGlobais = new Set<Ouvinte>();
  private readonly eventos: Evento[] = [];

  publicar(evento: Evento): void {
    this.eventos.push(evento);
    const alvos = [...(this.ouvintesPorTipo.get(evento.tipo) ?? []), ...this.ouvintesGlobais];
    for (const ouvinte of alvos) {
      try {
        ouvinte(evento);
      } catch (erro) {
        // RNF-06: um agente com defeito nao derruba o enxame.
        // A falha e visivel no console, nunca engolida em silencio.
        console.error(`[barramento] ouvinte falhou em "${evento.tipo}":`, erro);
      }
    }
  }

  assinar(tipo: TipoEvento, ouvinte: Ouvinte): () => void {
    const conjunto = this.ouvintesPorTipo.get(tipo) ?? new Set<Ouvinte>();
    conjunto.add(ouvinte);
    this.ouvintesPorTipo.set(tipo, conjunto);
    return () => conjunto.delete(ouvinte);
  }

  assinarTudo(ouvinte: Ouvinte): () => void {
    this.ouvintesGlobais.add(ouvinte);
    return () => this.ouvintesGlobais.delete(ouvinte);
  }

  historico(): readonly Evento[] {
    return Object.freeze([...this.eventos]);
  }

  porCorrelacao(correlacaoId: string): Evento[] {
    return this.eventos.filter((e) => e.correlacaoId === correlacaoId);
  }

  limpar(): void {
    this.eventos.length = 0;
  }
}
