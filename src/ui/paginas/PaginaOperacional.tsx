import ControlesMapa from "@/ui/ControlesMapa";
import FilaAlertas from "@/ui/FilaAlertas";
import PainelDesempenho from "@/ui/PainelDesempenho";
import PainelGemeoDigital from "@/ui/PainelGemeoDigital";
import PainelSaudeRede from "@/ui/PainelSaudeRede";
import TrilhaAuditoria from "@/ui/TrilhaAuditoria";

/**
 * Página Operacional: duas colunas de painéis sobre o mapa, com a pilha de
 * controles do mapa encostada na coluna da esquerda.
 *
 * Os KPIs não estão aqui — vivem na barra de navegação, uma fileira acima.
 *
 * Cada coluna empilha os painéis a partir do TOPO, sem distribuir a altura
 * livre entre eles: o primeiro painel encosta na barra de navegação e cada
 * um dos seguintes encosta no de cima. A coluna rola quando a soma passa da
 * altura da janela, e cada painel tem seu próprio teto de altura (CSS), para
 * que um painel cheio role por dentro em vez de empurrar os irmãos.
 *
 * O container herda pointer-events "none" de App.tsx; só os painéis e os
 * controles o reativam, para o mapa continuar clicável nos vãos.
 */
export default function PaginaOperacional() {
  return (
    <div className="pagina-operacional">
      <div className="coluna-paineis">
        <PainelSaudeRede />
        <PainelDesempenho />
      </div>

      {/* Faixa central livre sobre o mapa. Só a pilha de controles, encostada
          na coluna da esquerda e alinhada ao topo dela, captura o clique. */}
      <div className="faixa-central">
        <ControlesMapa />
      </div>

      <div className="coluna-paineis">
        <FilaAlertas />
        <TrilhaAuditoria />
        <PainelGemeoDigital />
      </div>
    </div>
  );
}
