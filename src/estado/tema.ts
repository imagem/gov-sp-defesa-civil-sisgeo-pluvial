export type Tema = "escuro" | "claro";

const CHAVE_ARMAZENAMENTO = "demo.tema";

export function alternarTema(temaAtual: Tema): Tema {
  return temaAtual === "escuro" ? "claro" : "escuro";
}

export function lerTemaSalvo(armazenamento: Pick<Storage, "getItem"> | undefined): Tema {
  const valor = armazenamento?.getItem(CHAVE_ARMAZENAMENTO);
  return valor === "claro" ? "claro" : "escuro";
}

export function salvarTema(armazenamento: Pick<Storage, "setItem"> | undefined, tema: Tema): void {
  armazenamento?.setItem(CHAVE_ARMAZENAMENTO, tema);
}

export function aplicarTemaNoElemento(
  elemento: Pick<HTMLElement, "setAttribute" | "removeAttribute">,
  tema: Tema,
): void {
  if (tema === "claro") {
    elemento.setAttribute("data-tema", "claro");
  } else {
    elemento.removeAttribute("data-tema");
  }
}
