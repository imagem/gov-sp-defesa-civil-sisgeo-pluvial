import { useSimulacao } from "@/estado/store";
import Dica from "@/ui/Dica";
import { montarDeliberacoes } from "@/ui/deliberacoes";
import { COR_SEVERIDADE, ROTULO_ESTADO } from "@/ui/severidade";
import { rotulo } from "@/ui/textos";

function horaCurta(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CELULA = { padding: "6px 8px", verticalAlign: "top" } as const;
const CABECALHO = {
  ...CELULA,
  textAlign: "left",
  fontSize: 10,
  fontWeight: 600,
  color: "var(--cor-texto-fraco)",
  whiteSpace: "nowrap",
} as const;

export default function PaginaAlertas() {
  const modoTecnico = useSimulacao((s) => s.modoTecnico);
  const motor = useSimulacao((s) => s.motor);
  const abrirBoletim = useSimulacao((s) => s.abrirBoletim);
  const irPara = useSimulacao((s) => s.irPara);
  useSimulacao((s) => s.versao);

  const linhas = montarDeliberacoes(motor.estado, motor.mundo);

  return (
    <section
      className="vidro painel"
      style={{ height: "100%", overflow: "auto", minHeight: 0 }}
    >
      <div className="painel-cabecalho">
        <h2 className="titulo-painel">{rotulo("alertas", modoTecnico)} &amp; deliberações</h2>
        <div className="painel-cabecalho-acoes">
          <button type="button" className="botao botao-fechar" onClick={() => irPara("operacional")}>
            Fechar
          </button>
        </div>
      </div>

      <p style={{ fontSize: 11.5, color: "var(--cor-texto-fraco)", margin: "0 0 var(--espaco-3)" }}>
        Histórico completo de deliberações: todo alerta que o sistema propôs, o que o operador
        decidiu sobre ele e quando. Inclui descartados e encerrados — é a prestação de contas da
        sala de situação (RF-GOV-02).
      </p>

      {linhas.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--cor-texto-fraco)" }}>
          Nenhum alerta registrado ainda.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
          <thead>
            <tr>
              <th style={CABECALHO}>Zona</th>
              <th style={CABECALHO}>Severidade</th>
              <th style={CABECALHO}>Situação</th>
              <th style={CABECALHO}>Operador</th>
              <th style={CABECALHO}>
                Antecedência
                <Dica sobre="Antecedência">
                  Horas entre a detecção do alerta e o instante previsto para o evento. Só alertas
                  preditivos (geofencing sobre a mancha prevista) têm antecedência; os disparados
                  por limiar observado reagem a algo que já aconteceu.
                </Dica>
              </th>
              <th style={CABECALHO}>Detectado</th>
              <th style={CABECALHO}>Validado</th>
              <th style={CABECALHO}>Expedido</th>
              <th style={CABECALHO}>Boletim</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const boletim = l.temBoletim
                ? motor.estado.boletins.find((b) => b.alertaId === l.alertaId)
                : undefined;
              return (
                <tr
                  key={l.alertaId}
                  style={{
                    borderTop: "1px solid var(--cor-borda)",
                    borderLeft: `3px solid ${COR_SEVERIDADE[l.severidade]}`,
                  }}
                >
                  <td style={CELULA}>
                    <strong>{l.zonaNome}</strong>
                    <div style={{ fontSize: 10, color: "var(--cor-texto-fraco)" }}>
                      {l.alertaId}
                    </div>
                  </td>
                  <td
                    style={{
                      ...CELULA,
                      fontSize: 10,
                      fontWeight: 700,
                      color: COR_SEVERIDADE[l.severidade],
                      whiteSpace: "nowrap",
                    }}
                  >
                    {l.severidade.replace("_", " ").toUpperCase()}
                  </td>
                  <td style={CELULA}>
                    <div
                      style={{
                        color:
                          l.estado === "candidato" ? "var(--cor-critica)" : undefined,
                        fontWeight: l.estado === "candidato" ? 700 : 400,
                      }}
                    >
                      {ROTULO_ESTADO[l.estado]}
                    </div>
                    {l.motivoDescarte ? (
                      <div style={{ fontSize: 10, color: "var(--cor-texto-fraco)" }}>
                        Motivo: {l.motivoDescarte}
                      </div>
                    ) : null}
                  </td>
                  <td style={CELULA}>{l.operador ?? "—"}</td>
                  <td style={{ ...CELULA, whiteSpace: "nowrap" }}>
                    {l.leadTimeHoras !== null ? `${l.leadTimeHoras} h` : "—"}
                  </td>
                  <td style={{ ...CELULA, whiteSpace: "nowrap" }}>{horaCurta(l.tsDeteccao)}</td>
                  <td style={{ ...CELULA, whiteSpace: "nowrap" }}>{horaCurta(l.tsValidacao)}</td>
                  <td style={{ ...CELULA, whiteSpace: "nowrap" }}>{horaCurta(l.tsExpedicao)}</td>
                  <td style={CELULA}>
                    {boletim ? (
                      <button className="botao" onClick={() => abrirBoletim(boletim.boletimId)}>
                        {boletim.textoAprovado ? "Ver boletim" : "Revisar rascunho"}
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
