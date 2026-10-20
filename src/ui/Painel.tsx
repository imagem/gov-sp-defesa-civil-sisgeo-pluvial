import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

interface PainelProps {
  titulo: string;
  aberto: boolean;
  /**
   * Alterna entre aberto e recolhido. Omitido quando o painel é fechável
   * (`aoFechar`): painéis que ocupam uma página inteira não se recolhem.
   */
  aoAlternar?: () => void;
  /**
   * Fecha o painel e devolve o operador à página anterior. Quando presente,
   * o cabeçalho mostra um botão "Fechar" no lugar do botão de recolher —
   * recolher um painel que ocupa a página inteira não deixaria nada à vista.
   */
  aoFechar?: () => void;
  resumo?: ReactNode;
  info?: ReactNode;
  children: ReactNode;
  /**
   * false remove o padding padrão do <section> — usado pelo Fluxo do dado,
   * cujo conteúdo (canvas do React Flow) precisa preencher o cartão até a
   * borda, exatamente como preenchia antes deste componente existir.
   */
  comPadding?: boolean;
  /**
   * false quando o próprio painel controla onde fica a barra de rolagem —
   * caso de Saúde da rede e Confiabilidade, onde a parte de cima é fixa e só
   * a parte de baixo rola. Quando true (padrão), o corpo inteiro rola, e essa
   * é a ÚNICA barra de rolagem do cartão.
   */
  corpoRolavel?: boolean;
  estiloSecao?: CSSProperties;
}

export default function Painel({
  titulo,
  aberto,
  aoAlternar,
  aoFechar,
  resumo,
  info,
  children,
  comPadding = true,
  corpoRolavel = true,
  estiloSecao,
}: PainelProps) {
  const [infoAberta, setInfoAberta] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);
  const prefereReduzido = useReducedMotion();

  // Recolher o painel fecha o popover de info (evita popover orfao sobre o resumo).
  useEffect(() => {
    if (!aberto) setInfoAberta(false);
  }, [aberto]);

  useEffect(() => {
    if (!infoAberta) return;
    function aoClicarFora(e: MouseEvent) {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) setInfoAberta(false);
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setInfoAberta(false);
    }
    window.addEventListener("mousedown", aoClicarFora);
    window.addEventListener("keydown", aoTeclar);
    return () => {
      window.removeEventListener("mousedown", aoClicarFora);
      window.removeEventListener("keydown", aoTeclar);
    };
  }, [infoAberta]);

  const paddingHeader = comPadding ? undefined : "0 var(--espaco-4)";
  const paddingResumo = comPadding ? undefined : "0 var(--espaco-4) var(--espaco-3)";

  return (
    <section
      className={comPadding ? "vidro painel" : "vidro painel-sem-padding"}
      style={{
        // O dimensionamento na coluna (quem encolhe, quem rola) fica só no
        // CSS, em .coluna-paineis — um `flex` aqui viria como estilo inline e
        // venceria a regra que deixa o último cartão da coluna absorver a
        // sobra, que é justamente o comportamento desejado.
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        // O popover de info e absoluto: com ele aberto o cartao nao pode cortar
        // (overflow) nem ficar atras dos paineis seguintes (stacking context).
        position: "relative",
        zIndex: infoAberta ? "var(--z-paineis)" : undefined,
        overflow: infoAberta ? "visible" : "hidden",
        ...estiloSecao,
      }}
    >
      <div className="painel-cabecalho" style={{ padding: paddingHeader }}>
        <h2 className="titulo-painel">{titulo}</h2>
        <div ref={infoRef} className="painel-cabecalho-acoes">
          {info ? (
            <>
              <button
                type="button"
                className="botao-icone"
                aria-label={`Como ler: ${titulo}`}
                aria-expanded={infoAberta}
                onClick={() => setInfoAberta((v) => !v)}
              >
                i
              </button>
              {infoAberta ? (
                <div className="painel-popover-info" role="tooltip">
                  {info}
                </div>
              ) : null}
            </>
          ) : null}
          {aoFechar ? (
            <button type="button" className="botao botao-fechar" onClick={aoFechar}>
              Fechar
            </button>
          ) : aoAlternar ? (
            <button
              type="button"
              className="botao-icone"
              aria-label={aberto ? `Recolher ${titulo}` : `Expandir ${titulo}`}
              aria-expanded={aberto}
              onClick={aoAlternar}
            >
              {aberto ? "▲" : "▼"}
            </button>
          ) : null}
        </div>
      </div>

      {/*
        Troca direta entre corpo e resumo, sem AnimatePresence.

        Com `mode="wait"` o AnimatePresence espera o filho que sai terminar a
        animação antes de montar o que entra — e aqui ele travava: o painel
        ficava com aria-expanded="true" e o corpo recolhido ainda na tela,
        sem nunca completar a saída. Um cartão que não abre é pior do que um
        cartão que abre sem transição de saída, então cada ramo apenas aparece
        com um fade próprio e o React faz a troca na hora.
      */}
      {aberto ? (
        <motion.div
          key="conteudo"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefereReduzido ? 0 : 0.18 }}
          className="painel-corpo"
          style={{ overflow: corpoRolavel && comPadding ? "auto" : "hidden" }}
        >
          {children}
        </motion.div>
      ) : (
        <motion.div
          key="resumo"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefereReduzido ? 0 : 0.18 }}
          className="painel-resumo"
          style={{ padding: paddingResumo }}
        >
          {resumo}
        </motion.div>
      )}
    </section>
  );
}
