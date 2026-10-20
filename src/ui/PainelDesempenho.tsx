import { useState, type ReactNode } from "react";
import { useSimulacao } from "@/estado/store";
import { calcularDesempenho } from "@/estado/desempenho";
import { limiaresVigentes } from "@/dominio/limiar";
import Dica from "./Dica";
import Painel from "./Painel";
import { rotulo } from "./textos";

function fmt(v: number | null, sufixo = "", casas = 2): string {
  return v === null ? "—" : `${v.toFixed(casas)}${sufixo}`;
}

function pct(v: number): string {
  return `${(v * 100).toFixed(0)}%`;
}

function Metrica({
  rotulo,
  valor,
  requisito,
  dica,
}: {
  rotulo: string;
  valor: string;
  requisito: string;
  dica: ReactNode;
}) {
  return (
    <div className="vidro cartao-com-dica" style={{ padding: "8px var(--espaco-3)", minWidth: 92 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 9.5,
          color: "var(--cor-texto-fraco)",
          letterSpacing: "0.05em",
        }}
      >
        {rotulo}
        <Dica sobre={rotulo}>{dica}</Dica>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>
        {valor}
      </div>
      <div style={{ fontSize: 9, color: "var(--cor-texto-fraco)" }}>{requisito}</div>
    </div>
  );
}

