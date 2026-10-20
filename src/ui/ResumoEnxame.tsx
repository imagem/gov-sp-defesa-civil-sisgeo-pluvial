import { useSimulacao } from "@/estado/store";
import Dica from "./Dica";

/**
 * Situação do enxame na barra de navegação, alinhada à direita e com a mesma
 * altura dos botões de página — o enxame é contexto permanente da sala, não um
 * painel que disputa espaço com o mapa.
 */
export default function ResumoEnxame() {
  const motor = useSimulacao((s) => s.motor);
  useSimulacao((s) => s.versao);
  const irPara = useSimulacao((s) => s.irPara);
  const pagina = useSimulacao((s) => s.pagina);

  const total = motor.agentes.length;
  const ativos = motor.agentes.filter((a) => a.status !== "falha").length;
  const bloqueados = motor.agentes.filter((a) => a.status === "bloqueado").length;
  const comFalha = total - ativos;

  const saudavel = comFalha === 0;
  const cor = saudavel ? "var(--cor-ok)" : "var(--cor-critica)";

  return (
    <div className="resumo-enxame">
      <span className={saudavel ? "chip-ponto" : "chip-ponto pulsando"} style={{ background: cor }} />
      <span className="resumo-enxame-texto">
        <b>
          {ativos}/{total}
        </b>{" "}
        agentes ativos
        {bloqueados > 0 ? (
          <>
            {" · "}
            <b style={{ color: "var(--cor-critica)" }}>{bloqueados}</b> aguardando decisão
          </>
        ) : null}
      </span>
      <Dica sobre="Enxame de agentes">
        O enxame são os {total} agentes especialistas que processam cada passo da simulação, da
        ingestão da leitura até a trilha de auditoria. <b>Ativos</b> = respondendo normalmente.{" "}
        <b>Aguardando decisão</b> = o agente de expedição está bloqueado porque existe alerta
        candidato sem validação humana (RNF-18) — isso é o requisito funcionando, não uma falha.
      </Dica>
      {/* Sem botao proprio na navegacao, este e o unico caminho ate a pagina
          Agentes & Fluxo — por isso ele marca a pagina ativa como os demais. */}
      <button
        type="button"
        className={pagina === "agentes" ? "botao botao-nav botao-nav-ativo" : "botao botao-nav"}
        aria-current={pagina === "agentes" ? "page" : undefined}
        onClick={() => irPara("agentes")}
      >
        Ver agentes
      </button>
    </div>
  );
}
