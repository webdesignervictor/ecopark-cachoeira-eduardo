import { useState } from 'react'
import { AVISO_COOKIES } from '../dados/evento'
import { darConsentimento, temConsentimento } from '../dados/consentimento'
import { rastrear } from '../dados/medicao'

/**
 * Aviso de cookies com um único botão (informativo: a medição não espera por ele). Fica preso na base da tela (acima da barra de reserva
 * no celular) até a pessoa aceitar; depois some e não volta.
 */
export function AvisoCookies() {
  const [visivel, setVisivel] = useState(() => !temConsentimento())
  if (!visivel) return null

  const aceitar = () => {
    darConsentimento()
    rastrear('cookies_aceitos')
    setVisivel(false)
  }

  return (
    <div
      data-local="aviso_cookies"
      role="region"
      aria-label="Aviso de cookies"
      className="tema-escuro fixed inset-x-3 bottom-3 z-[65] mb-[env(safe-area-inset-bottom)] flex items-center gap-3 rounded-2xl bg-noite/95 py-3 pr-3 pl-4 shadow-2xl ring-1 ring-white/15 backdrop-blur-xl sm:inset-x-auto sm:left-6 sm:bottom-6 sm:max-w-md sm:py-3.5 sm:pl-5"
    >
      <p className="text-[12px] leading-snug text-bruma sm:text-[13px]">{AVISO_COOKIES.texto}</p>
      {/* Branco, para não disputar com o laranja dos botões de reserva */}
      <button
        type="button"
        onClick={aceitar}
        className="shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0f2118] transition-colors hover:bg-white/85"
      >
        {AVISO_COOKIES.chamada}
      </button>
    </div>
  )
}
