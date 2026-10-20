import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { selecionarEventosRecentes, useSimulacao } from "@/estado/store";
import {
  minutosRestantes,
  progressoTrajeto,
  type DespachoCampo,
} from "@/dominio/despacho";
import type { EstacaoMonitoramento, SituacaoEstacao } from "@/dominio/tipos";
import Painel from "./Painel";
import { rotulo } from "./textos";
import { resumirEstacoes } from "./resumosPainel";

const COR: Record<SituacaoEstacao, string> = {
  operante: "var(--cor-ok)",
  degradada: "var(--cor-atencao)",
  silenciosa: "var(--cor-critica)",
  desativada: "var(--cor-texto-fraco)",
};

const ROTULO_SITUACAO: Record<SituacaoEstacao, string> = {
  operante: "Operante",
  degradada: "Degradada",
  silenciosa: "Silenciosa",
  desativada: "Desativada",
};

const DIAGNOSTICO: Record<SituacaoEstacao, string> = {
  operante: "Transmitindo dentro da periodicidade esperada.",
  degradada: "Transmitindo com atraso ou com leituras reprovadas pelo controle de qualidade.",
  silenciosa: "Sem leitura há mais de 3 períodos. O agente de rede a retirou da ingestão.",
  desativada: "Fora de operação por decisão cadastral. Não é contada na cobertura da rede.",
};

const ROTULO_TIPO: Record<EstacaoMonitoramento["tipo"], string> = {
  pluviometrica: "Pluviométrica (chuva)",
  fluviometrica: "Fluviométrica (nível)",
  regua: "Régua (nível manual)",
};

const ROTULO_ESTADO_DESPACHO: Record<DespachoCampo["estado"], string> = {
  preparando: "Acionando a equipe",
  a_caminho: "A caminho",
  em_atendimento: "Em atendimento no local",
  concluido: "Concluído",
};

