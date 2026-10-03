import { useEffect, useRef, useState } from 'react'
import { PAGAMENTO, WHATSAPP } from '../dados/evento'
import { rastrear } from '../dados/medicao'
import { linkWhatsAppTexto, type Origem } from '../dados/rastreio'

type Resultado = 'sucesso' | 'pendente' | 'falha'

/** Uma vez por carregamento: uma compra registrada duas vezes dobraria o faturamento no Meta. */
let registrado = false

function lerResultado(): { resultado: Resultado; reserva: string } | null {
  const p = new URLSearchParams(window.location.search)
  const r = p.get('pagamento')
  if (r !== 'sucesso' && r !== 'pendente' && r !== 'falha') return null
  return { resultado: r, reserva: (p.get('reserva') ?? '').slice(0, 36) }
}

/**
 * Aviso na volta do Mercado Pago (?pagamento=sucesso|pendente|falha&reserva=…).
 * Registra a compra (Purchase no Meta, com o valor guardado antes de sair) e limpa a URL.
 * A confirmação que vale é a do aviso do Mercado Pago ao servidor; isto aqui é só para a pessoa.
 */
export function RetornoPagamento({ origem }: { origem: Origem }) {
  const [estado, setEstado] = useState(lerResultado)
  const botao = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!estado) return
    botao.current?.focus()
    if (registrado) return
    registrado = true
    let valor = 0
    try {
      valor = Number(sessionStorage.getItem('ecopark_pagamento_valor')) || 0
      if (estado.resultado === 'sucesso') sessionStorage.removeItem('ecopark_pagamento_valor')
    } catch {
      /* sem armazenamento */
    }
    if (estado.resultado === 'sucesso') rastrear('compra', { valor, reserva: estado.reserva })
    else rastrear(`pagamento_${estado.resultado}`, { reserva: estado.reserva })
    // Tira os parâmetros da URL: recarregar ou compartilhar o link não repete o aviso nem a compra.
    const url = new URL(window.location.href)
    ;['pagamento', 'reserva', 'collection_id', 'collection_status', 'payment_id', 'status', 'external_reference',
      'payment_type', 'merchant_order_id', 'preference_id', 'site_id', 'processing_mode', 'merchant_account_id'].forEach((k) =>
      url.searchParams.delete(k),
    )
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  }, [estado])

  if (!estado) return null
  const t = PAGAMENTO.retorno[estado.resultado]
  const ok = estado.resultado === 'sucesso'

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="retorno-titulo"
        className="w-full max-w-md rounded-t-3xl bg-noite p-6 pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))] text-neve shadow-2xl sm:rounded-3xl"
      >
        <span
          aria-hidden="true"
          className={`grid size-12 place-items-center rounded-full ${ok ? 'bg-agua text-white' : estado.resultado === 'pendente' ? 'bg-ambar text-[#13281c]' : 'bg-laranja/15 text-laranja'}`}
        >
          <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-current stroke-[2.5]">
            <path d={ok ? 'm5 12 5 5L20 7' : estado.resultado === 'pendente' ? 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' : 'M6 6l12 12M18 6 6 18'} />
          </svg>
        </span>
        <h2 id="retorno-titulo" className="mt-4 font-titulo text-3xl leading-tight">{t.titulo}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-bruma">{t.texto}</p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            ref={botao}
            type="button"
            onClick={() => setEstado(null)}
            className="min-h-12 rounded-full bg-laranja font-semibold text-white"
          >
            {PAGAMENTO.retorno.fechar}
          </button>
          {!ok && (
            <a
              href={linkWhatsAppTexto(WHATSAPP, origem, `Tive um problema no pagamento da minha reserva (${estado.reserva.slice(0, 8)}).`)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-[13px] font-semibold text-agua underline decoration-agua/30 underline-offset-4"
            >
              Falar no WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
