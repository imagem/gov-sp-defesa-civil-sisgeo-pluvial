import PainelKPI from "./PainelKPI";
import ResumoEnxame from "./ResumoEnxame";
import { useSimulacao } from "@/estado/store";
import { rotulo } from "./textos";

export default function Navegacao() {
  const pagina = useSimulacao((s) => s.pagina);
  const irPara = useSimulacao((s) => s.irPara);
  const modoTecnico = useSimulacao((s) => s.modoTecnico);

  const emAlertas = pagina === "alertas";

  return (
    <nav aria-label="Páginas da sala de situação" className="barra-navegacao">
      {/*
        A sala NAO tem aba "Operacional": a pagina operacional e o estado de
        repouso, e cada pagina sobreposta tem seu proprio botao "Fechar", que
        devolve o operador para ca. Uma aba para "voltar ao normal" seria um
        segundo caminho para a mesma coisa.
      */}
      <div className="barra-navegacao-esquerda">
        <button
          type="button"
          className={emAlertas ? "botao botao-nav botao-nav-ativo" : "botao botao-nav"}
          aria-current={emAlertas ? "page" : undefined}
          onClick={() => irPara(emAlertas ? "operacional" : "alertas")}
        >
          {rotulo("alertas", modoTecnico)} &amp; Deliberações
        </button>
      </div>

      {/* Os KPIs sao o estado da sala: ficam no centro exato da barra. A
          grade de tres colunas (1fr auto 1fr) e o que garante o centro —
          centralizar dentro do espaco que sobra deslocaria a faixa, porque
          os dois lados tem larguras diferentes. */}
      <div className="barra-navegacao-centro">
        <PainelKPI />
      </div>

      {/* "Agentes & Fluxo" tambem nao tem aba: a pagina e alcancada pelo
          "Ver agentes" da faixa do enxame, a direita desta mesma fileira. */}
      <ResumoEnxame />
    </nav>
  );
}
