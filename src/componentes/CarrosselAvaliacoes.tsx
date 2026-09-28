import type { Avaliacao } from '../dados/evento'
import { Estrelas } from './Estrelas'

interface Props {
  avaliacoes: Avaliacao[]
  className?: string
}

/** Segundos que cada card leva para atravessar. Mais alto = mais devagar. */
const SEGUNDOS_POR_CARD = 7

/**
 * Faixa horizontal em loop infinito, de ponta a ponta da tela.
 * A lista é renderizada duas vezes e a animação anda exatamente metade — o fim encaixa no começo.
 * Com muitas avaliações vira duas faixas em sentidos opostos.
 * Pausa no toque/hover; com "reduzir movimento" vira rolagem manual.
 */
export function CarrosselAvaliacoes({ avaliacoes, className = '' }: Props) {
  const faixas =
    avaliacoes.length > 10
      ? [avaliacoes.filter((_, i) => i % 2 === 0), avaliacoes.filter((_, i) => i % 2 === 1)]
      : [avaliacoes]

  return (
    <div className={`-mx-5 space-y-3 sm:-mx-8 sm:space-y-4 ${className}`}>
      {faixas.map((faixa, f) => (
        <div
          key={f}
          className="group overflow-hidden motion-reduce:overflow-x-auto [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)]"
        >
          <ul
            className="flex w-max motion-safe:animate-rolar group-hover:[animation-play-state:paused] group-active:[animation-play-state:paused]"
            style={{
              animationDuration: `${faixa.length * SEGUNDOS_POR_CARD}s`,
              // A primeira faixa anda da esquerda para a direita; a segunda, no sentido oposto.
              animationDirection: f % 2 ? 'normal' : 'reverse',
            }}
          >
            {[0, 1].map((copia) =>
              faixa.map((a) => (
                <li
                  key={`${copia}-${a.autor}-${a.texto.slice(0, 20)}`}
                  aria-hidden={copia === 1 || undefined}
                  className="w-[80vw] max-w-[320px] shrink-0 pr-3 sm:pr-4"
                >
                  <figure className="flex h-full flex-col rounded-2xl bg-white/10 p-5 shadow-lg shadow-black/20 ring-1 ring-white/20 ring-inset backdrop-blur-xl">

                    <Estrelas nota={a.nota} />
                    <blockquote className="mt-3 line-clamp-6 flex-1 text-[15px] leading-snug">
                      “{a.texto}”
                    </blockquote>
                    <figcaption className="mt-4 flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="grid size-8 shrink-0 place-items-center rounded-full bg-agua text-sm font-semibold text-noite"
                      >
                        {(a.autor || 'G').charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {a.autor || 'Avaliação no Google'}
                        </span>
                        <span className="block font-rotulo text-[9px] uppercase tracking-[.16em] text-bruma">
                          Avaliação no Google
                        </span>
                      </span>
                    </figcaption>
                  </figure>
                </li>
              )),
            )}
          </ul>
        </div>
      ))}
    </div>
  )
}
