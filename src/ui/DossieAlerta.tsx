import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSimulacao } from "@/estado/store";
import { acoesParaAlerta } from "@/dominio/acoesRecomendadas";
import { COR_SEVERIDADE, ROTULO_ESTADO } from "./severidade";

const ROTULO_TIPO: Record<"inundacao" | "deslizamento", string> = {
  inundacao: "Inundação",
  deslizamento: "Deslizamento",
};

const ROTULO_GRAU: Record<"alto" | "muito_alto", string> = {
  alto: "Alto",
  muito_alto: "Muito alto",
};

/**
 * Mini-grafico SVG da projecao do nivel: histograma simples que mostra o
 * nivel atual, a serie de previsoes pareadas (quando ha) e a cota prevista
 * de 12 h — para o operador ver a tendencia sem precisar de biblioteca de
 * grafico.
 */
function GraficoProjecao({
  nivelAtualM,
  cotaPrevistaM,
  cotaBaseM,
  serieRealizado,
  seriePrevisto,
}: {
  nivelAtualM: number;
  cotaPrevistaM: number;
  cotaBaseM: number;
  serieRealizado: readonly number[];
  seriePrevisto: readonly number[];
}) {
  const largura = 420;
  const altura = 80;
  const padding = 6;

  const serie = [...serieRealizado.slice(-24), nivelAtualM];
  const amostraPrevista = seriePrevisto.slice(-24);
  const todos = [...serie, ...amostraPrevista, cotaPrevistaM, cotaBaseM];
  const vMin = Math.min(...todos) - 0.1;
  const vMax = Math.max(...todos) + 0.1;
  const faixa = Math.max(0.1, vMax - vMin);

  function y(v: number) {
    return altura - padding - ((v - vMin) / faixa) * (altura - padding * 2);
  }
  function x(i: number, n: number) {
    return padding + ((largura - padding * 2) * i) / Math.max(1, n - 1);
  }

  const pontosReal = serie.map((v, i) => `${x(i, serie.length)},${y(v)}`).join(" ");

  return (
    <svg width={largura} height={altura} role="img" aria-label="Projeção do nível">
      <line
        x1={padding}
        x2={largura - padding}
        y1={y(cotaBaseM)}
        y2={y(cotaBaseM)}
        stroke="var(--cor-texto-fraco)"
        strokeDasharray="2 3"
        strokeWidth={1}
      />
      <line
        x1={padding}
        x2={largura - padding}
        y1={y(cotaPrevistaM)}
        y2={y(cotaPrevistaM)}
        stroke="var(--sev-muito-alta)"
        strokeDasharray="4 3"
        strokeWidth={1.2}
      />
      <polyline
        fill="none"
        stroke="var(--cor-ok)"
        strokeWidth={1.6}
        points={pontosReal}
      />
      <text x={padding} y={10} fontSize={9} fill="var(--cor-texto-fraco)">
        nível observado
      </text>
      <text
        x={largura - padding}
        y={y(cotaPrevistaM) - 4}
        fontSize={9}
        textAnchor="end"
        fill="var(--sev-muito-alta)"
      >
        cota prevista 12 h: {cotaPrevistaM.toFixed(2)} m
      </text>
      <text
        x={largura - padding}
        y={y(cotaBaseM) + 10}
        fontSize={9}
        textAnchor="end"
        fill="var(--cor-texto-fraco)"
      >
        cota base: {cotaBaseM.toFixed(2)} m
      </text>
    </svg>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "grid", gap: 4 }}>
      <h3
        style={{
          margin: 0,
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.05em",
          color: "var(--cor-texto-fraco)",
          textTransform: "uppercase",
        }}
      >
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11.5, lineHeight: 1.45 }}>
      <span style={{ color: "var(--cor-texto-fraco)", marginRight: 6 }}>{rotulo}</span>
      <b>{valor}</b>
    </div>
  );
}

