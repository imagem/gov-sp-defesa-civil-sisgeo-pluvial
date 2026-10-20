import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { CENARIOS } from "@/simulacao/cenarios";
import {
  OPERADOR_CARGO,
  OPERADOR_CODINOME,
  OPERADOR_DEMO,
  selecionarEventosRecentes,
  useSimulacao,
  VELOCIDADES,
} from "@/estado/store";
import { descreverModo } from "@/mapa/config";
import { alternarTema, aplicarTemaNoElemento, lerTemaSalvo, salvarTema, type Tema } from "@/estado/tema";
import LogoDefesaCivil from "./LogoDefesaCivil";
import { filtrarNotificacoes } from "./notificacoes";

function horaLocal(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function horaCurta(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

type Menu = "cenario" | "notificacoes" | "perfil" | null;

export default function Cabecalho() {
  const { motor, cenarioId, rodando, velocidadeIndice, portalAutenticado } = useSimulacao();
  const { alternarExecucao, definirVelocidade, trocarCenario, passo } = useSimulacao();
  const modoTecnico = useSimulacao((s) => s.modoTecnico);
  const alternarModoTecnico = useSimulacao((s) => s.alternarModoTecnico);
  useSimulacao((s) => s.versao);
  const eventosRecentes = useSimulacao(useShallow((s) => selecionarEventosRecentes(s, 40)));

  const [tema, setTema] = useState<Tema>(() => lerTemaSalvo(localStorage));
  const [menuAberto, setMenuAberto] = useState<Menu>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    aplicarTemaNoElemento(document.documentElement, tema);
  }, [tema]);

  useEffect(() => {
    if (!menuAberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(null);
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuAberto(null);
    }
    window.addEventListener("mousedown", aoClicarFora);
    window.addEventListener("keydown", aoTeclar);
    return () => {
      window.removeEventListener("mousedown", aoClicarFora);
      window.removeEventListener("keydown", aoTeclar);
    };
  }, [menuAberto]);

  function aoAlternarTema() {
    setTema((atual) => {
      const proximo = alternarTema(atual);
      salvarTema(localStorage, proximo);
      return proximo;
    });
  }

  const cenario = CENARIOS.find((c) => c.id === cenarioId);
  const notificacoes = filtrarNotificacoes(eventosRecentes).slice(0, 8);

  return (
    <header
      className="vidro-forte cabecalho"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--espaco-3)",
        padding: "0 var(--espaco-4)",
        margin: "var(--espaco-3)",
        height: 56,
      }}
    >
      <LogoDefesaCivil />

      <div className="cabecalho-separador" />

      <div style={{ whiteSpace: "nowrap", lineHeight: 1.3 }}>
        <div style={{ fontWeight: 700, letterSpacing: "0.02em" }}>Sala de Situação</div>
        <div style={{ fontSize: 10, color: "var(--cor-texto-fraco)", letterSpacing: "0.04em" }}>
          ALERTA DE CHEIAS
        </div>
      </div>

      <div className="cabecalho-separador" />

      <button
        type="button"
        className="botao-icone"
        style={{ width: 30, height: 30, fontSize: 13 }}
        aria-label={rodando ? "Pausar" : "Executar"}
        onClick={alternarExecucao}
      >
        {rodando ? "⏸" : "▶"}
      </button>
      <button className="botao" onClick={passo} disabled={rodando} style={{ padding: "5px 10px", fontSize: 11.5 }}>
        Passo
      </button>
      <button
        type="button"
        className="cabecalho-pill"
        onClick={() => definirVelocidade((velocidadeIndice + 1) % VELOCIDADES.length)}
        aria-label="Alternar velocidade da simulação"
      >
        {VELOCIDADES.map((v, i) => (
          <span
            key={v.rotulo}
            style={
              i === velocidadeIndice
                ? { fontWeight: 700, color: "var(--cor-texto)" }
                : { color: "var(--cor-texto-fraco)" }
            }
          >
            {v.rotulo}
            {i < VELOCIDADES.length - 1 ? " · " : ""}
          </span>
        ))}
      </button>

      <div ref={menuAberto === "cenario" ? menuRef : undefined} style={{ position: "relative" }}>
        <button
          type="button"
          className="cabecalho-pill"
          onClick={() => setMenuAberto((m) => (m === "cenario" ? null : "cenario"))}
          aria-expanded={menuAberto === "cenario"}
        >
          {cenario?.nome ?? "Cenário"} {"▾"}
        </button>
        {menuAberto === "cenario" ? (
          <div className="cabecalho-popover">
            {CENARIOS.map((c) => (
              <button
                key={c.id}
                type="button"
                className="botao"
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  marginBottom: 6,
                  borderColor: c.id === cenarioId ? "var(--cor-acento)" : undefined,
                }}
                onClick={() => {
                  trocarCenario(c.id);
                  setMenuAberto(null);
                }}
              >
                {c.nome}
              </button>
            ))}
            {cenario && modoTecnico ? (
              <p style={{ fontSize: 10, color: "var(--cor-texto-fraco)", margin: "6px 0 0" }}>
                Requisitos em foco: {cenario.requisitosDestacados.join(" · ")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="cabecalho-separador" />

      <div
        style={{ fontFamily: "var(--fonte-mono)", fontSize: 18, fontVariantNumeric: "tabular-nums" }}
        aria-label="Horário simulado"
      >
        {horaLocal(motor.relogio.iso)}
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <span className="cabecalho-status" title="Nenhum dado real é usado nesta demonstração">
          DADOS SIMULADOS
        </span>

        <div ref={menuAberto === "notificacoes" ? menuRef : undefined} style={{ position: "relative" }}>
          <button
            type="button"
            className="botao-icone"
            style={{ width: 30, height: 30, fontSize: 14, position: "relative" }}
            aria-label="Notificações"
            aria-expanded={menuAberto === "notificacoes"}
            onClick={() => setMenuAberto((m) => (m === "notificacoes" ? null : "notificacoes"))}
          >
            <svg className="cabecalho-icone" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 9a6 6 0 0 1 12 0c0 6 2 7.5 2 7.5H4S6 15 6 9z" />
              <path d="M10 20a2 2 0 0 0 4 0" />
            </svg>
            {notificacoes.length > 0 ? <span className="cabecalho-badge" /> : null}
          </button>
          {menuAberto === "notificacoes" ? (
            <div className="cabecalho-popover">
              {notificacoes.length === 0 ? (
                <p style={{ fontSize: 11, color: "var(--cor-texto-fraco)", margin: 0 }}>
                  Nenhuma notificação recente.
                </p>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
                  {notificacoes.map((n) => (
                    <li key={n.eventoId} style={{ fontSize: 11 }}>
                      <span
                        style={{ fontFamily: "var(--fonte-mono)", color: "var(--cor-texto-fraco)", marginRight: 6 }}
                      >
                        {horaCurta(n.ts)}
                      </span>
                      {n.titulo}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="botao-icone"
          style={{ width: 30, height: 30, fontSize: 14 }}
          aria-label={tema === "escuro" ? "Mudar para tema claro" : "Mudar para tema escuro"}
          onClick={aoAlternarTema}
        >
          {tema === "escuro" ? "☀" : "☽"}
        </button>

        <div className="cabecalho-separador" />

        <div ref={menuAberto === "perfil" ? menuRef : undefined} style={{ position: "relative" }}>
          <button
            type="button"
            className="cabecalho-pill"
            style={{ paddingLeft: 6 }}
            onClick={() => setMenuAberto((m) => (m === "perfil" ? null : "perfil"))}
            aria-expanded={menuAberto === "perfil"}
          >
            <span className="cabecalho-avatar">{iniciais(OPERADOR_DEMO)}</span>
            {OPERADOR_DEMO}
            <span style={{ color: "var(--cor-texto-fraco)" }}>{"▾"}</span>
          </button>
          {menuAberto === "perfil" ? (
            <div className="cabecalho-popover" style={{ width: 260 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span className="cabecalho-avatar" style={{ width: 34, height: 34, fontSize: 12 }}>
                  {iniciais(OPERADOR_DEMO)}
                </span>
                <div style={{ lineHeight: 1.35 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{OPERADOR_DEMO}</div>
                  <div style={{ fontSize: 10.5, color: "var(--cor-texto-fraco)" }}>{OPERADOR_CARGO}</div>
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: "var(--fonte-mono)",
                      color: "var(--cor-texto-fraco)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {OPERADOR_CODINOME}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 10.5, color: "var(--cor-texto-fraco)", margin: "0 0 8px" }}>
                {descreverModo(portalAutenticado)}
              </p>
              <label
                style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, cursor: "pointer" }}
              >
                <input type="checkbox" checked={modoTecnico} onChange={alternarModoTecnico} />
                Modo técnico
              </label>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
