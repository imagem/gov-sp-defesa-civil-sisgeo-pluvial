import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSimulacao } from "@/estado/store";
import { DESCRICAO_BASEMAP, MINIATURA_BASEMAP, ROTULO_BASEMAP, BASEMAPS } from "@/mapa/miniaturas";
import { ajustarZoom } from "@/mapa/vista";
import { CAMADAS_IDS, type CamadaId } from "@/mapa/visibilidade";

type Menu = "camadas" | "basemap" | null;

interface DescritorCamada {
  readonly rotulo: string;
  readonly descricao: string;
  /** Amostra da simbologia da camada no mapa, para reconhecê-la sem legenda. */
  readonly amostra: ReactNode;
}

/** Quadrado/linha colorida que reproduz como a camada aparece no mapa. */
function Amostra({
  preenchimento,
  borda,
  forma = "quadrado",
}: {
  preenchimento: string;
  borda: string;
  forma?: "quadrado" | "ponto" | "losango";
}) {
  const raio = forma === "ponto" ? "50%" : forma === "losango" ? "3px" : "4px";
  return (
    <span
      className="camada-amostra"
      aria-hidden="true"
      style={{
        background: preenchimento,
        border: `1.5px solid ${borda}`,
        borderRadius: raio,
        transform: forma === "losango" ? "rotate(45deg)" : undefined,
      }}
    />
  );
}

const CAMADAS: Record<CamadaId, DescritorCamada> = {
  mancha: {
    rotulo: "Mancha de inundação",
    descricao: "Área alagada projetada pela cota prevista",
    amostra: <Amostra preenchimento="rgba(59,130,246,0.45)" borda="rgba(147,197,253,0.95)" />,
  },
  zonas: {
    rotulo: "Zonas de risco",
    descricao: "Setores cadastrados; vermelho quando sob alerta",
    amostra: <Amostra preenchimento="rgba(251,146,60,0.3)" borda="rgba(251,191,36,0.9)" />,
  },
  estacoes: {
    rotulo: "Estações",
    descricao: "Rede de monitoramento, colorida pela situação",
    amostra: <Amostra preenchimento="rgba(52,211,153,0.95)" borda="rgba(7,11,20,0.9)" forma="ponto" />,
  },
  equipes: {
    rotulo: "Equipes em campo",
    descricao: "Viaturas despachadas, com técnico e tempo restante",
    amostra: <Amostra preenchimento="rgba(251,191,36,0.95)" borda="rgba(7,11,20,0.9)" />,
  },
  ativos: {
    rotulo: "Ativos de proteção",
    descricao: "Comportas e EBAPs; verde quando mitigando",
    amostra: <Amostra preenchimento="rgba(226,232,240,0.95)" borda="rgba(7,11,20,0.9)" forma="losango" />,
  },
  subBacias: {
    rotulo: "Sub-bacias e corredor",
    descricao: "Contexto hidrográfico de base",
    amostra: <Amostra preenchimento="rgba(56,189,248,0.12)" borda="rgba(56,189,248,0.6)" />,
  },
};

function IconeCamadas() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 16 9 5 9-5" />
    </svg>
  );
}

function IconeBasemap() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z" />
      <path d="M9 4v14" />
      <path d="M15 6v14" />
    </svg>
  );
}

/**
 * Pilha vertical de controles do mapa, encostada na coluna de painéis e
 * alinhada ao topo dela: zoom em cima, camadas e mapa base logo abaixo.
 *
 * Fica no layout da página, não ancorada num canto da view: assim ela não se
 * desloca quando o operador recolhe "Saúde da rede" ou "Confiabilidade", que
 * era o que acontecia com o widget de zoom preso ao canto do mapa.
 */
