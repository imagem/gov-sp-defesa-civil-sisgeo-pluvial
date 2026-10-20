import { useId, useState, type ReactNode } from "react";

type Posicao = "baixo" | "cima";

interface DicaProps {
  /** Texto de orientação mostrado ao operador. */
  children: ReactNode;
  /** Rótulo do elemento a que a dica se refere (lido por leitor de tela). */
  sobre: string;
  posicao?: Posicao;
}

/**
 * Marcador de ajuda ("?") que explica um indicador ao operador/analista.
 *
 * Aparece no hover E no foco por teclado — um `title` nativo não é alcançável
 * por teclado nem por leitor de tela, e estes painéis são operados em plantão,
 * muitas vezes sem mouse. O conteúdo fica sempre no DOM, associado ao botão
 * por aria-describedby, e apenas a visibilidade é alternada.
 */
export default function Dica({ children, sobre, posicao = "baixo" }: DicaProps) {
  const id = useId();
  const [visivel, setVisivel] = useState(false);

  return (
    <span className="dica">
      <button
        type="button"
        className="dica-marcador"
        aria-label={`O que é: ${sobre}`}
        aria-describedby={id}
        aria-expanded={visivel}
        onMouseEnter={() => setVisivel(true)}
        onMouseLeave={() => setVisivel(false)}
        // Abrir pelo foco cobre teclado E toque: num toque o navegador foca o
        // botao antes de disparar o clique. Nao ha onClick de alternancia —
        // ele fecharia de imediato o balao que o foco acabou de abrir.
        onFocus={() => setVisivel(true)}
        onBlur={() => setVisivel(false)}
      >
        ?
      </button>
      <span
        id={id}
        role="tooltip"
        className={`dica-balao dica-balao-${posicao}`}
        hidden={!visivel}
      >
        {children}
      </span>
    </span>
  );
}
