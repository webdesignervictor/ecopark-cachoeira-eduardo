import { useRef } from 'react'

interface Props {
  children: React.ReactNode
  /**
   * Número de colunas a partir de telas grandes. Sem valor, fica carrossel em qualquer tela.
   * No celular é sempre carrossel, para os vídeos verticais não ficarem minúsculos.
   */
  colunas?: 3 | 4
  className?: string
}

const GRADE = {
  3: 'lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0',
  4: 'lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0',
} as const

/** Galeria horizontal com encaixe, no estilo Reels. Cada filho vira um card. */
export function Trilho({ children, colunas, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const rolar = (sentido: 1 | -1) =>
    ref.current?.scrollBy({ left: sentido * ref.current.clientWidth * 0.8, behavior: 'smooth' })

  return (
    <div className={`relative ${className}`}>
      <div
        ref={ref}
        className={`sem-barra -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-2 sm:-mx-8 sm:gap-4 sm:scroll-px-8 sm:px-8 [&>*]:w-[68vw] [&>*]:max-w-[280px] [&>*]:shrink-0 [&>*]:snap-start ${
          colunas ? `${GRADE[colunas]} lg:[&>*]:w-auto lg:[&>*]:max-w-none` : ''
        }`}
      >
        {children}
      </div>

      <div className={`mt-5 hidden justify-end gap-2 sm:flex ${colunas ? 'lg:hidden' : ''}`}>
        {([-1, 1] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => rolar(s)}
            aria-label={s < 0 ? 'Vídeos anteriores' : 'Próximos vídeos'}
            className="grid size-11 place-items-center rounded-full border border-linha text-neve transition-colors hover:border-laranja hover:text-laranja"
          >
            <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2" aria-hidden="true">
              <path d={s < 0 ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}