function horaCurta(iso: string | null): string {
  if (!iso) return "sem leitura registrada";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function minutosDesde(iso: string | null, agoraIso: string): number | null {
  if (!iso) return null;
  return Math.round((Date.parse(agoraIso) - Date.parse(iso)) / 60_000);
}

/**
 * Detalhe de uma estação: o que houve, desde quando, o que o enxame já fez a
 * respeito e qual a ação disponível ao operador. É o conteúdo que transforma
 * o quadradinho colorido em algo acionável.
 */
function DetalheEstacao({
  estacao,
  aoFechar,
}: {
  estacao: EstacaoMonitoramento;
  aoFechar: () => void;
}) {
  const motor = useSimulacao((s) => s.motor);
  const despacharEquipe = useSimulacao((s) => s.despacharEquipe);
  const eventos = useSimulacao(useShallow((s) => selecionarEventosRecentes(s, 60)));
  useSimulacao((s) => s.versao);
  const [recusa, setRecusa] = useState<string | null>(null);

  const subBacia = motor.mundo.subBacias.find((b) => b.subBaciaId === estacao.subBaciaId);
  const atraso = minutosDesde(estacao.ultimaLeituraTs, motor.relogio.iso);
  const limite = estacao.periodicidadeEsperadaMin * 3;

  const despacho = motor.estado.despachos.find(
    (d) => d.estacaoId === estacao.estacaoId && d.estado !== "concluido",
  );
  const concluido = motor.estado.despachos.find(
    (d) => d.estacaoId === estacao.estacaoId && d.estado === "concluido",
  );

  const relacionados = eventos
    .filter((e) => {
      const carga = e.carga as { estacaoId?: string } | null;
      return carga?.estacaoId === estacao.estacaoId;
    })
    .slice(0, 4);

  const precisaEquipe = estacao.situacao !== "operante";

  function aoDespachar() {
    const aceito = despacharEquipe(estacao.estacaoId);
    setRecusa(
      aceito
        ? null
        : "Todo o plantão de campo já está em atendimento. Aguarde uma equipe concluir.",
    );
  }

  return (
    <div className="estacao-detalhe" role="dialog" aria-label={`Estação ${estacao.nome}`}>
      <div className="estacao-detalhe-topo">
        <div>
          <strong style={{ fontSize: 12.5 }}>{estacao.nome}</strong>
          <div style={{ fontSize: 10, color: "var(--cor-texto-fraco)", fontFamily: "var(--fonte-mono)" }}>
            {estacao.estacaoId} · {estacao.codigoExterno}
          </div>
        </div>
        <button type="button" className="botao-icone" aria-label="Fechar detalhe" onClick={aoFechar}>
          ×
        </button>
      </div>

      <div className="estacao-detalhe-situacao" style={{ color: COR[estacao.situacao] }}>
        <span className="chip-ponto" style={{ background: COR[estacao.situacao] }} />
        {ROTULO_SITUACAO[estacao.situacao]}
      </div>
      <p className="estacao-detalhe-diagnostico">{DIAGNOSTICO[estacao.situacao]}</p>

      <dl className="estacao-detalhe-campos">
        <dt>Tipo</dt>
        <dd>{ROTULO_TIPO[estacao.tipo]}</dd>
        <dt>Fonte</dt>
        <dd>{estacao.fonteId}</dd>
        <dt>Sub-bacia</dt>
        <dd>{subBacia?.nome ?? estacao.subBaciaId}</dd>
        <dt>Última leitura</dt>
        <dd>{horaCurta(estacao.ultimaLeituraTs)}</dd>
        <dt>Silêncio</dt>
        <dd>
          {atraso === null ? "—" : `${atraso} min`}{" "}
          <span style={{ color: "var(--cor-texto-fraco)" }}>
            (limite {limite} min = {estacao.periodicidadeEsperadaMin} min × 3)
          </span>
        </dd>
      </dl>

      {relacionados.length > 0 ? (
        <>
          <div className="estacao-detalhe-titulo">O que o enxame registrou</div>
          <ul className="estacao-detalhe-eventos">
            {relacionados.map((e) => (
              <li key={e.eventoId}>{e.titulo}</li>
            ))}
          </ul>
        </>
      ) : null}

      <div className="estacao-detalhe-titulo">Equipe de campo</div>
      {despacho ? (
        <div className="estacao-detalhe-despacho">
          <div>
            <b>{despacho.especialista}</b> · {despacho.equipe}
          </div>
          <div style={{ color: "var(--cor-acento)" }}>
            {ROTULO_ESTADO_DESPACHO[despacho.estado]} · {minutosRestantes(despacho)} min para
            normalizar
          </div>
          <div
            className="estacao-detalhe-barra"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressoTrajeto(despacho) * 100)}
            aria-label="Progresso do deslocamento da equipe"
          >
            <span style={{ width: `${Math.round(progressoTrajeto(despacho) * 100)}%` }} />
          </div>
          <p className="estacao-detalhe-nota">
            A viatura aparece no mapa, com o nome do técnico e o tempo restante acima do ícone.
          </p>
        </div>
      ) : concluido ? (
        <p className="estacao-detalhe-nota" style={{ color: "var(--cor-ok)" }}>
          {concluido.especialista} já atendeu esta estação e ela voltou a transmitir.
        </p>
      ) : precisaEquipe ? (
        <>
          <button type="button" className="botao botao-primario" style={{ width: "100%" }} onClick={aoDespachar}>
            Despachar equipe de campo
          </button>
          <p className="estacao-detalhe-nota">
            Registra o despacho na trilha de auditoria e põe a viatura no mapa. A estação volta a
            transmitir quando o atendimento terminar.
          </p>
          {recusa ? (
            <p className="estacao-detalhe-nota" style={{ color: "var(--cor-critica)" }}>
              {recusa}
            </p>
          ) : null}
        </>
      ) : (
        <p className="estacao-detalhe-nota">
          Estação operante — nenhum deslocamento de equipe é necessário.
        </p>
      )}
    </div>
  );
}

