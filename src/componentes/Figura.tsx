import { useState } from 'react'

interface Props {
  src: string
  alt: string
  className?: string
  /** Altura mínima enquanto não há imagem, para o layout não pular. */
  vazio?: string
}

/**
 * Imagem que simplesmente desaparece se o arquivo não existir.
 * As fotos do cliente chegam depois; até lá a página não mostra ícone quebrado.
 */
export function Figura({ src, alt, className = '', vazio = '' }: Props) {
  const [falhou, setFalhou] = useState(false)
  if (falhou) return vazio ? <div className={vazio} aria-hidden="true" /> : null

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => setFalhou(true)}
    />
  )
}