export default function DossieAlerta() {
  const alertaId = useSimulacao((s) => s.dossieAlertaAberto);
  const motor = useSimulacao((s) => s.motor);
  const abrirDossie = useSimulacao((s) => s.abrirDossieAlerta);
  const validarAlerta = useSimulacao((s) => s.validarAlerta);
  const descartarAlerta = useSimulacao((s) => s.descartarAlerta);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const alerta = motor.estado.alertas.find((a) => a.alertaId === alertaId);
  const zona = alerta ? motor.mundo.zonas.find((z) => z.zonaId === alerta.zonaId) : undefined;
  const limiar = alerta ? motor.mundo.limiares.find((l) => l.limiarId === alerta.limiarId) : undefined;
  const subBacia = zona
    ? motor.mundo.subBacias.find((s) => s.subBaciaId === zona.subBaciaId)
    : undefined;

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") abrirDossie(null);
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [abrirDossie]);

  useEffect(() => {
    setMotivo("");
    setErro(null);
  }, [alertaId]);

  if (!alerta || !zona) {
    return (
      <AnimatePresence>
        {alertaId ? (
          <motion.div
            key="dossie-vazio"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => abrirDossie(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "var(--modal-scrim)",
              backdropFilter: "blur(6px)",
              display: "grid",
              placeItems: "center",
              zIndex: "var(--z-modal)",
            }}
          >
            <div className="vidro-forte painel">Alerta não encontrado.</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    );
  }

  const estacoesDaSubBacia = motor.mundo.estacoes.filter(
    (e) => e.subBaciaId === zona.subBaciaId,
  );
  const limiaresDaZona = motor.mundo.limiares.filter((l) => l.zonaId === zona.zonaId);
  const exposicao = motor.estado.exposicao.find((e) => e.zonaId === zona.zonaId);
  const acoes = acoesParaAlerta(zona, alerta.severidade);
  const aguardando = alerta.estado === "candidato";
  const boletim = motor.estado.boletins.find((b) => b.alertaId === alerta.alertaId);

  function aoDescartar() {
    if (!alerta) return;
    try {
      descartarAlerta(alerta.alertaId, motivo);
      setErro(null);
      abrirDossie(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "falha ao descartar");
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="dossie-fundo"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => abrirDossie(null)}
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--modal-scrim)",
          backdropFilter: "blur(6px)",
          display: "grid",
          placeItems: "center",
          zIndex: "var(--z-modal)",
          padding: "var(--espaco-4)",
        }}
      >
        <motion.div
          initial={{ scale: 0.96, y: 12 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.96, y: 12 }}
          onClick={(e) => e.stopPropagation()}
          className="vidro-forte painel"
          style={{
            width: "min(960px, 94vw)",
            maxHeight: "90vh",
            display: "grid",
            gap: "var(--espaco-3)",
            overflow: "auto",
          }}
          role="dialog"
          aria-label={`Dossiê do alerta ${alerta.alertaId}`}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div>
              <h2 className="titulo-painel" style={{ margin: 0 }}>
                Dossiê — alerta {alerta.alertaId}
              </h2>
              <div style={{ fontSize: 11.5, color: "var(--cor-texto-fraco)", marginTop: 2 }}>
                {zona.nome} · {zona.codigoSetorSgb}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: COR_SEVERIDADE[alerta.severidade],
                  padding: "2px 8px",
                  border: `1px solid ${COR_SEVERIDADE[alerta.severidade]}`,
                  borderRadius: 999,
                  letterSpacing: "0.04em",
                }}
              >
                {alerta.severidade.replace("_", " ").toUpperCase()}
              </span>
              <span
                className={aguardando ? "pulsando" : undefined}
                style={{
                  fontSize: 10,
                  color: aguardando ? "var(--cor-critica)" : "var(--cor-texto-fraco)",
                  fontWeight: aguardando ? 700 : 500,
                }}
              >
                {ROTULO_ESTADO[alerta.estado]}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "var(--espaco-3)",
            }}
          >
            <Secao titulo="Expectativa">
              <Campo
                rotulo="Cota prevista 12 h"
                valor={`${motor.estado.cotaPrevistaM.toFixed(2)} m`}
              />
              <Campo rotulo="Nível observado" valor={`${motor.estado.nivelAtualM.toFixed(2)} m`} />
              <Campo
                rotulo="Antecedência (lead time)"
                valor={
                  alerta.leadTimeHoras !== null
                    ? `${alerta.leadTimeHoras} h (origem: previsão)`
                    : "sem antecedência preditiva (origem: observação)"
                }
              />
              <Campo
                rotulo="Chuva atual"
                valor={`${motor.estado.intensidadeChuvaMmH.toFixed(1)} mm/h`}
              />
              <Campo
                rotulo="Posto de referência"
                valor={motor.mundo.postoId}
              />
            </Secao>

            <Secao titulo="Zona afetada">
              <Campo rotulo="Nome" valor={zona.nome} />
              <Campo rotulo="Tipo" valor={ROTULO_TIPO[zona.tipo]} />
              <Campo rotulo="Grau de risco" valor={ROTULO_GRAU[zona.grauRisco]} />
              <Campo rotulo="Sub-bacia" valor={subBacia?.nome ?? zona.subBaciaId} />
              <Campo rotulo="População estimada" valor={zona.populacaoEstimada.toLocaleString("pt-BR")} />
              <Campo rotulo="Famílias" valor={zona.familiasEstimadas.toLocaleString("pt-BR")} />
              {exposicao ? (
                <Campo
                  rotulo="População exposta à mancha"
                  valor={`${exposicao.populacaoEstimada.toLocaleString("pt-BR")} (${exposicao.metodoEstimativa})`}
                />
              ) : null}
            </Secao>
          </div>

          <Secao titulo="Projeção do nível (série da simulação)">
            <GraficoProjecao
              nivelAtualM={motor.estado.nivelAtualM}
              cotaPrevistaM={motor.estado.cotaPrevistaM}
              cotaBaseM={motor.mundo.cotaBaseM}
              serieRealizado={motor.estado.serieNivelRealizado}
              seriePrevisto={motor.estado.serieNivelPrevisto}
            />
          </Secao>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "var(--espaco-3)",
            }}
          >
            <Secao titulo="Camadas e insumos envolvidos">
              <ul style={{ margin: 0, paddingLeft: 15, fontSize: 11.5, lineHeight: 1.5 }}>
                <li>
                  Sub-bacia <b>{subBacia?.nome ?? zona.subBaciaId}</b> ({subBacia?.areaKm2.toFixed(1)} km²,
                  Tc {subBacia?.tempoConcentracaoHoras.toFixed(1)} h)
                </li>
                <li>
                  <b>{estacoesDaSubBacia.length}</b> estações na sub-bacia
                  {" "}
                  (
                  {estacoesDaSubBacia.filter((e) => e.situacao === "operante").length} operantes,
                  {" "}
                  {estacoesDaSubBacia.filter((e) => e.situacao === "silenciosa").length} silenciosas)
                </li>
                <li>
                  <b>{limiaresDaZona.length}</b> limiares vigentes para esta zona
                  {limiar ? ` · disparo em "${limiar.limiarId}"` : ""}
                </li>
                <li>
                  Mancha projetada sobre o corredor fluvial · cota base {motor.mundo.cotaBaseM.toFixed(2)} m
                </li>
              </ul>
              {limiar ? (
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 10.5,
                    color: "var(--cor-texto-fraco)",
                    lineHeight: 1.5,
                  }}
                >
                  <b>Justificativa técnica do limiar:</b> {limiar.justificativaTecnica} <br />
                  <span style={{ fontSize: 10 }}>
                    Autor: {limiar.autor} · versão {limiar.versao} · vigente desde{" "}
                    {new Date(limiar.vigenciaInicio).toLocaleDateString("pt-BR")}
                  </span>
                </p>
              ) : null}
            </Secao>

            <Secao titulo="Evidências capturadas">
              {alerta.evidencias.length === 0 ? (
                <p style={{ fontSize: 11, color: "var(--cor-texto-fraco)" }}>
                  Nenhuma evidência registrada ainda.
                </p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 15, fontSize: 11.5, lineHeight: 1.5 }}>
                  {alerta.evidencias.map((e, i) => (
                    <li key={i}>
                      {e.descricao}{" "}
                      <span style={{ color: "var(--cor-texto-fraco)" }}>
                        · {new Date(e.ts).toLocaleTimeString("pt-BR")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {alerta.atualizacoes.length > 0 ? (
                <p style={{ fontSize: 10, color: "var(--cor-atencao)", marginTop: 6 }}>
                  {alerta.atualizacoes.length} atualização(ões) agrupada(s) — antifadiga ativa.
                </p>
              ) : null}
            </Secao>
          </div>

          <Secao titulo={`Ações recomendadas (${acoes.length})`}>
            <p
              style={{
                margin: 0,
                fontSize: 10.5,
                color: "var(--cor-texto-fraco)",
                lineHeight: 1.45,
              }}
            >
              Roteiro didático baseado em cartilhas de defesa civil, cruzando o <b>tipo</b> da zona e
              a <b>severidade</b> do alerta. Esta demo não aciona nenhum destes passos — a decisão
              é do operador.
            </p>
            <ol style={{ margin: "6px 0 0", paddingLeft: 20, fontSize: 11.5, lineHeight: 1.55 }}>
              {acoes.map((a, i) => (
                <li key={i} style={{ marginBottom: 6 }}>
                  <b>{a.titulo}</b>
                  <div style={{ color: "var(--cor-texto-fraco)", fontSize: 11 }}>{a.detalhe}</div>
                  <div style={{ fontSize: 10, color: "var(--cor-texto-fraco)", fontStyle: "italic" }}>
                    Responsável sugerido: {a.responsavel}
                  </div>
                </li>
              ))}
            </ol>
          </Secao>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "var(--espaco-2)",
              alignItems: "center",
              borderTop: "1px solid var(--cor-borda)",
              paddingTop: "var(--espaco-3)",
            }}
          >
            <button className="botao" onClick={() => abrirDossie(null)}>
              Fechar
            </button>

            {aguardando ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  className="botao"
                  placeholder="Motivo do descarte"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  style={{ minWidth: 180 }}
                />
                <button className="botao botao-perigo" onClick={aoDescartar}>
                  Descartar
                </button>
                <button
                  className="botao botao-primario"
                  onClick={() => {
                    validarAlerta(alerta.alertaId);
                    abrirDossie(null);
                  }}
                >
                  Validar e expedir
                </button>
              </div>
            ) : boletim ? (
              <button
                className="botao botao-primario"
                onClick={() => {
                  abrirDossie(null);
                  useSimulacao.getState().abrirBoletim(boletim.boletimId);
                }}
              >
                {boletim.textoAprovado ? "Ver boletim aprovado" : "Revisar rascunho do boletim"}
              </button>
            ) : null}
          </div>

          {erro ? (
            <div style={{ fontSize: 10.5, color: "var(--cor-critica)" }}>{erro}</div>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
