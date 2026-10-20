import type { StatusAgente } from "@/agentes/tipos";
import { useSimulacao } from "@/estado/store";
import { descreverAtividade } from "./agentesDidatico";
import Painel from "./Painel";
import { resumirAgentes } from "./resumosPainel";

const COR: Record<StatusAgente, string> = {
  ocioso: "var(--cor-texto-fraco)",
  trabalhando: "var(--cor-acento)",
  alerta: "var(--cor-alta)",
  bloqueado: "var(--cor-critica)",
  falha: "var(--cor-critica)",
};

export default function PainelAgentes() {
  const motor = useSimulacao((s) => s.motor);
  useSimulacao((s) => s.versao);
  const modoTecnico = useSimulacao((s) => s.modoTecnico);
  const irPara = useSimulacao((s) => s.irPara);

  const agentes = motor.agentes;
  const { trabalhando, bloqueado, ociosos } = resumirAgentes(agentes);

  return (
    <Painel
      titulo={`Agentes especialistas (${agentes.length})`}
      aberto
      aoFechar={() => irPara("operacional")}
      info={
        <>
          Cada agente cuida de uma etapa e entrega o resultado ao seguinte.{" "}
          <b style={{ color: "var(--cor-acento) " }}>Azul</b> = trabalhando,{" "}
          <b style={{ color: "var(--cor-critica)" }}>vermelho pulsante</b> = bloqueado aguardando
          decisão humana, cinza = ocioso neste passo. O número à direita é quantas execuções de
          trabalho o agente já acumulou.
        </>
      }
    >
      <div className="painel-faixa-situacao">
        <span className="chip">
          <span className="chip-ponto" style={{ background: "var(--cor-acento)" }} />
          <b>{trabalhando}</b>&nbsp;trabalhando
        </span>
        {bloqueado > 0 ? (
          <span className="chip">
            <span className="chip-ponto" style={{ background: "var(--cor-critica)" }} />
            <b>{bloqueado}</b>&nbsp;bloqueado{bloqueado > 1 ? "s" : ""}
          </span>
        ) : null}
        <span className="chip">
          <span className="chip-ponto" style={{ background: "var(--cor-texto-fraco)" }} />
          <b>{ociosos}</b>&nbsp;ocioso{ociosos !== 1 ? "s" : ""}
        </span>
      </div>

      <p className="painel-intro">
        Um enxame de agentes especialistas atua em sequência sobre o dado: ingestão, qualidade,
        rede, modelagem, limiar e geofencing, antifadiga, redator, expedição e auditoria. Cada um
        faz uma parte e passa o resultado adiante.
      </p>
      <ol className="lista-agentes">
        {agentes.map((agente, i) => (
          <li
            key={agente.id}
            style={{
              display: "grid",
              gridTemplateColumns: "8px 1fr auto",
              gap: 9,
              alignItems: "start",
              padding: "7px 9px",
              borderRadius: 8,
              background: "var(--superficie-fraca)",
            }}
            title={agente.descricao}
          >
            <span
              className={agente.status === "bloqueado" ? "pulsando" : undefined}
              style={{
                width: 8,
                height: 8,
                marginTop: 4,
                borderRadius: "50%",
                background: COR[agente.status],
              }}
            />
            <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 12 }}>
                <span style={{ color: "var(--cor-texto-fraco)", marginRight: 4 }}>{i + 1}.</span>
                {agente.nome}
                <span style={{ fontSize: 9, color: "var(--cor-texto-fraco)", marginLeft: 6 }}>
                  {agente.modulo}
                </span>
              </span>
              <span style={{ fontSize: 11, color: "var(--cor-texto-fraco)", lineHeight: 1.35 }}>
                {agente.descricao}
              </span>
              <span style={{ fontSize: 11.5, color: "var(--cor-acento)", lineHeight: 1.35 }}>
                {descreverAtividade(agente, motor.estado)}
              </span>
              {modoTecnico && agente.requisitos.length > 0 ? (
                <span
                  style={{
                    fontFamily: "var(--fonte-mono)",
                    fontSize: 9.5,
                    color: "var(--cor-texto-fraco)",
                  }}
                >
                  {agente.requisitos.join(" · ")}
                </span>
              ) : null}
            </span>
            <span
              title="Execuções de trabalho"
              style={{ fontFamily: "var(--fonte-mono)", fontSize: 10, color: "var(--cor-texto-fraco)" }}
            >
              {agente.contadorTrabalho}
            </span>
          </li>
        ))}
      </ol>
    </Painel>
  );
}
