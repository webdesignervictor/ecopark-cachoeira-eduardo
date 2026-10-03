/**
 * Aviso (webhook) do Mercado Pago: chamado a cada mudança de um pagamento.
 *
 * Nunca confia no conteúdo do aviso: pega só o id do pagamento, consulta direto na API do Mercado Pago
 * e confere se o valor pago bate com o valor da reserva antes de marcar como paga.
 * Responde sempre 200 rápido (o Mercado Pago reenvia o aviso se receber erro).
 *
 * Variáveis no Vercel: MP_ACCESS_TOKEN, DATABASE_URL_RESERVAS, MP_WEBHOOK_SECRET (recomendado),
 * e opcionalmente RESEND_API_KEY + EMAIL_AVISO para mandar um e-mail ao Eduardo a cada reserva paga.
 * (O app do Mercado Pago já avisa o Eduardo de cada venda, com os itens e o valor.)
 */
import { banco } from './_lib/db'
import { assinaturaValida, chamarMP, statusReserva, tokenMP } from './_lib/mercadopago'
import { lerJson, sem } from './_lib/protecao'

interface PagamentoMP {
  id: number
  status: string
  status_detail: string
  external_reference: string | null
  transaction_amount: number
  date_approved: string | null
}

const real = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** E-mail ao Eduardo quando uma reserva é paga (opcional, via Resend). */
async function avisarEduardo(r: Record<string, unknown>) {
  const chave = process.env.RESEND_API_KEY
  const para = process.env.EMAIL_AVISO
  if (!chave || !para) return
  const itens = (r.itens as { nome: string; unidades: number; subtotal: number }[])
    .map((i) => `• ${i.nome} — ${i.unidades}x — ${real(i.subtotal)}`)
    .join('\n')
  const texto = [
    `Nova reserva paga — ${r.turno}`,
    '',
    `Nome: ${r.nome}`,
    `WhatsApp: https://wa.me/55${r.telefone}`,
    `Pessoas: ${r.pessoas}`,
    '',
    itens,
    '',
    `Pago: ${real(Number(r.valor_cobrado))}`,
  ].join('\n')
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_REMETENTE || 'Reservas <onboarding@resend.dev>',
      to: para.split(',').map((s) => s.trim()),
      subject: `Reserva paga · ${r.nome} · ${r.pessoas} pessoa(s) · ${r.turno}`,
      text: texto,
    }),
  }).catch((e) => console.error('aviso: falha no e-mail', e instanceof Error ? e.message : e))
}

export async function POST(req: Request): Promise<Response> {
  const sql = banco('DATABASE_URL_RESERVAS')
  if (!tokenMP() || !sql) return sem(200)

  // O id vem na URL (?data.id=… ou ?id=…) e/ou no corpo ({ type, data: { id } }).
  const url = new URL(req.url)
  const corpo = (await lerJson(req, 20_000)) ?? {}
  const tipo = url.searchParams.get('type') ?? url.searchParams.get('topic') ?? (corpo.type as string) ?? ''
  const dados = (corpo.data ?? {}) as Record<string, unknown>
  const dataId = String(url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? dados.id ?? '')

  if (tipo !== 'payment' || !/^\d{1,20}$/.test(dataId)) return sem(200)
  if (!assinaturaValida(req, dataId)) return sem(401)

  try {
    const pg = await chamarMP<PagamentoMP>(`/v1/payments/${dataId}`)
    const reservaId = pg.external_reference ?? ''
    if (!/^[0-9a-f-]{36}$/i.test(reservaId)) return sem(200)

    const [r] = await sql`select * from reservas.reservas where id = ${reservaId}`
    if (!r) return sem(200)

    let novo = statusReserva(pg.status)
    // Valor pago diferente do cobrado: não confirma sozinho, fica para conferência.
    if (novo === 'pago' && Math.abs(Number(pg.transaction_amount) - Number(r.valor_cobrado)) > 0.01) {
      console.error(`aviso: valor divergente na reserva ${reservaId}: pago ${pg.transaction_amount}, esperado ${r.valor_cobrado}`)
      novo = 'em_analise'
    }
    // Uma reserva já paga não "volta" para pendente por um aviso atrasado (só sai de pago se estornar).
    if (r.status === 'pago' && novo !== 'estornado') novo = 'pago'

    await sql`
      update reservas.reservas set
        status = ${novo},
        mp_pagamento = ${String(pg.id)},
        mp_status = ${`${pg.status}/${pg.status_detail}`.slice(0, 80)},
        pago_em = ${novo === 'pago' ? (pg.date_approved ? new Date(pg.date_approved) : new Date()) : null},
        atualizada = now()
      where id = ${reservaId}
    `
    if (novo === 'pago' && r.status !== 'pago') await avisarEduardo(r)
  } catch (erro) {
    console.error('aviso: falha ao processar', erro instanceof Error ? erro.message : erro)
    return sem(500) // deixa o Mercado Pago tentar de novo
  }
  return sem(200)
}
