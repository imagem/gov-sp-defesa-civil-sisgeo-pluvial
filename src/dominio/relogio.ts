/**
 * Relogio da simulacao. Nenhum modulo de dominio pode chamar Date.now():
 * o tempo entra sempre por aqui, para que os cenarios sejam determinicos.
 */
export class RelogioSimulado {
  private ms: number;

  constructor(inicio: Date) {
    this.ms = inicio.getTime();
  }

  get agora(): Date {
    return new Date(this.ms);
  }

  get iso(): string {
    return new Date(this.ms).toISOString();
  }

  avancarMinutos(minutos: number): void {
    this.ms += minutos * 60_000;
  }

  minutosDesde(iso: string): number {
    return (this.ms - new Date(iso).getTime()) / 60_000;
  }
}
