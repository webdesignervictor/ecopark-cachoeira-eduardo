import { useEffect, useState } from 'react'

interface Props {
  /** Data e hora do início, com fuso (ex.: 2026-10-10T09:00:00-03:00). */
  alvo: string
  rotulo: string
  /** Texto que substitui o contador quando a hora chega. */
  chegou: string
}

/** Nome, duração em ms e quantas cabem na unidade de cima (dias não têm teto). */
const UNIDADES = [
  ['d', 86_400_000, Infinity],
  ['h', 3_600_000, 24],
  ['m', 60_000, 60],
  ['s', 1_000, 60],
] as const

const EXTENSO = { d: 'dias', h: 'horas', m: 'minutos', s: 'segundos' } as const

/**
 * Faixa de vidro presa no topo da tela com a contagem regressiva real até o evento.
 * Flutua sobre a página: na hero o vídeo aparece desfocado por trás.
 * A hero tem folga no topo (pt-28) para o título não ficar embaixo dela.
 */
export function Contador({ alvo, rotulo, chegou }: Props) {
  const fim = new Date(alvo).getTime()
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const resto = Math.max(0, fim - agora)
  const partes = UNIDADES.map(([nome, ms, teto]) => [nome, Math.floor(resto / ms) % teto] as const)

  return (
    <div className="fixed inset-x-0 top-0 z-50 border-b border-white/15 bg-[rgba(15,33,24,.45)] pt-[env(safe-area-inset-top)] text-white shadow-[0_8px_30px_rgba(0,0,0,.12)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex min-h-12 max-w-6xl items-center justify-center gap-2.5 px-3 py-1.5 sm:gap-4">
        {resto === 0 ? (
          <p className="text-sm font-semibold">{chegou}</p>
        ) : (
          <>
            <p className="inline-flex shrink-0 items-center gap-2 font-rotulo text-[10px] whitespace-nowrap uppercase tracking-[.1em] text-white/90 sm:text-[11px] sm:tracking-[.16em]">
              <span aria-hidden="true" className="relative flex size-2">
                <span className="absolute inset-0 rounded-full bg-laranja opacity-75 motion-safe:animate-ping" />
                <span className="relative size-2 rounded-full bg-laranja" />
              </span>
              {rotulo}
            </p>
            <div
              role="timer"
              aria-label={`${rotulo}: ${partes.map(([n, v]) => `${v} ${EXTENSO[n]}`).join(', ')}`}
              className="flex gap-1.5"
            >
              {partes.map(([nome, valor]) => (
                <span
                  key={nome}
                  aria-hidden="true"
                  className="inline-flex items-baseline rounded-lg bg-laranja/80 px-2 py-1 text-base leading-none font-semibold tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,.35),0_4px_12px_rgba(232,89,12,.35)] ring-1 ring-white/25 ring-inset backdrop-blur"
                >
                  {String(valor).padStart(2, '0')}
                  <span className="ml-0.5 font-rotulo text-[10px] font-normal text-white/80">{nome}</span>
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