export default function PainelSaudeRede() {
  const motor = useSimulacao((s) => s.motor);
  useSimulacao((s) => s.versao);
  const [aberto, setAberto] = useState(true);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const modoTecnico = useSimulacao((s) => s.modoTecnico);
  const raizRef = useRef<HTMLDivElement>(null);

  const estacoes = motor.estado.estacoes;
  const { operantes, silenciosas } = resumirEstacoes(estacoes);
  const emCampo = motor.estado.despachos.filter((d) => d.estado !== "concluido");
  const estacaoSelecionada = estacoes.find((e) => e.estacaoId === selecionada) ?? null;

  // Recolher o painel fecha o detalhe; sem isso o popover ficaria órfão.
  useEffect(() => {
    if (!aberto) setSelecionada(null);
  }, [aberto]);

  useEffect(() => {
    if (!selecionada) return;
    function aoClicarFora(e: MouseEvent) {
      if (raizRef.current && !raizRef.current.contains(e.target as Node)) setSelecionada(null);
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setSelecionada(null);
    }
    window.addEventListener("mousedown", aoClicarFora);
    window.addEventListener("keydown", aoTeclar);
    return () => {
      window.removeEventListener("mousedown", aoClicarFora);
      window.removeEventListener("keydown", aoTeclar);
    };
  }, [selecionada]);

  return (
    <Painel
      titulo={rotulo("saudeRede", modoTecnico)}
      aberto={aberto}
      aoAlternar={() => setAberto((v) => !v)}
      corpoRolavel={false}
      info={
        <>
          Cada bloco é uma estação de monitoramento.{" "}
          <b style={{ color: "var(--cor-ok)" }}>Verde</b> = transmitindo normalmente.{" "}
          <b style={{ color: "var(--cor-atencao)" }}>Âmbar</b> = degradada.{" "}
          <b style={{ color: "var(--cor-critica)" }}>Vermelho pulsante</b> = sem leitura há mais de
          3 períodos (silenciosa). Clique em um bloco para ver o diagnóstico da estação e despachar
          uma equipe de campo.
        </>
      }
      resumo={
        <>
          <span className="chip">
            <span className="chip-ponto" style={{ background: "var(--cor-ok)" }} />
            <b>{operantes}</b>&nbsp;operantes
          </span>
          {silenciosas > 0 ? (
            <span className="chip">
              <span className="chip-ponto" style={{ background: "var(--cor-critica)" }} />
              <b>{silenciosas}</b>&nbsp;silenciosa{silenciosas > 1 ? "s" : ""}
            </span>
          ) : null}
          {emCampo.length > 0 ? (
            <span className="chip" style={{ borderColor: "var(--cor-acento)" }}>
              <span className="chip-ponto" style={{ background: "var(--cor-acento)" }} />
              <b>{emCampo.length}</b>&nbsp;equipe{emCampo.length > 1 ? "s" : ""} em campo
            </span>
          ) : null}
          <div style={{ display: "flex", gap: 3, marginLeft: 4 }}>
            {estacoes.slice(0, 8).map((estacao) => (
              <span
                key={estacao.estacaoId}
                style={{ width: 5, height: 12, borderRadius: 2, background: COR[estacao.situacao] }}
              />
            ))}
          </div>
        </>
      }
    >
      <div ref={raizRef} className="saude-rede">
        {/* Grade e legenda ficam FIXAS no topo; a barra de rolagem vive apenas
            no detalhe, abaixo. Antes, abrir o detalhe punha a rolagem no cartao
            inteiro e a grade de estacoes saia da vista junto. */}
        <div className="saude-rede-grade">
          {estacoes.map((estacao) => {
            const temEquipe = emCampo.some((d) => d.estacaoId === estacao.estacaoId);
            const ativa = estacao.estacaoId === selecionada;
            return (
              <button
                key={estacao.estacaoId}
                type="button"
                className={[
                  "saude-rede-bloco",
                  estacao.situacao === "silenciosa" && !temEquipe ? "pulsando" : "",
                  temEquipe ? "saude-rede-bloco-em-campo" : "",
                  ativa ? "saude-rede-bloco-ativo" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  background: COR[estacao.situacao],
                  opacity: estacao.situacao === "operante" ? 0.75 : 1,
                }}
                aria-pressed={ativa}
                title={`${estacao.nome} — ${ROTULO_SITUACAO[estacao.situacao]}${
                  temEquipe ? " · equipe a caminho" : ""
                }`}
                onClick={() =>
                  setSelecionada((atual) => (atual === estacao.estacaoId ? null : estacao.estacaoId))
                }
              >
                <span className="visualmente-oculto">
                  {estacao.nome} — {ROTULO_SITUACAO[estacao.situacao]}
                </span>
              </button>
            );
          })}
        </div>


        <p className="saude-rede-legenda">
          Cada bloco é uma estação. Vermelho pulsante = silenciosa há mais de 3 períodos. Clique
          para diagnosticar e despachar uma equipe.
        </p>

        <div className="saude-rede-detalhe-area">
          {estacaoSelecionada ? (
            <DetalheEstacao estacao={estacaoSelecionada} aoFechar={() => setSelecionada(null)} />
          ) : null}
        </div>
      </div>
    </Painel>
  );
}
