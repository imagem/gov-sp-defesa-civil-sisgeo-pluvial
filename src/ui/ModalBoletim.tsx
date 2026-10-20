import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSimulacao } from "@/estado/store";

export default function ModalBoletim() {
  const boletimId = useSimulacao((s) => s.boletimAberto);
  const motor = useSimulacao((s) => s.motor);
  const abrirBoletim = useSimulacao((s) => s.abrirBoletim);
  const aprovarBoletim = useSimulacao((s) => s.aprovarBoletim);

  const boletim = motor.estado.boletins.find((b) => b.boletimId === boletimId);
  const [texto, setTexto] = useState("");

  useEffect(() => {
    if (boletim) setTexto(boletim.textoAprovado ?? boletim.textoRascunho);
  }, [boletim]);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") abrirBoletim(null);
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [abrirBoletim]);

  return (
    <AnimatePresence>
      {boletim ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => abrirBoletim(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--modal-scrim)",
            backdropFilter: "blur(6px)",
            display: "grid",
            placeItems: "center",
            zIndex: "var(--z-modal)",
            padding: "var(--espaco-5)",
          }}
        >
          <motion.div
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            className="vidro-forte painel"
            style={{ width: "min(760px, 92vw)", maxHeight: "84vh", display: "grid", gap: "var(--espaco-3)" }}
            role="dialog"
            aria-label="Boletim de situação"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="titulo-painel" style={{ margin: 0 }}>
                Boletim {boletim.boletimId} — alerta {boletim.alertaId}
              </h2>
              <span className="selo-demo">
                {boletim.textoAprovado ? "APROVADO" : "RASCUNHO GERADO POR AGENTE"}
              </span>
            </div>

            <div style={{ fontSize: 10.5, color: "var(--cor-texto-fraco)" }}>
              Fontes consultadas pelo agente redator:
              <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                {boletim.fontesConsultadas.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>

            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              readOnly={boletim.textoAprovado !== null}
              spellCheck={false}
              style={{
                width: "100%",
                minHeight: 320,
                resize: "vertical",
                background: "var(--campo-fundo)",
                color: "var(--cor-texto)",
                border: "1px solid var(--cor-borda)",
                borderRadius: 10,
                padding: "var(--espaco-3)",
                fontFamily: "var(--fonte-mono)",
                fontSize: 11.5,
                lineHeight: 1.55,
              }}
            />

            <div style={{ display: "flex", gap: "var(--espaco-2)", justifyContent: "flex-end" }}>
              <button className="botao" onClick={() => abrirBoletim(null)}>
                Fechar
              </button>
              {boletim.textoAprovado === null ? (
                <button
                  className="botao botao-primario"
                  onClick={() => aprovarBoletim(boletim.boletimId, texto)}
                >
                  Aprovar como revisado
                </button>
              ) : (
                <span style={{ fontSize: 11, color: "var(--cor-ok)", alignSelf: "center" }}>
                  Aprovado por {boletim.autorAprovacao} em {boletim.tsAprovacao}
                </span>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
