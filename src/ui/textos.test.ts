import { describe, expect, it } from "vitest";
import { rotulo } from "./textos";

describe("rotulo", () => {
  it("usa o nome operacional quando o modo tecnico esta desligado", () => {
    expect(rotulo("auditoria", false)).toBe("Rastreabilidade da decisão");
  });
  it("anexa o codigo tecnico quando o modo tecnico esta ligado", () => {
    expect(rotulo("auditoria", true)).toBe("Rastreabilidade da decisão · RF-GOV-02");
  });
  it("nao anexa nada quando a chave nao tem codigo", () => {
    expect(rotulo("filaAlertas", true)).toBe(rotulo("filaAlertas", false));
  });
});
