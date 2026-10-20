import { useEffect } from "react";
import MapaSalaSituacao from "@/mapa/MapaSalaSituacao";
import Cabecalho from "@/ui/Cabecalho";
import ModalBoletim from "@/ui/ModalBoletim";
import DossieAlerta from "@/ui/DossieAlerta";
import Navegacao from "@/ui/Navegacao";
import PaginaAgentes from "@/ui/paginas/PaginaAgentes";
import PaginaAlertas from "@/ui/paginas/PaginaAlertas";
import PaginaOperacional from "@/ui/paginas/PaginaOperacional";
import { useSimulacao, VELOCIDADES } from "@/estado/store";
import "@/styles/glass.css";
import "@/styles/componentes.css";
import "@/styles/sala.css";

export default function App() {
  const rodando = useSimulacao((s) => s.rodando);
  const velocidadeIndice = useSimulacao((s) => s.velocidadeIndice);
  const passo = useSimulacao((s) => s.passo);
  const pagina = useSimulacao((s) => s.pagina);

  // Laco de execucao da simulacao.
  useEffect(() => {
    if (!rodando) return;
    const intervalo = VELOCIDADES[velocidadeIndice]?.msPorTick ?? 500;
    const id = window.setInterval(passo, intervalo);
    return () => window.clearInterval(id);
  }, [rodando, velocidadeIndice, passo]);

  const operacional = pagina === "operacional";

  return (
    <div style={{ position: "relative", height: "100%", overflow: "hidden" }}>
      {/* O mapa fica sempre montado (preserva o estado); as paginas Agentes e
          Alertas apenas o cobrem com uma superficie opaca. */}
      <MapaSalaSituacao />

      <div
        style={{
          position: "relative",
          height: "100%",
          display: "grid",
          gridTemplateRows: "auto auto 1fr",
          pointerEvents: "none",
        }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <Cabecalho />
        </div>
        <div style={{ pointerEvents: "auto" }}>
          <Navegacao />
        </div>

        {operacional ? (
          <PaginaOperacional />
        ) : (
          // Wrapper full-bleed do track 1fr: captura cliques em toda a area
          // (inclusive nos gutters, que sao padding e nao margin), para que o
          // mapa nao receba cliques por baixo das paginas cobertas.
          <div
            style={{
              pointerEvents: "auto",
              minHeight: 0,
              display: "flex",
              padding: "0 var(--espaco-3) var(--espaco-3)",
            }}
          >
            <div
              className="vidro"
              style={{
                flex: 1,
                background: "var(--cor-fundo)",
                padding: "var(--espaco-3)",
                minHeight: 0,
                minWidth: 0,
                overflow: "auto",
              }}
            >
              {pagina === "agentes" ? <PaginaAgentes /> : <PaginaAlertas />}
            </div>
          </div>
        )}
      </div>

      <ModalBoletim />
      <DossieAlerta />
    </div>
  );
}
