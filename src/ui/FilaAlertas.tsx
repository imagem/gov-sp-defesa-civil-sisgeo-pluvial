import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useShallow } from "zustand/react/shallow";
import type { Alerta } from "@/dominio/tipos";
import { selecionarAlertasAtivos, useSimulacao } from "@/estado/store";
import Painel from "./Painel";
import { rotulo } from "./textos";
import { resumirAlertas } from "./resumosPainel";
import { COR_SEVERIDADE, ROTULO_ESTADO } from "./severidade";

function CartaoAlerta({ alerta }: { alerta: Alerta }) {
  const motor = useSimulacao((s) => s.motor);
  const validarAlerta = useSimulacao((s) => s.validarAlerta);
  const descartarAlerta = useSimulacao((s) => s.descartarAlerta);
  const abrirBoletim = useSimulacao((s) => s.abrirBoletim);
  const abrirDossie = useSimulacao((s) => s.abrirDossieAlerta);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const zona = motor.mundo.zonas.find((z) => z.zonaId === alerta.zonaId);
  const boletim = motor.estado.boletins.find((b) => b.alertaId === alerta.alertaId);
  const aguardando = alerta.estado === "candidato";

  function aoDescartar() {
    try {
      descartarAlerta(alerta.alertaId, motivo);
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "falha ao descartar");
    }
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 22 }}
      className="vidro"
      style={{
        padding: "var(--espaco-3)",
        borderLeft: `3px solid ${COR_SEVERIDADE[alerta.severidade]}`,
        listStyle: "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <strong style={{ fontSize: 12.5 }}>
          {zona?.nome ?? alerta.zonaId}
          <span style={{ color: "var(--cor-texto-fraco)", fontWeight: 400, marginLeft: 6 }}>
            {alerta.alertaId}
          </span>
        </strong>
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            color: COR_SEVERIDADE[alerta.severidade],
            whiteSpace: "nowrap",
          }}
        >
          {alerta.severidade.replace("_", " ").toUpperCase()}
        </span>
      </div>

      <div
        className={aguardando ? "pulsando" : undefined}
        style={{
          fontSize: 10,
          marginTop: 4,
          color: aguardando ? "var(--cor-critica)" : "var(--cor-texto-fraco)",
          fontWeight: aguardando ? 700 : 400,
        }}
      >
        {ROTULO_ESTADO[alerta.estado]}
        {alerta.operadorValidador ? ` · ${alerta.operadorValidador}` : ""}
      </div>

      {alerta.leadTimeHoras !== null ? (
        <div style={{ fontSize: 10.5, color: "var(--cor-ok)", marginTop: 3 }}>
          Antecedência de {alerta.leadTimeHoras} h (origem: previsão)
        </div>
      ) : null}

      <ul style={{ margin: "7px 0 0", paddingLeft: 15, fontSize: 10.5, color: "var(--cor-texto-fraco)" }}>
        {alerta.evidencias.map((e, i) => (
          <li key={i}>{e.descricao}</li>
        ))}
      </ul>

      {alerta.atualizacoes.length > 0 ? (
        <div style={{ fontSize: 10, color: "var(--cor-atencao)", marginTop: 5 }}>
          {alerta.atualizacoes.length} atualização(ões) agrupada(s) — antifadiga ativa
        </div>
      ) : null}

      {aguardando ? (
        <div style={{ marginTop: "var(--espaco-3)", display: "grid", gap: 6 }}>
          <button
            className="botao"
            onClick={() => abrirDossie(alerta.alertaId)}
            aria-label="Abrir dossiê do alerta — expectativa, camadas envolvidas, projeção, evidências e ações recomendadas"
          >
            Abrir dossiê do alerta
          </button>
          <button
            className="botao botao-primario"
            onClick={() => validarAlerta(alerta.alertaId)}
          >
            Validar e expedir
          </button>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              className="botao"
              placeholder="Motivo do descarte"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              style={{ flex: 1, minWidth: 0 }}
            />
            <button className="botao botao-perigo" onClick={aoDescartar}>
              Descartar
            </button>
          </div>
          {erro ? (
            <div style={{ fontSize: 10, color: "var(--cor-critica)" }}>{erro}</div>
          ) : null}
        </div>
      ) : (
        <button
          className="botao"
          style={{ marginTop: 8, width: "100%" }}
          onClick={() => abrirDossie(alerta.alertaId)}
        >
          Abrir dossiê do alerta
        </button>
      )}

      {boletim ? (
        <button
          className="botao"
          style={{ marginTop: 8, width: "100%" }}
          onClick={() => abrirBoletim(boletim.boletimId)}
        >
          {boletim.textoAprovado ? "Ver boletim aprovado" : "Revisar rascunho do boletim"}
        </button>
      ) : null}
    </motion.li>
  );
}

export default function FilaAlertas() {
  // useShallow evita o loop de renderizacao infinito do useSyncExternalStore:
  // selecionarAlertasAtivos cria um array novo a cada chamada, e sem cache
  // por igualdade rasa o React nunca considera o snapshot estavel.
  const alertas = useSimulacao(useShallow(selecionarAlertasAtivos));
  useSimulacao((s) => s.versao);
  const [aberto, setAberto] = useState(true);
  const modoTecnico = useSimulacao((s) => s.modoTecnico);

  const visiveis = alertas.filter((a) => a.estado !== "encerrado" && a.estado !== "descartado");
  const { aguardandoValidacao, expedidos } = resumirAlertas(alertas);

  return (
    <Painel
      titulo={rotulo("filaAlertas", modoTecnico)}
      aberto={aberto}
      aoAlternar={() => setAberto((v) => !v)}
      info={
        <>
          A fila de decisão do plantão. Cada cartão é um alerta que o enxame propôs, com a
          evidência que o sustenta. A barra colorida à esquerda é a severidade.{" "}
          <b style={{ color: "var(--cor-critica)" }}>Pulsando em vermelho</b> = aguardando
          validação: nada é expedido até um operador identificado decidir (RNF-18). Descartar exige
          motivo, que fica registrado na trilha de auditoria.
        </>
      }
      resumo={
        <>
          {aguardandoValidacao > 0 ? (
            <span className="chip pulsando" style={{ borderColor: "var(--sev-muito-alta)" }}>
              <span className="chip-ponto" style={{ background: "var(--sev-muito-alta)" }} />
              <b>{aguardandoValidacao}</b>&nbsp;aguardando validação
            </span>
          ) : (
            <span className="chip">0 ativos</span>
          )}
          <span className="chip">
            <span className="chip-ponto" style={{ background: "var(--cor-ok)" }} />
            <b>{expedidos}</b>&nbsp;expedido{expedidos !== 1 ? "s" : ""}
          </span>
        </>
      }
    >
      {visiveis.length === 0 ? (
        <p style={{ fontSize: 11.5, color: "var(--cor-texto-fraco)" }}>
          Nenhum alerta ativo. Os agentes seguem monitorando.
        </p>
      ) : (
        <ul style={{ margin: 0, padding: 0, display: "grid", gap: "var(--espaco-3)" }}>
          <AnimatePresence initial={false}>
            {visiveis.map((alerta) => (
              <CartaoAlerta key={alerta.alertaId} alerta={alerta} />
            ))}
          </AnimatePresence>
        </ul>
      )}

      <p style={{ fontSize: 10, color: "var(--cor-texto-fraco)", marginTop: "var(--espaco-4)" }}>
        Nenhum alerta é expedido sem esta validação. O agente de expedição permanece
        bloqueado até um operador identificado decidir (RNF-18).
      </p>
    </Painel>
  );
}
