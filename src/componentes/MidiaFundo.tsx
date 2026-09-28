import { useEffect, useRef, useState } from 'react'

interface Props {
  /** Vídeo horizontal. Se o arquivo não existir, cai para a foto. */
  video?: string
  /** Foto horizontal. Também vira o pôster do vídeo enquanto ele carrega. */
  foto?: string
  className?: string
}

/**
 * Fundo da hero: vídeo em loop sem som, ou foto, ou nada (o fundo do pai aparece).
 * Com "reduzir movimento" ligado no aparelho, mostra só a foto.
 */
export function MidiaFundo({ video, foto, className = '' }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  const [semVideo, setSemVideo] = useState(
    () => !video || window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [semFoto, setSemFoto] = useState(!foto)
  // O vídeo só começa a baixar depois que a página terminou de carregar; até lá, a foto (pôster) segura a hero.
  const [liberado, setLiberado] = useState(() => document.readyState === 'complete')

  useEffect(() => {
    if (liberado) return
    const liberar = () => setLiberado(true)
    window.addEventListener('load', liberar, { once: true })
    return () => window.removeEventListener('load', liberar)
  }, [liberado])

  useEffect(() => {
    const v = ref.current
    if (!v || !liberado) return
    // O Safari do iPhone só toca sozinho se o "mudo" estiver na propriedade, não só no atributo.
    v.muted = true
    v.play().catch(() => {})
  }, [liberado])

  if (!semVideo) {
    return (
      <video
        ref={ref}
        src={liberado ? video : undefined}
        poster={semFoto ? undefined : foto}
        muted
        loop
        autoPlay
        playsInline
        preload={liberado ? 'auto' : 'none'}
        aria-hidden="true"
        onError={() => setSemVideo(true)}
        className={className}
      />
    )
  }

  if (!semFoto) {
    return <img src={foto} alt="" decoding="async" onError={() => setSemFoto(true)} className={className} />
  }

  return null
}
