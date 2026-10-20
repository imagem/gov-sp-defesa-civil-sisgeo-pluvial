import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useSimulacao } from "@/estado/store";
import {
  calcularGemeoDigital,
  estadosIniciaisAtivos,
  impactoPorAtivo,
  melhorCombinacao,
  type ImpactoAtivo,
  type ParametrosGemeo,
} from "@/estado/gemeo";
import Painel from "./Painel";
import { rotulo } from "./textos";

function pessoas(n: number): string {
  return n.toLocaleString("pt-BR");
}

const ACAO: Record<string, string> = {
  fechada: "Fechar",
  aberta: "Abrir",
  operante: "Ligar",
  desligada: "Desligar",
};

const TIPO_CURTO: Record<ImpactoAtivo["tipo"], string> = {
  comporta: "Comporta",
  ebap: "EBAP",
};

/**
 * Uma linha por ativo, com a consequência da ação ANTES de tomá-la: quem sai
 * da exposição, quem entra por represamento, e o saldo. Quando a ação não
 * cruza nenhum limiar, mostra o deslocamento de cota e o quanto ainda falta —
 * é isso que revela que dois ativos sobre a mesma zona somam efeito.
 * Passar o cursor realça no mapa exatamente as zonas citadas.
 */
function LinhaAtivo({ impacto }: { impacto: ImpactoAtivo }) {
  const alternarAtivo = useSimulacao((s) => s.alternarAtivo);
  const destacarAtivo = useSimulacao((s) => s.destacarAtivo);

  const acao = ACAO[impacto.proximoEstado] ?? impacto.proximoEstado;
  const mudaPopulacao = impacto.protegidas.length > 0 || impacto.expostas.length > 0;

  const corSaldo =
    impacto.saldo > 0 ? "var(--cor-ok)" : impacto.saldo < 0 ? "var(--cor-critica)" : undefined;

  return (
    <li
      className={impacto.tocaAlerta ? "gemeo-linha gemeo-linha-alerta" : "gemeo-linha"}
      onMouseEnter={() => destacarAtivo(impacto.ativoId)}
      onMouseLeave={() => destacarAtivo(null)}
    >
      <div className="gemeo-linha-topo">
        <span className="gemeo-ativo">
          {/* O id completo importa: CP-04 e EB-04 coexistem no mesmo mundo. */}
          <b>{impacto.ativoId}</b>
          <span className="gemeo-estado">
            {TIPO_CURTO[impacto.tipo]} · {impacto.estado}
          </span>
          {impacto.tocaAlerta ? <span className="gemeo-selo-alerta">zona em alerta</span> : null}
        </span>
        <button
          type="button"
          className={impacto.saldo > 0 ? "botao botao-primario gemeo-botao" : "botao gemeo-botao"}
          disabled={!impacto.operavel}
          onFocus={() => destacarAtivo(impacto.ativoId)}
          onBlur={() => destacarAtivo(null)}
          onClick={() => alternarAtivo(impacto.ativoId)}
        >
          {acao}
        </button>
      </div>

      {!impacto.operavel ? (
        <p className="gemeo-consequencia">Em manutenção — não pode ser operado.</p>
      ) : mudaPopulacao ? (
        <>
          {impacto.protegidas.length > 0 ? (
            <p className="gemeo-consequencia">
              <span style={{ color: "var(--cor-ok)" }}>
                protege {pessoas(impacto.populacaoProtegida)}
              </span>{" "}
              em {impacto.protegidas.map((z) => z.nome).join(", ")}
            </p>
          ) : null}
          {impacto.expostas.length > 0 ? (
            <p className="gemeo-consequencia">
              <span style={{ color: "var(--cor-atencao)" }}>
                represa sobre {pessoas(impacto.populacaoExposta)}
              </span>{" "}
              em {impacto.expostas.map((z) => z.nome).join(", ")}
            </p>
          ) : null}
          <p className="gemeo-saldo" style={{ color: corSaldo }}>
            saldo {impacto.saldo > 0 ? "+" : ""}
            {pessoas(impacto.saldo)} pessoas
          </p>
        </>
      ) : (
        <ul className="gemeo-deslocamentos">
          {impacto.deslocamentos.map((d) => {
            const falta = d.limiar === null ? null : d.cotaDepois - d.limiar;
            return (
              <li key={d.zonaId}>
                {d.nome}: {d.cotaAntes.toFixed(2)} m → <b>{d.cotaDepois.toFixed(2)} m</b>
                {falta !== null && falta >= 0 ? (
                  <> — ainda {falta.toFixed(2)} m acima do limiar de {d.limiar?.toFixed(2)} m</>
                ) : falta !== null ? (
                  <> — abaixo do limiar de {d.limiar?.toFixed(2)} m</>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

export default function PainelGemeoDigital() {
  const motor = useSimulacao((s) => s.motor);
  const estadosAtivos = useSimulacao(useShallow((s) => s.estadosAtivos));
  const resetGemeo = useSimulacao((s) => s.resetGemeo);
  const aplicarEstadosAtivos = useSimulacao((s) => s.aplicarEstadosAtivos);
  useSimulacao((s) => s.versao);
  const [aberto, setAberto] = useState(false);
  const [mostrarInertes, setMostrarInertes] = useState(false);
  const modoTecnico = useSimulacao((s) => s.modoTecnico);

  const params: ParametrosGemeo = {
    rede: motor.rede,
    zonas: motor.mundo.zonas,
    limiares: motor.mundo.limiares,
    ativos: motor.mundo.ativos,
    cotaPrevistaM: motor.estado.cotaPrevistaM,
  };

  // Zonas com alerta aberto: são elas que dão urgência ao what-if. Sem isso o
  // painel é um brinquedo; com isso ele responde "o que faço com ESTE alerta".
  // Sem useMemo: o estado do motor é mutável (o React observa `versao`), então
  // qualquer lista de dependências seria meia-verdade. A conta é barata.
  const zonasAlertadas = new Set(
    motor.estado.alertas
      .filter((a) => a.estado !== "descartado" && a.estado !== "encerrado")
      .map((a) => a.zonaId),
  );

  const g = calcularGemeoDigital(params, estadosAtivos);
  const impactos = impactoPorAtivo(params, estadosAtivos, zonasAlertadas);

  // São ~37 ativos no mundo. Listar todos afoga o que importa: primeiro os que
  // mexem em zona sob alerta, depois os de maior saldo; os inertes ficam atrás
  // de um botão.
  const relevantes = impactos
    .filter((i) => i.operavel && (i.saldo !== 0 || i.deslocamentos.length > 0))
    .sort(
      (a, b) =>
        Number(b.tocaAlerta) - Number(a.tocaAlerta) ||
        b.saldo - a.saldo ||
        a.ativoId.localeCompare(b.ativoId),
    );
  const inertes = impactos.filter((i) => !relevantes.includes(i));

  const recomendado = melhorCombinacao(params, zonasAlertadas);
  const jaNoRecomendado = motor.mundo.ativos.every(
    (a) => (estadosAtivos[a.ativoId] ?? "") === recomendado[a.ativoId],
  );
  const expostosRecomendado = calcularGemeoDigital(params, recomendado).populacaoWhatIf;
  const expostosAgora = g.populacaoWhatIf;
  const ganhoRecomendado = Math.max(0, expostosAgora - expostosRecomendado);

  // "Restaurar" so faz sentido quando o operador de fato saiu da configuracao
  // inicial dos ativos.
  const iniciais = estadosIniciaisAtivos(motor.mundo.ativos);
  const alteradoPeloOperador = motor.mundo.ativos.some(
    (a) => estadosAtivos[a.ativoId] !== iniciais[a.ativoId],
  );

  return (
    <Painel
      titulo={rotulo("gemeoDigital", modoTecnico)}
      aberto={aberto}
      aoAlternar={() => setAberto((v) => !v)}
      info={
        <>
          Modo <b>what-if</b> (RF-TWN): responde "o que a operação dos ativos muda neste alerta".
          Cada ativo diz, antes de você agir, quem sai da exposição e quem passa a ser represado —
          fechar uma comporta protege a jusante e sobe a água a montante. Quando a ação não cruza
          nenhum limiar, o painel mostra quanto a cota desceu e quanto ainda falta: ativos sobre a
          mesma zona somam efeito. Passe o cursor sobre um ativo para realçar as zonas no mapa. É{" "}
          <b>simulação</b>: não dispara nem expede alerta. Números sintéticos.
        </>
      }
      resumo={
        <>
          <span className="chip" style={{ borderColor: g.populacaoProtegida > 0 ? "var(--cor-ok)" : undefined }}>
            protegidos&nbsp;<b>{pessoas(g.populacaoProtegida)}</b>
          </span>
          {zonasAlertadas.size > 0 ? (
            <span className="chip" style={{ borderColor: "var(--cor-critica)" }}>
              <b>{zonasAlertadas.size}</b>&nbsp;zona{zonasAlertadas.size > 1 ? "s" : ""} em alerta
            </span>
          ) : null}
        </>
      }
    >
      <div className="gemeo-tarja">
        <span className="selo-demo" style={{ background: "var(--cor-atencao)" }}>
          WHAT-IF · NÃO EXPEDE
        </span>
        {alteradoPeloOperador ? (
          <button className="botao gemeo-botao" style={{ marginLeft: "auto" }} onClick={resetGemeo}>
            Restaurar
          </button>
        ) : null}
      </div>

      <div className="gemeo-rolagem">
        <div className="gemeo-placar">
          <span className="gemeo-placar-rotulo">EXPOSTOS NA CONFIGURAÇÃO ATUAL</span>
          <span
            className="gemeo-placar-valor"
            style={{ color: expostosAgora > 0 ? "var(--cor-critica)" : "var(--cor-ok)" }}
          >
            {pessoas(expostosAgora)}
          </span>
          <span className="gemeo-placar-nota">
            sem operar nenhum ativo: {pessoas(g.populacaoBase)} · cota prevista{" "}
            {motor.estado.cotaPrevistaM.toFixed(2)} m
          </span>
        </div>

        {g.populacaoBase === 0 && expostosAgora === 0 ? (
          <p className="gemeo-recomendacao gemeo-recomendacao-ok">
            A cota prevista ainda não alcança o limiar de nenhuma zona — não há exposição a
            mitigar. Os ativos seguem disponíveis.
          </p>
        ) : jaNoRecomendado ? (
          <p className="gemeo-recomendacao gemeo-recomendacao-ok">
            A configuração atual já é a melhor combinação possível para esta cota.
          </p>
        ) : (
          <div className="gemeo-recomendacao">
            <span>
              {ganhoRecomendado > 0 ? (
                <>
                  A melhor combinação de ativos tiraria mais{" "}
                  <b style={{ color: "var(--cor-ok)" }}>{pessoas(ganhoRecomendado)}</b> pessoas da
                  exposição.
                </>
              ) : (
                <>A melhor combinação para esta cota difere da atual.</>
              )}
            </span>
            <button
              type="button"
              className="botao botao-primario gemeo-botao"
              onClick={() => aplicarEstadosAtivos(recomendado)}
            >
              Aplicar
            </button>
          </div>
        )}

        {relevantes.length > 0 ? (
          <ul className="gemeo-lista">
            {relevantes.map((impacto) => (
              <LinhaAtivo key={impacto.ativoId} impacto={impacto} />
            ))}
          </ul>
        ) : (
          <p className="gemeo-consequencia" style={{ marginTop: "var(--espaco-2)" }}>
            Nenhum ativo isolado muda a exposição nesta cota.
          </p>
        )}

        {inertes.length > 0 ? (
          <>
            <button
              type="button"
              className="gemeo-ver-mais"
              aria-expanded={mostrarInertes}
              onClick={() => setMostrarInertes((v) => !v)}
            >
              {mostrarInertes ? "Ocultar" : "Mostrar"} os {inertes.length} ativos sem efeito isolado
            </button>
            {mostrarInertes ? (
              <ul className="gemeo-lista">
                {inertes.map((impacto) => (
                  <LinhaAtivo key={impacto.ativoId} impacto={impacto} />
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </div>
    </Painel>
  );
}
