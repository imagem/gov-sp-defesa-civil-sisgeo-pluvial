import type { ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";
import { selecionarKpis, useSimulacao } from "@/estado/store";
import Dica from "./Dica";

/**
 * Cartão de KPI de tamanho FIXO.
 *
 * Largura, altura e as três faixas internas (rótulo, valor, detalhe) têm
 * medidas fechadas: o conteúdo muda a cada passo da simulação e, sem isso, um
 * valor mais longo ("12.345" no lugar de "0") reflui a faixa inteira e os
 * cartões dançam na tela. O marcador de ajuda fica ancorado no canto superior
 * direito, no mesmo ponto em todos os cartões, em vez de acompanhar o fim do
 * rótulo — que tem comprimento variável.
 */
function Cartao({
  rotulo,
  valor,
  detalhe,
  destaque,
  dica,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  destaque?: "ok" | "atencao" | "critico";
  dica: ReactNode;
}) {
  const cor =
    destaque === "critico"
      ? "var(--cor-critica)"
      : destaque === "atencao"
        ? "var(--cor-atencao)"
        : destaque === "ok"
          ? "var(--cor-ok)"
          : "var(--cor-texto)";

  return (
    <div className="vidro cartao-com-dica kpi-cartao">
      <span className="kpi-dica">
        <Dica sobre={rotulo}>{dica}</Dica>
      </span>
      <span className="kpi-rotulo">{rotulo}</span>
      <span className="kpi-valor" style={{ color: cor }}>
        {valor}
      </span>
      <span className="kpi-detalhe">{detalhe ?? ""}</span>
    </div>
  );
}

export default function PainelKPI() {
  // useShallow evita o loop de renderizacao infinito do useSyncExternalStore:
  // selecionarKpis cria um objeto novo a cada chamada, e sem cache por
  // igualdade rasa o React nunca considera o snapshot estavel (correcao de bug).
  const kpis = useSimulacao(useShallow(selecionarKpis));
  useSimulacao((s) => s.versao);

  return (
    <div className="kpi-faixa">
      <Cartao
        rotulo="ANTECEDÊNCIA"
        valor={kpis.leadTimeMedioH === null ? "—" : `${kpis.leadTimeMedioH.toFixed(0)} h`}
        detalhe="média dos preditivos"
        destaque={kpis.leadTimeMedioH !== null && kpis.leadTimeMedioH >= 6 ? "ok" : undefined}
        dica={
          <>
            Quantas horas, em média, o sistema avisou ANTES do evento previsto. Conta apenas os
            alertas nascidos do geofencing preditivo — alertas de limiar observado reagem a algo
            que já ocorreu e não têm antecedência. É o indicador que mede se a sala ganha tempo
            para evacuar.
          </>
        }
      />
      <Cartao
        rotulo="REDE OPERANTE"
        valor={`${kpis.percentualOperante}%`}
        detalhe={`${kpis.estacoesOperantes}/${kpis.estacoesTotal} estações`}
        destaque={kpis.percentualOperante >= 90 ? "ok" : "atencao"}
        dica={
          <>
            Fração das estações de monitoramento transmitindo dentro da periodicidade esperada.
            Abaixo de 90% a previsão passa a trabalhar com lacunas. Clique em um bloco no painel
            "Saúde da rede" para ver qual estação caiu e despachar uma equipe.
          </>
        }
      />
      <Cartao
        rotulo="AGUARDANDO VALIDAÇÃO"
        valor={String(kpis.alertasAguardandoValidacao)}
        detalhe="exige decisão humana"
        destaque={kpis.alertasAguardandoValidacao > 0 ? "atencao" : undefined}
        dica={
          <>
            Alertas que o enxame propôs e que estão parados à espera de um operador identificado.
            Nada é expedido sem essa decisão (RNF-18): enquanto houver fila aqui, o agente de
            expedição permanece bloqueado — por projeto, não por falha.
          </>
        }
      />
      <Cartao
        rotulo="ALERTAS EXPEDIDOS"
        valor={String(kpis.alertasAtivos)}
        detalhe="vigentes agora"
        destaque={kpis.alertasAtivos > 0 ? "critico" : undefined}
        dica={
          <>
            Alertas já enviados aos destinatários (webhook, e-mail e CAP) e ainda vigentes. Saem
            da conta quando o agente antifadiga os encerra, após horas sem reforço.
          </>
        }
      />
      <Cartao
        rotulo="COTA PREVISTA"
        valor={`${kpis.cotaPrevistaM.toFixed(2)} m`}
        detalhe="em 12 h · posto de ref."
        dica={
          <>
            Nível do rio que o modelo hidrológico projeta para daqui a 12 h no posto de referência.
            É esta cota que desenha a mancha de inundação no mapa e que o geofencing preditivo
            cruza com as zonas de risco.
          </>
        }
      />
      <Cartao
        rotulo="POPULAÇÃO NAS ZONAS"
        valor={kpis.populacaoExposta.toLocaleString("pt-BR")}
        // Soma a populacao TOTAL de cada zona que a mancha apenas toca, nao
        // a populacao dentro da area de fato interceptada — o rotulo e o
        // detalhe precisam deixar isso explicito (metodoEstimativa vem de
        // ExposicaoCalculada, dominio/mancha.ts). "Populacao exposta" seria
        // uma alegacao mais forte do que este calculo sustenta.
        detalhe={kpis.populacaoExposta > 0 ? "zonas alcançadas" : "nenhuma zona alcançada"}
        destaque={kpis.populacaoExposta > 0 ? "critico" : undefined}
        dica={
          <>
            Soma da população TOTAL de cada zona que a mancha prevista toca — não da população
            dentro da área de fato interceptada. É um teto, não uma estimativa de expostos, e o
            rótulo diz isso de propósito.
            {kpis.metodoPopulacaoExposta ? (
              <>
                {" "}
                Método: {kpis.metodoPopulacaoExposta}.
              </>
            ) : null}
          </>
        }
      />
      <Cartao
        rotulo="LEITURAS REPROVADAS"
        valor={String(kpis.leiturasReprovadas)}
        detalhe="mantidas e sinalizadas"
        dica={
          <>
            Leituras que o controle de qualidade barrou (fora de faixa física, fora de ordem
            temporal, salto abrupto ou sensor travado). Elas nunca são apagadas: ficam no registro
            com o motivo e apenas não alimentam o motor de alerta (RF-ING-04).
          </>
        }
      />
    </div>
  );
}
