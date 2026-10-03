/**
 * Conversa com a API do Mercado Pago. O token (MP_ACCESS_TOKEN) fica só nas variáveis do Vercel.
 * Token começando com TEST- = modo de teste (cartões fictícios, nenhum dinheiro de verdade).
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

// MP_API_URL só existe para os testes locais apontarem para um Mercado Pago simulado.
const API = process.env.MP_API_URL || 'https://api.mercadopago.com'

export const tokenMP = () => process.env.MP_ACCESS_TOKEN ?? ''
export const modoTeste = () => tokenMP().startsWith('TEST-')

export async function chamarMP<T>(caminho: string, init: RequestInit & { idempotencia?: string } = {}): Promise<T> {
  const { idempotencia, ...resto } = init
  const r = await fetch(API + caminho, {
    ...resto,
    headers: {
      Authorization: `Bearer ${tokenMP()}`,
      'Content-Type': 'application/json',
      ...(idempotencia ? { 'X-Idempotency-Key': idempotencia } : {}),
      ...(resto.headers ?? {}),
    },
  })
  const corpo = await r.text()
  if (!r.ok) throw new Error(`Mercado Pago ${r.status}: ${corpo.slice(0, 300)}`)
  return JSON.parse(corpo) as T
}

/**
 * Confere a assinatura do aviso (webhook) do Mercado Pago, se MP_WEBHOOK_SECRET estiver definido
 * (a "assinatura secreta" do painel de Webhooks). Sem o segredo, não confere — mas o pagamento
 * é sempre consultado direto na API, então um aviso falso não consegue marcar nada como pago.
 */
export function assinaturaValida(req: Request, dataId: string): boolean {
  const segredo = process.env.MP_WEBHOOK_SECRET
  if (!segredo) return true
  const cabecalho = req.headers.get('x-signature') ?? ''
  const idPedido = req.headers.get('x-request-id') ?? ''
  const partes = Object.fromEntries(
    cabecalho.split(',').map((p) => p.split('=').map((s) => s.trim()) as [string, string]),
  )
  if (!partes.ts || !partes.v1) return false
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId
  const manifesto = `id:${id};request-id:${idPedido};ts:${partes.ts};`
  const esperado = createHmac('sha256', segredo).update(manifesto).digest('hex')
  const a = Buffer.from(esperado)
  const b = Buffer.from(String(partes.v1))
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Status do pagamento no Mercado Pago → status da reserva. */
export function statusReserva(mp: string): string {
  switch (mp) {
    case 'approved':
      return 'pago'
    case 'in_process':
    case 'authorized':
      return 'em_analise'
    case 'rejected':
      return 'recusado'
    case 'cancelled':
      return 'cancelado'
    case 'refunded':
    case 'charged_back':
      return 'estornado'
    default:
      return 'pendente' // pending: Pix gerado e ainda não pago, etc.
  }
}
