import { useEffect, useRef } from "react";
import ArcGISMap from "@arcgis/core/Map.js";
import MapView from "@arcgis/core/views/MapView.js";
import Basemap from "@arcgis/core/Basemap.js";
import "@arcgis/core/assets/esri/themes/dark/main.css";
import { useShallow } from "zustand/react/shallow";
import { useSimulacao, type BasemapId } from "@/estado/store";
import { impactoPorAtivo } from "@/estado/gemeo";
import { configurarArcGIS, modoEnterprise } from "./config";
import { registrarVista } from "./vista";
import { autenticarNoPortal } from "./portal";
import { centroide } from "@/dominio/geometria";
import type { EstadoAlerta } from "@/dominio/tipos";
import { GerenciadorCamadas } from "./camadas";

/**
 * Basemaps sem API key (OSM, Satelite, Topografico) via Basemap.fromId.
 * Quando o Enterprise de Sao Paulo estiver configurado, trocar por
 * um webmap do portal via VITE_ARCGIS_BASEMAP_ID.
 */
export function basemapPorId(id: BasemapId): Basemap {
  const basemap = Basemap.fromId(id);
  if (!basemap) throw new Error(`basemap '${id}' indisponivel`);
  return basemap;
}

export default function MapaSalaSituacao() {
  const container = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<MapView | null>(null);
  const mapaRef = useRef<ArcGISMap | null>(null);
  // Inicializacao preguicosa: um useRef(new GerenciadorCamadas()) constroi o
  // gerenciador (e as cinco GraphicsLayer que o construtor cria) A CADA
  // render, so pra o useRef descartar todos menos o primeiro. Como este
  // componente re-renderiza a cada tick, isso e uma GerenciadorCamadas nova
  // (com layers novas) por render so para ser jogada fora.
  const camadasRef = useRef<GerenciadorCamadas | null>(null);
  function obterCamadas(): GerenciadorCamadas {
    if (!camadasRef.current) camadasRef.current = new GerenciadorCamadas();
    return camadasRef.current;
  }

  // Estado anterior dos alertas (alertaId -> estado), para disparar o pulso de
  // zona apenas na TRANSICAO (alerta novo ou recem-validado), nunca a cada tick.
  // `motor` identifica o cenario ao qual o mapa pertence: ao trocar de motor o
  // mapa e re-semeado sem pulsar.
  const alertasVistosRef = useRef<{ motor: unknown; estados: Map<string, EstadoAlerta> } | null>(
    null,
  );

  const motor = useSimulacao((s) => s.motor);
  const versao = useSimulacao((s) => s.versao);
  const cenarioId = useSimulacao((s) => s.cenarioId);
  const estadosAtivos = useSimulacao(useShallow((s) => s.estadosAtivos));
  const camadasVisiveis = useSimulacao(useShallow((s) => s.camadasVisiveis));
  const basemapId = useSimulacao((s) => s.basemapId);
  // Basemap ja aplicado ao Map atual: evita recarregar o mesmo basemap.
  const basemapAplicadoRef = useRef<BasemapId | null>(null);
  const definirPortalAutenticado = useSimulacao((s) => s.definirPortalAutenticado);
  const ativoDestacado = useSimulacao((s) => s.ativoDestacado);

  // Monta a view uma unica vez.
  useEffect(() => {
    if (!container.current || viewRef.current) return;

    configurarArcGIS();

    // O cabecalho (Cabecalho.tsx) so pode dizer "conectado ao portal" depois
    // que esta autenticacao de fato confirmar uma sessao — nunca so porque a
    // flag e o App ID estao configurados. Se o modo Enterprise estiver
    // desligado, autenticarNoPortal() e um no-op que resolve em false; o
    // cabecalho, por sua vez, so mostra estados de portal quando
    // modoEnterprise() for verdadeiro (ver descreverModo em ./config).
    if (modoEnterprise()) {
      void autenticarNoPortal().then(definirPortalAutenticado);
    }

    const basemapInicial = useSimulacao.getState().basemapId;
    const map = new ArcGISMap({ basemap: basemapPorId(basemapInicial) });
    basemapAplicadoRef.current = basemapInicial;
    mapaRef.current = map;
    const view = new MapView({
      container: container.current,
      map,
      center: [motor.mundo.centro[0], motor.mundo.centro[1]],
      zoom: 11,
      // Sem widgets proprios do ArcGIS: todos os cantos da view estao sob
      // cartoes flutuantes. Os controles vivem no layout React (ControlesMapa).
      ui: { components: [] },
      constraints: { snapToZoom: false },
    });
    viewRef.current = view;
    // O zoom e um controle nosso (ui/ControlesMapa), posicionado pelo layout
    // dos paineis: os quatro cantos da view estao ocupados por cartoes
    // flutuantes, e o widget do ArcGIS so ancora em canto.
    registrarVista(view);

    return () => {
      camadasRef.current?.limpar();
      registrarVista(null);
      view.destroy();
      viewRef.current = null;
      mapaRef.current = null;
      basemapAplicadoRef.current = null;
    };
  }, [motor.mundo.centro]);

  // Remonta a base quando o cenario muda (mundo novo, geometria nova).
  useEffect(() => {
    const view = viewRef.current;
    const mapa = mapaRef.current;
    if (!view || !mapa) return;
    const camadas = obterCamadas();
    camadas.limpar();
    camadas.montar(mapa, motor.mundo);
    camadas.desenharAtivos(motor.mundo, estadosAtivos);
    // montar() recria as GraphicsLayers (visiveis por padrao): reaplica a escolha.
    camadas.aplicarVisibilidade(useSimulacao.getState().camadasVisiveis);
    // Sem animacao: todo cenario usa o mesmo CENTRO_PADRAO (mundo.ts), entao o
    // destino e sempre identico ao centro com que a view ja foi construida.
    // Uma transicao animada aqui nunca move a camera — so mantem a view em
    // estado "nao estacionaria" por mais quadros de animacao do que o
    // necessario, atrasando o primeiro carregamento de blocos do basemap
    // (o TileStrategy so busca blocos em resolucao final quando a view fica
    // estacionaria).
    void view.goTo(
      { center: [motor.mundo.centro[0], motor.mundo.centro[1]], zoom: 11 },
      { animate: false },
    );
  }, [cenarioId, motor.mundo]);

  // Redesenha as camadas dinamicas a cada mudanca de versao.
  useEffect(() => {
    if (!viewRef.current) return;
    const agora = performance.now();
    const camadas = obterCamadas();

    for (const estacao of motor.estado.estacoes) {
      if (estacao.ultimaLeituraTs === motor.relogio.iso) {
        camadas.pulsar([estacao.posicao[0], estacao.posicao[1]], agora);
      }
    }

    // Pulso de zona: candidato recem-surgido ("novo") ou recem-validado.
    const anteriores = alertasVistosRef.current;
    const mesmoMotor = anteriores?.motor === motor;
    const estadosAnteriores = mesmoMotor ? anteriores.estados : new Map<string, EstadoAlerta>();
    const estadosAtuais = new Map<string, EstadoAlerta>();
    for (const alerta of motor.estado.alertas) {
      estadosAtuais.set(alerta.alertaId, alerta.estado);
      if (!mesmoMotor && anteriores) continue; // troca de cenario: so semeia
      const anterior = estadosAnteriores.get(alerta.alertaId);
      let tipo: "novo" | "validado" | null = null;
      if (anterior === undefined && alerta.estado === "candidato") {
        tipo = "novo";
      } else if (
        anterior === "candidato" &&
        (alerta.estado === "validado" || alerta.estado === "expedido")
      ) {
        tipo = "validado";
      }
      if (!tipo) continue;
      const zona = motor.mundo.zonas.find((z) => z.zonaId === alerta.zonaId);
      const anel = zona?.geometria.aneis[0];
      if (!anel) continue;
      const [x, y] = centroide(anel);
      camadas.pulsarZona([x, y], agora, tipo);
    }
    alertasVistosRef.current = { motor, estados: estadosAtuais };

    camadas.sincronizar(motor.mundo, motor.estado);
    camadas.desenharAtivos(motor.mundo, estadosAtivos);
    camadas.aplicarVisibilidade(camadasVisiveis);
  }, [versao, motor, estadosAtivos, camadasVisiveis]);

  // Realce das zonas afetadas pelo ativo sob o cursor no painel do gemeo
  // digital: o operador ve ONDE a decisao bate, nao so quantas pessoas move.
  useEffect(() => {
    if (!viewRef.current) return;
    const camadas = obterCamadas();
    if (!ativoDestacado) {
      camadas.destacarZonasGemeo(motor.mundo, [], []);
      return;
    }
    const impacto = impactoPorAtivo(
      {
        rede: motor.rede,
        zonas: motor.mundo.zonas,
        limiares: motor.mundo.limiares,
        ativos: motor.mundo.ativos,
        cotaPrevistaM: motor.estado.cotaPrevistaM,
      },
      estadosAtivos,
    ).find((i) => i.ativoId === ativoDestacado);

    camadas.destacarZonasGemeo(
      motor.mundo,
      impacto?.protegidas.map((z) => z.zonaId) ?? [],
      impacto?.expostas.map((z) => z.zonaId) ?? [],
    );
  }, [ativoDestacado, motor, estadosAtivos, versao]);

  // Troca o basemap. Apenas map.basemap muda: as GraphicsLayers sinteticas
  // vivem em map.layers e permanecem sobre o novo basemap.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || basemapAplicadoRef.current === basemapId) return;
    mapa.basemap = basemapPorId(basemapId);
    basemapAplicadoRef.current = basemapId;
  }, [basemapId]);

  // Laco de animacao dos pulsos, independente do tick da simulacao.
  useEffect(() => {
    let quadro = 0;
    const animar = () => {
      if (viewRef.current) {
        const camadas = obterCamadas();
        camadas.desenharPulsos(performance.now());
        camadas.desenharEquipes();
      }
      quadro = requestAnimationFrame(animar);
    };
    quadro = requestAnimationFrame(animar);
    return () => cancelAnimationFrame(quadro);
  }, [motor]);

  return (
    <div
      ref={container}
      style={{ position: "absolute", inset: 0, zIndex: "var(--z-mapa)" }}
    />
  );
}
