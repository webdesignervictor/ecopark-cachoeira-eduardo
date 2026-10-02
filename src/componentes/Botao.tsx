interface Props {
  href: string
  children: React.ReactNode
  variante?: 'cheio' | 'vazado'
  tamanho?: 'normal' | 'compacto'
  className?: string
  tabIndex?: number
  /** Ação no clique (ex.: abrir o Monte seu pack). O href continua como reserva sem JavaScript. */
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
  /** Nome da ação na medição (data-evento), quando o clique não é o próprio link. */
  evento?: string
  /** Halo pulsando em volta do botão cheio. Desligar onde ele seria cortado (ex.: rodapé de painel). */
  pulso?: boolean
}

/**
 * CTA em pílula com um círculo e seta na ponta.
 * Celular: brilho que atravessa, seta empurrando e halo pulsando (o cheio).
 * Desktop: no hover o círculo cresce e preenche o botão, invertendo as cores.
 * Tudo some com "reduzir movimento" (motion-safe).
 */
export function Botao({
  href, children, variante = 'cheio', tamanho = 'normal', className = '', tabIndex, onClick, evento, pulso = true,
}: Props) {
  const cheio = variante === 'cheio'
  const compacto = tamanho === 'compacto'

  const casca = cheio
    ? `bg-laranja text-white shadow-lg shadow-laranja/30 ${pulso ? 'motion-safe:animate-pulso' : ''}`
    : 'bg-transparent text-neve ring-2 ring-inset ring-neve/15'
  const circulo = cheio ? 'bg-white' : 'bg-agua'
  // Vazado: seta e texto no hover usam a cor do fundo do tema, então funcionam no claro e no escuro.
  const seta = cheio ? 'text-laranja' : 'text-noite'
  const textoHover = cheio ? 'group-hover:text-laranja-forte' : 'group-hover:text-noite'
  const medidas = compacto
    ? 'min-h-12 gap-2.5 py-1.5 pr-1.5 pl-5 text-base'
    : 'min-h-14 gap-3 py-2 pr-2 pl-6 text-base sm:text-lg'
  const bola = compacto ? 'size-9' : 'size-10 sm:size-11'

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={tabIndex}
      onClick={onClick}
      data-evento={evento}
      className={`group relative isolate inline-flex w-fit items-center self-start overflow-hidden sm:self-auto rounded-full font-semibold transition-transform duration-150 active:scale-[.97] ${casca} ${medidas} ${className}`}
    >
      {cheio && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/4 bg-gradient-to-r from-transparent via-white/45 to-transparent motion-safe:animate-brilho"
        />
      )}

      {/* Círculo que cresce e preenche o botão no hover */}
      <span
        aria-hidden="true"
        className={`absolute top-1/2 -z-10 -translate-y-1/2 rounded-full transition-transform duration-500 ease-[cubic-bezier(.7,0,.2,1)] group-hover:scale-[16] ${circulo} ${bola} ${compacto ? 'right-1.5' : 'right-2'}`}
      />

      <span className={`inline-flex items-center gap-2 transition-colors duration-300 ${textoHover}`}>
        {children}
      </span>

      <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full ${bola} ${seta}`}>
        <svg
          viewBox="0 0 24 24"
          className="size-5 fill-none stroke-current stroke-[2.5] motion-safe:animate-seta group-hover:[animation-play-state:paused]"
        >
          <path d="M5 12h14m-6-6 6 6-6 6" />
        </svg>
      </span>
    </a>
  )
}