export default function PainelDesempenho() {
  const motor = useSimulacao((s) => s.motor);
  useSimulacao((s) => s.versao);
  const [aberto, setAberto] = useState(false);
  const modoTecnico = useSimulacao((s) => s.modoTecnico);

  const d = calcularDesempenho(motor.estado);
  const coletando = d.amostras < 2;

  // O painel precisa dizer QUAIS modelos e QUAIS gatilhos estão sendo medidos.
  // Há exatamente um modelo (a previsão de nível do posto de referência) e dois
  // gatilhos de alerta; os números abaixo vêm do mundo em execução, não de
  // texto fixo, para não envelhecerem quando os limiares mudarem.
  const vigentes = limiaresVigentes(motor.mundo.limiares, motor.relogio.iso);
  const limiaresObservados = vigentes.filter((l) => l.origem === "observacao").length;
  const limiaresPreditivos = vigentes.filter((l) => l.origem === "previsao").length;
  const horizontes = motor.estado.previsoes.map((p) => p.horizonteHoras);
  const horizonteTexto = horizontes.length > 0 ? horizontes.join("/") : "6/12/24";

  return (
    <Painel
      titulo={rotulo("confiabilidade", modoTecnico)}
      aberto={aberto}
      aoAlternar={() => setAberto((v) => !v)}
      corpoRolavel={false}
      info={
        <>
          Mede duas coisas distintas. <b>O modelo</b>: a previsão de nível do posto{" "}
          {motor.mundo.postoId}, que roda a cada passo e projeta a cota para {horizonteTexto} h — é
          o único modelo da demonstração, e o que se mede é o nível previsto contra o nível que de
          fato ocorreu (RF-MOD-03). <b>Os gatilhos de alerta</b>: os dois caminhos pelos quais um
          alerta nasce — limiar observado e geofencing preditivo —, medidos por zonas alertadas
          contra zonas de fato inundadas (RF-ALT-06).{" "}
          <b style={{ color: "var(--cor-atencao)" }}>Números sintéticos</b> — servem para demonstrar
          a métrica, não são medição operacional.
        </>
      }
      resumo={
        <>
          <span className="chip">
            POD&nbsp;<b>{pct(d.pod)}</b>
          </span>
          <span className="chip">
            CSI&nbsp;<b>{pct(d.csi)}</b>
          </span>
          <span className="chip">RMSE&nbsp;<b>{fmt(d.rmse, " m")}</b></span>
        </>
      }
    >
      {/* A tarja de ressalva fica FIXA: ela qualifica tudo o que vem abaixo e
          não pode sair da vista quando o operador rola as métricas. */}
      <div className="desempenho-tarja">
        <span className="selo-demo" style={{ background: "var(--cor-atencao)" }}>
          SINTÉTICO
        </span>
        <span style={{ fontSize: 10, color: "var(--cor-texto-fraco)" }}>
          derivado da simulação — não é medição operacional
        </span>
      </div>

      <div className="desempenho-rolagem">
      <div className="desempenho-secao">
        <div className="desempenho-secao-titulo">
          ACURÁCIA DO MODELO · 1 modelo
        </div>
        <p className="desempenho-secao-escopo">
          Modelo hidrológico de previsão de nível do posto <b>{motor.mundo.postoId}</b>, executado a
          cada passo com horizontes de {horizonteTexto} h. Acopla chuva observada e prevista para
          projetar a cota do rio — é dele que sai a mancha de inundação. Aqui comparamos o nível
          que ele previu 6 h antes com o nível que de fato ocorreu.
        </p>
      </div>

      {coletando ? (
        <p style={{ fontSize: 11, color: "var(--cor-texto-fraco)", margin: "0 0 var(--espaco-3)" }}>
          Coletando amostras previsto × realizado ({d.amostras}/2). As métricas do modelo aparecem
          após o horizonte de previsão.
        </p>
      ) : (
        <div style={{ display: "flex", gap: "var(--espaco-2)", flexWrap: "wrap", marginBottom: "var(--espaco-3)" }}>
          <Metrica
            rotulo="NSE"
            valor={fmt(d.nse)}
            requisito="RF-MOD-03"
            dica={
              <>
                Eficiência de Nash–Sutcliffe. Compara o erro do modelo com o erro de simplesmente
                chutar a média da série. <b>1,00</b> é previsão perfeita; <b>0</b> significa que o
                modelo não é melhor que a média; valores negativos, que é pior que ela.
              </>
            }
          />
          <Metrica
            rotulo="RMSE"
            valor={fmt(d.rmse, " m")}
            requisito="RF-MOD-03"
            dica={
              <>
                Raiz do erro quadrático médio, em metros de cota. O erro típico da previsão,
                penalizando mais os erros grandes. Quanto menor, melhor.
              </>
            }
          />
          <Metrica
            rotulo="MAE"
            valor={fmt(d.mae, " m")}
            requisito="RF-MOD-03"
            dica={
              <>
                Erro absoluto médio, em metros. Quanto o modelo erra em média, sem penalizar
                extremos. Comparado ao RMSE, indica se há poucos erros muito grandes.
              </>
            }
          />
          <Metrica
            rotulo="VIÉS"
            valor={fmt(d.vies, " m")}
            requisito="RF-MOD-03"
            dica={
              <>
                Erro médio com sinal, em metros. <b>Positivo</b> = o modelo tende a superestimar a
                cota; <b>negativo</b> = tende a subestimar. Perto de zero é o desejável.
              </>
            }
          />
        </div>
      )}

      <div className="desempenho-secao">
        <div className="desempenho-secao-titulo">
          EFICÁCIA DOS ALERTAS · 2 gatilhos
        </div>
        <p className="desempenho-secao-escopo">
          Um alerta nasce por um de dois caminhos, e ambos entram nesta conta:
        </p>
        <ol className="desempenho-gatilhos">
          <li>
            <b>Limiar observado</b> ({limiaresObservados} limiar
            {limiaresObservados === 1 ? "" : "es"} vigente{limiaresObservados === 1 ? "" : "s"}) —
            chuva acumulada na janela da zona ultrapassa o valor cadastrado. Reage ao que já
            aconteceu, sem antecedência.
          </li>
          <li>
            <b>Geofencing preditivo</b> ({limiaresPreditivos} limiar
            {limiaresPreditivos === 1 ? "" : "es"} vigente{limiaresPreditivos === 1 ? "" : "s"}) — a
            mancha projetada pela cota prevista intercepta uma zona de risco. É o que dá as 12 h de
            antecedência.
          </li>
        </ol>
        <p className="desempenho-secao-escopo">
          A medição compara as zonas que o sistema alertou com as zonas que a mancha realizada de
          fato interceptou.
        </p>
      </div>

      <div style={{ display: "flex", gap: "var(--espaco-2)", flexWrap: "wrap" }}>
        <Metrica
          rotulo="POD"
          valor={pct(d.pod)}
          requisito="RF-ALT-06"
          dica={
            <>
              Probabilidade de detecção: das zonas que inundaram, quantas o sistema havia alertado.{" "}
              <b>100%</b> = nenhuma zona ficou sem aviso. POD alto com FAR alto significa que o
              sistema alerta demais.
            </>
          }
        />
        <Metrica
          rotulo="FAR"
          valor={pct(d.far)}
          requisito="RF-ALT-06"
          dica={
            <>
              Taxa de alarme falso: das zonas alertadas, quantas não inundaram. Quanto menor,
              melhor — alarme falso é o que corrói a confiança da população no aviso.
            </>
          }
        />
        <Metrica
          rotulo="CSI"
          valor={pct(d.csi)}
          requisito="RF-ALT-06"
          dica={
            <>
              Índice crítico de sucesso: combina acertos, perdas e alarmes falsos em um número só.
              É a melhor leitura isolada da qualidade do alerta — quanto mais perto de 100%, melhor.
            </>
          }
        />
      </div>
      <p style={{ fontSize: 10, color: "var(--cor-texto-fraco)", marginTop: "var(--espaco-2)" }}>
        {d.acertos} acerto(s) · {d.perdas} perda(s) · {d.falsosAlarmes} falso(s) alarme(s), sobre
        zonas alertadas × zonas inundadas na simulação.
      </p>
      </div>
    </Painel>
  );
}
