import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { selecionarEventosRecentes, useSimulacao } from "@/estado/store";
import type { TipoEvento } from "@/simulacao/barramento";
import Painel from "./Painel";
import { rotulo } from "./textos";

const COR: Partial<Record<TipoEvento, string>> = {
  "leitura.reprovada": "var(--cor-atencao)",
  "estacao.silenciosa": "var(--cor-critica)",
  "limiar.atingido": "var(--cor-alta)",
  "alerta.criado": "var(--cor-alta)",
  "expedicao.bloqueada": "var(--cor-critica)",
  "alerta.validado": "var(--cor-ok)",
  "alerta.expedido": "var(--cor-ok)",
  "alerta.encerrado": "var(--cor-ok)",
  "boletim.aprovado": "var(--cor-ok)",
  "mancha.gerada": "var(--cor-acento)",
};

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TrilhaAuditoria() {
  const motor = useSimulacao((s) => s.motor);
  // useShallow evita o loop de renderizacao infinito do useSyncExternalStore:
  // selecionarEventosRecentes cria um array novo a cada chamada, e sem cache
  // por igualdade rasa o React nunca considera o snapshot estavel.
  const eventos = useSimulacao(useShallow((s) => selecionarEventosRecentes(s, 40)));
  useSimulacao((s) => s.versao);
  const [aberto, setAberto] = useState(true);
  const modoTecnico = useSimulacao((s) => s.modoTecnico);

  const totalEventos = motor.barramento.historico().length;
  const ultimo = eventos[0];

  return (
    <Painel
      titulo={rotulo("auditoria", modoTecnico)}
      aberto={aberto}
      aoAlternar={() => setAberto((v) => !v)}
      info={
        <>
          Tudo o que aconteceu na sala, em ordem, com hora, agente responsável e identificador de
          correlação (RF-GOV-02). É o que permite reconstituir depois por que um alerta foi — ou
          não foi — expedido. A cor indica a natureza do evento: verde para decisão concluída,
          laranja para alerta nascendo, vermelho para bloqueio ou falha de rede.
        </>
      }
      resumo={
        <>
          <span className="chip">
            <b>{totalEventos}</b>&nbsp;evento{totalEventos === 1 ? "" : "s"}
          </span>
          {ultimo ? (
            <span
              style={{
                fontSize: 11,
                color: COR[ultimo.tipo] ?? "var(--cor-texto)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {"●"} ultimo: {ultimo.titulo}
            </span>
          ) : null}
          {ultimo ? (
            <span
              style={{
                fontSize: 10,
                color: "var(--cor-texto-fraco)",
                fontFamily: "var(--fonte-mono)",
                marginLeft: "auto",
              }}
            >
              {hora(ultimo.ts)}
            </span>
          ) : null}
        </>
      }
    >
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 5 }}>
        {eventos.map((evento) => (
          <li
            key={evento.eventoId}
            style={{
              display: "grid",
              gridTemplateColumns: "42px 1fr",
              gap: 8,
              fontSize: 10.5,
              paddingBottom: 5,
              borderBottom: "1px solid var(--divisor-fraco)",
            }}
          >
            <span style={{ fontFamily: "var(--fonte-mono)", color: "var(--cor-texto-fraco)" }}>
              {hora(evento.ts)}
            </span>
            <span>
              <span style={{ color: COR[evento.tipo] ?? "var(--cor-texto)" }}>{evento.titulo}</span>
              <span style={{ display: "block", color: "var(--cor-texto-fraco)", fontSize: 9.5 }}>
                {evento.agenteId}
                {evento.correlacaoId ? ` · ${evento.correlacaoId}` : ""}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </Painel>
  );
}
