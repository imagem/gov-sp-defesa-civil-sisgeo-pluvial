/**
 * Logotipo da Coordenadoria Estadual de Proteção e Defesa Civil.
 *
 * A identidade institucional publicada em defesacivil.sp.gov.br é um logotipo
 * TIPOGRÁFICO: o cabeçalho do portal não traz símbolo pictórico próprio, apenas
 * a linha "Coordenadoria Estadual de" sobre "Proteção e Defesa Civil" em peso
 * forte, ao lado da marca SP.GOV.BR. O emblema laranja da Defesa Civil aparece
 * somente dentro de artes de campanha, embutido no bitmap do banner.
 *
 * Reproduzimos aqui o logotipo tipográfico tal como está no portal — sem
 * alteração de forma e sem fundo —, usando o azul padrão gov.br.
 */
export default function LogoDefesaCivil() {
  return (
    <span className="logo-defesa-civil" role="img" aria-label="Coordenadoria Estadual de Proteção e Defesa Civil">
      <span className="logo-defesa-civil-linha1">Coordenadoria Estadual de</span>
      <strong className="logo-defesa-civil-linha2">Proteção e Defesa Civil</strong>
    </span>
  );
}