export default function ControlesMapa() {
  const camadasVisiveis = useSimulacao((s) => s.camadasVisiveis);
  const alternarCamada = useSimulacao((s) => s.alternarCamada);
  const definirCamadas = useSimulacao((s) => s.definirCamadas);
  const basemapId = useSimulacao((s) => s.basemapId);
  const definirBasemap = useSimulacao((s) => s.definirBasemap);

  const [menuAberto, setMenuAberto] = useState<Menu>(null);
  const raizRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuAberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (raizRef.current && !raizRef.current.contains(e.target as Node)) setMenuAberto(null);
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuAberto(null);
    }
    window.addEventListener("mousedown", aoClicarFora);
    window.addEventListener("keydown", aoTeclar);
    return () => {
      window.removeEventListener("mousedown", aoClicarFora);
      window.removeEventListener("keydown", aoTeclar);
    };
  }, [menuAberto]);

  function alternarMenu(menu: Exclude<Menu, null>) {
    setMenuAberto((atual) => (atual === menu ? null : menu));
  }

  const visiveis = CAMADAS_IDS.filter((id) => camadasVisiveis[id]).length;

  return (
    <div ref={raizRef} className="controles-mapa">
      <div className="controles-mapa-grupo">
        <button
          type="button"
          className="botao controle-mapa-botao"
          aria-label="Aproximar o mapa"
          title="Aproximar"
          onClick={() => ajustarZoom(1)}
        >
          <span aria-hidden="true">+</span>
        </button>
        <button
          type="button"
          className="botao controle-mapa-botao"
          aria-label="Afastar o mapa"
          title="Afastar"
          onClick={() => ajustarZoom(-1)}
        >
          <span aria-hidden="true">−</span>
        </button>
      </div>

      <div className="controles-mapa-grupo">
        <button
          type="button"
          className={
            menuAberto === "camadas"
              ? "botao controle-mapa-botao controle-mapa-botao-ativo"
              : "botao controle-mapa-botao"
          }
          onClick={() => alternarMenu("camadas")}
          aria-expanded={menuAberto === "camadas"}
          aria-label={`Camadas do mapa (${visiveis} de ${CAMADAS_IDS.length} visíveis)`}
          title="Camadas"
        >
          <IconeCamadas />
          {visiveis < CAMADAS_IDS.length ? (
            <span className="controle-mapa-selo">{visiveis}</span>
          ) : null}
        </button>
        <button
          type="button"
          className={
            menuAberto === "basemap"
              ? "botao controle-mapa-botao controle-mapa-botao-ativo"
              : "botao controle-mapa-botao"
          }
          onClick={() => alternarMenu("basemap")}
          aria-expanded={menuAberto === "basemap"}
          aria-label={`Mapa base: ${ROTULO_BASEMAP[basemapId]}`}
          title={`Mapa base: ${ROTULO_BASEMAP[basemapId]}`}
        >
          <IconeBasemap />
        </button>
      </div>

      {menuAberto === "camadas" ? (
        <div className="controles-mapa-painel vidro-forte" role="group" aria-label="Camadas">
          <div className="controles-mapa-topo">
            <p className="controles-mapa-titulo">Camadas</p>
            <button
              type="button"
              className="controles-mapa-acao"
              onClick={() => definirCamadas(visiveis !== CAMADAS_IDS.length)}
            >
              {visiveis === CAMADAS_IDS.length ? "Ocultar todas" : "Mostrar todas"}
            </button>
          </div>

          <ul className="camadas-lista">
            {CAMADAS_IDS.map((id) => {
              const c = CAMADAS[id];
              const ligada = camadasVisiveis[id];
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={ligada ? "camada-item camada-item-ligada" : "camada-item"}
                    role="switch"
                    aria-checked={ligada}
                    onClick={() => alternarCamada(id)}
                  >
                    {c.amostra}
                    <span className="camada-texto">
                      <span className="camada-rotulo">{c.rotulo}</span>
                      <span className="camada-descricao">{c.descricao}</span>
                    </span>
                    <span className="camada-interruptor" aria-hidden="true">
                      <span />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {menuAberto === "basemap" ? (
        <div
          className="controles-mapa-painel controles-mapa-painel-base vidro-forte"
          role="radiogroup"
          aria-label="Mapa base"
        >
          <p className="controles-mapa-titulo">Mapa base</p>
          <div className="basemap-grade">
            {BASEMAPS.map((id) => {
              const ativo = basemapId === id;
              return (
                <button
                  key={id}
                  type="button"
                  className={ativo ? "basemap-opcao basemap-opcao-ativa" : "basemap-opcao"}
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => definirBasemap(id)}
                >
                  <img
                    className="basemap-miniatura"
                    src={MINIATURA_BASEMAP[id]}
                    alt=""
                    // Sem loading="lazy": as miniaturas so existem no DOM
                    // enquanto o seletor esta aberto, e o carregamento
                    // preguicoso depende do observador de interseccao, que
                    // nao dispara quando a aba esta em segundo plano — o
                    // operador abria o seletor e via cinco quadrados vazios.
                    draggable={false}
                  />
                  <span className="basemap-rotulo">{ROTULO_BASEMAP[id]}</span>
                  <span className="basemap-descricao">{DESCRICAO_BASEMAP[id]}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
