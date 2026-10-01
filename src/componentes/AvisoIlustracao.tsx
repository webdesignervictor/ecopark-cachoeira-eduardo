import { AVISO_ILUSTRACAO } from '../dados/evento'

/**
 * Nota discreta sob as galerias que usam ilustração no lugar de foto/vídeo.
 * Usa os tokens do tema, então funciona nas seções claras e nas de vidro.
 * Quando o material real chegar, basta tirar o <AvisoIlustracao /> da seção.
 */
export function AvisoIlustracao() {
  return (
    <p className="mt-4 flex items-start gap-2 text-[13px] leading-snug text-bruma">
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="mt-px size-4 shrink-0 fill-none stroke-agua stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
      >
        <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.3l1.4-2h7.6l1.4 2h2.3A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
      {AVISO_ILUSTRACAO}
    </p>
  )
}
