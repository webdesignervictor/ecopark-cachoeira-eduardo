interface Props {
  id?: string
  rotulo?: string
  titulo?: string
  intro?: string
  children: React.ReactNode
  fundo?: 'noite' | 'mata' | 'escuro'
}

export function Secao({ id, rotulo, titulo, intro, children, fundo = 'noite' }: Props) {
  return (
    <section id={id} className={{ noite: 'bg-noite', mata: 'bg-mata', escuro: 'tema-escuro bg-noite' }[fundo]}>
      <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-24">
        {rotulo && (
          <p className="font-rotulo text-[11px] uppercase tracking-[.22em] text-agua">{rotulo}</p>
        )}
        {titulo && (
          <h2 className="mt-3 max-w-3xl text-3xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-4xl">
            {titulo}
          </h2>
        )}
        {intro && <p className="mt-4 max-w-2xl text-base leading-relaxed text-bruma sm:text-lg">{intro}</p>}
        {children}
      </div>
    </section>
  )
}
