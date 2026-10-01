import { useEffect, useRef, useState } from 'react'

interface Props {
  src: string
  poster?: string
  className?: string
  /** Mostra o botão de som. Nos vídeos pequenos do topo fica desligado. */
  som?: boolean
  /** Conteúdo sobreposto na base do vídeo (legenda, preço, nome). */
  children?: React.ReactNode
}

/**
 * Vídeo 9:16 que toca mudo quando entra na tela e pausa quando sai.
 * Se o vídeo ainda não existe: mostra a imagem (poster), se houver; senão, um quadro com o nome
 * do arquivo esperado, para o cliente saber exatamente o que colocar em public/videos/.
 */
export function VideoVertical({ src, poster, className = '', som = true, children }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  const [falhou, setFalhou] = useState(false)
  const [mudo, setMudo] = useState(true)
  // O arquivo só é pedido quando o card chega perto da tela — 18 vídeos não baixam todos na abertura.
  const [perto, setPerto] = useState(false)

  useEffect(() => {
    const v = ref.current
    if (!v || perto) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setPerto(true)
      },
      { rootMargin: '400px' },
    )
    obs.observe(v)
    return () => obs.disconnect()
  }, [perto])

  useEffect(() => {
    const v = ref.current
    if (!v || falhou || !perto) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {})
        else v.pause()
      },
      { threshold: 0.4 },
    )
    obs.observe(v)
    return () => obs.disconnect()
  }, [falhou, perto])

  const alternarSom = () => {
    const v = ref.current
    if (!v) return
    v.muted = !v.muted
    setMudo(v.muted)
    if (!v.muted) v.play().catch(() => {})
  }

  return (
    <div
      className={`tema-escuro relative aspect-[9/16] overflow-hidden rounded-2xl bg-pedra shadow-lg shadow-black/15 ${className}`}
    >
      {falhou && poster ? (
        // Sem vídeo, mas com imagem: a imagem ocupa o card (vídeo entra sozinho quando o arquivo existir).
        <img src={poster} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      ) : falhou ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[linear-gradient(165deg,var(--color-pedra),var(--color-mata)_55%,var(--color-noite))] pb-20">
          <span className="grid size-11 place-items-center rounded-full border border-agua/40 text-agua">
            <svg viewBox="0 0 24 24" className="ml-0.5 size-4 fill-current" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className="px-3 text-center font-rotulo text-[9px] uppercase tracking-[.18em] break-all text-bruma/70">
            {src.split('/').pop()}
          </span>
        </div>
      ) : (
        <video
          ref={ref}
          src={perto ? src : undefined}
          poster={poster}
          muted
          loop
          playsInline
          preload={perto ? 'metadata' : 'none'}
          onError={() => setFalhou(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {children && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-noite via-noite/70 to-transparent p-4 pt-20 sm:p-5 sm:pt-24">
          {children}
        </div>
      )}

      {som && !falhou && (
        <button
          type="button"
          onClick={alternarSom}
          data-evento={mudo ? 'video_som_ligado' : 'video_som_desligado'}
          data-detalhe={src.split('/').pop()}
          aria-label={mudo ? 'Ativar som' : 'Desativar som'}
          className="absolute top-2 right-2 grid size-11 place-items-center rounded-full bg-noite/60 text-neve backdrop-blur transition-colors hover:bg-noite/85"
        >
          <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4z" />
            {mudo ? <path d="m16 9 5 6m0-6-5 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
          </svg>
        </button>
      )}
    </div>
  )
}
