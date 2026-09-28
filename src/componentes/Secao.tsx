interface Props {
  id?: string
  rotulo?: string
  titulo?: string
  intro?: string
  children: React.ReactNode
  /** "vidro": seção escura com a foto do topo desfocada e brilhos de cor, para cards de vidro fosco. */
  fundo?: 'noite' | 'mata' | 'escuro' | 'vidro'
}

export function Secao({ id, rotulo, titulo, intro, children, fundo = 'noite' }: Props) {
  return (
    <section
      id={id}
      className={{
        noite: 'bg-noite',
        mata: 'bg-mata',
        escuro: 'tema-escuro bg-noite',
        vidro: 'tema-escuro relative isolate overflow-hidden bg-noite',
      }[fundo]}
    >
      {fundo === 'vidro' && (
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <img src="/imagens/topo.jpg" alt="" className="size-full scale-110 object-cover opacity-60 blur-2xl" />
          <div className="absolute -top-24 -left-24 size-80 rounded-full bg-agua/40 blur-3xl" />
          <div className="absolute -right-20 -bottom-24 size-96 rounded-full bg-laranja/35 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,33,24,.75),rgba(15,33,24,.55)_50%,rgba(15,33,24,.85))]" />
        </div>
      )}
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
