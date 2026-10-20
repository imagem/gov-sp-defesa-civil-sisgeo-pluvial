import { describe, expect, it } from "vitest";
import {
  contarBloqueados,
  moduloAtivoRecente,
  resumirAgentes,
  resumirAlertas,
  resumirEstacoes,
} from "./resumosPainel";

describe("resumirEstacoes", () => {
  it("conta operantes e silenciosas separadamente", () => {
    const estacoes = [
      { situacao: "operante" as const },
      { situacao: "operante" as const },
      { situacao: "silenciosa" as const },
      { situacao: "degradada" as const },
    ];
    expect(resumirEstacoes(estacoes)).toEqual({ operantes: 2, silenciosas: 1 });
  });

  it("retorna zeros para lista vazia", () => {
    expect(resumirEstacoes([])).toEqual({ operantes: 0, silenciosas: 0 });
  });
});

describe("resumirAgentes", () => {
  it("agrupa trabalhando+alerta, bloqueado+falha e ociosos", () => {
    const agentes = [
      { status: "trabalhando" as const },
      { status: "alerta" as const },
      { status: "bloqueado" as const },
      { status: "falha" as const },
      { status: "ocioso" as const },
      { status: "ocioso" as const },
    ];
    expect(resumirAgentes(agentes)).toEqual({ trabalhando: 2, bloqueado: 2, ociosos: 2 });
  });
});

describe("resumirAlertas", () => {
  it("conta candidatos como aguardando validacao e expedido+atualizado como expedidos", () => {
    const alertas = [
      { estado: "candidato" as const },
      { estado: "candidato" as const },
      { estado: "expedido" as const },
      { estado: "atualizado" as const },
      { estado: "encerrado" as const },
    ];
    expect(resumirAlertas(alertas)).toEqual({ aguardandoValidacao: 2, expedidos: 2 });
  });
});

describe("contarBloqueados", () => {
  it("conta somente status bloqueado, nao falha", () => {
    const agentes = [{ status: "bloqueado" as const }, { status: "falha" as const }];
    expect(contarBloqueados(agentes)).toBe(1);
  });
});

describe("moduloAtivoRecente", () => {
  it("retorna o modulo do agente que publicou o evento mais recente", () => {
    const eventos = [{ agenteId: "agente-limiar" }];
    const agentes = [
      { id: "agente-limiar", modulo: "ALT" as const },
      { id: "agente-rede", modulo: "NET" as const },
    ];
    expect(moduloAtivoRecente(eventos, agentes)).toBe("ALT");
  });

  it("retorna null quando nao ha eventos recentes", () => {
    expect(moduloAtivoRecente([], [])).toBeNull();
  });

  it("retorna null quando o agente do evento nao e encontrado", () => {
    expect(moduloAtivoRecente([{ agenteId: "desconhecido" }], [])).toBeNull();
  });
});
