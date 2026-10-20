import GrafoAgentes from "@/ui/GrafoAgentes";
import PainelAgentes from "@/ui/PainelAgentes";

export default function PaginaAgentes() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(320px, 420px) 1fr",
        gap: "var(--espaco-4)",
        height: "100%",
        minHeight: 0,
      }}
    >
      <div style={{ display: "grid", minHeight: 0, overflow: "auto", alignContent: "start" }}>
        <PainelAgentes />
      </div>
      <div style={{ display: "grid", minHeight: 0 }}>
        <GrafoAgentes alturaFixa={false} />
      </div>
    </div>
  );
}
