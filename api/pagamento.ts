/**
 * Cria a reserva e o link de pagamento do Mercado Pago (Checkout Pro).
 *
 * Recebe da página só as ESCOLHAS (itens, pessoas, turno, nome, WhatsApp, e-mail) e recalcula o preço
 * aqui, com a mesma regra da página (src/dados/pack.ts). Nunca usa um valor vindo do navegador.
 *
 * Variáveis no Vercel: MP_ACCESS_TOKEN, DATABASE_URL_RESERVAS (usuário reservas_site), VITE_SITE_URL.
 * Responde: { url } para redirecionar, ou { erro: 'esgotado' | 'dados' | 'indisponivel' }.
 */
import { EVENTO, PAGAMENTO } from '../src/dados/evento'
import { ITENS_PACK, calcularPack, rotuloUnidades } from '../src/dados/pack'
import { banco } from './_lib/db'
import { chamarMP, modoTeste, tokenMP } from './_lib/mercadopago'
import { UUID, dentroDoLimite, json, lerJson, origemValida, sem, txt } from './_lib/protecao'

const IDS_VALIDOS = new Set(ITENS_PACK.map((i) => i.id))
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

interface Preferencia {
  id: string
  init_point: string
  sandbox_init_point: string
}

export async function POST(req: Request): Promise<Response> {
  const sql = banco('DATABASE_URL_RESERVAS')
  if (!tokenMP() || !sql) return json({ erro: 'indisponivel' }, 503)
  if (!origemValida(req)) return sem(403)
  if (!dentroDoLimite(req, 10, 'pagamento:')) return json({ erro: 'indisponivel' }, 429)

  const corpo = await lerJson(req, 5_000)
  if (!corpo) return json({ erro: 'dados' }, 400)

  // Validação de tudo que veio da página
  const ids = (Array.isArray(corpo.itens) ? corpo.itens : []).filter(
    (i): i is string => typeof i === 'string' && IDS_VALIDOS.has(i),
  )
  const turno = txt(corpo.turno, 40)
  const nome = txt(corpo.nome, 120)
  const telefone = String(corpo.telefone ?? '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
  const email = txt(corpo.email, 160)
  const pessoas = Number(corpo.pessoas)
  if (
    !turno || !(EVENTO.turnos as readonly string[]).includes(turno) ||
    !nome || nome.length < 2 ||
    !/^\d{10,11}$/.test(telefone) ||
    (email && !EMAIL.test(email)) ||
    !Number.isFinite(pessoas)
  ) {
    return json({ erro: 'dados' }, 400)
  }

  const pack = calcularPack(ids, pessoas)
  const valor = PAGAMENTO.modo === 'sinal' ? Math.ceil((pack.total * PAGAMENTO.sinalPercentual) / 100) : pack.total
  if (valor <= 0) return json({ erro: 'dados' }, 400)
  const temRopeJump = pack.linhas.some((l) => l.id === 'rope-jump')
  const origem = (corpo.origem ?? {}) as Record<string, unknown>
  const visitante = txt(corpo.visitante, 36)
  const expiraEm = new Date(Date.now() + PAGAMENTO.expiraMinutos * 60_000)

  // Lotação do dia + criação da reserva numa transação, com trava (dois pedidos ao mesmo tempo
  // não conseguem pegar as últimas vagas juntos).
  let reservaId: string
  try {
    const criada = await sql.begin(async (tx) => {
      if (PAGAMENTO.vagasPorDia !== null) {
        await tx`select pg_advisory_xact_lock(hashtext('reservas:dia'))`
        const [o] = await tx`select coalesce(sum(pessoas), 0)::int as ocupadas from reservas.ocupacao`
        if (o.ocupadas + pack.pessoas > PAGAMENTO.vagasPorDia) return null
      }
      const [r] = await tx`
        insert into reservas.reservas ${tx({
          nome,
          telefone,
          email,
          turno,
          pessoas: pack.pessoas,
          itens: tx.json(pack.linhas.map(({ id, nome: n, n: unid, subtotal }) => ({ id, nome: n, unidades: unid, subtotal }))),
          total: pack.total,
          valor_cobrado: valor,
          modo: PAGAMENTO.modo,
          tem_rope_jump: temRopeJump,
          origem: txt(origem.fonte, 120),
          campanha: txt(origem.campanha, 120),
          visitante: visitante && UUID.test(visitante) ? visitante : null,
          expira_em: expiraEm,
        })}
        returning id
      `
      return r.id as string
    })
    if (!criada) return json({ erro: 'esgotado' }, 409)
    reservaId = criada
  } catch (erro) {
    console.error('pagamento: falha ao criar reserva', erro instanceof Error ? erro.message : erro)
    return json({ erro: 'indisponivel' }, 500)
  }

  // Link de pagamento
  const site = (process.env.VITE_SITE_URL || req.headers.get('origin') || '').replace(/\/+$/, '')
  const itensMP =
    PAGAMENTO.modo === 'sinal'
      ? [{ id: 'sinal', title: `Sinal ${PAGAMENTO.sinalPercentual}% · Pack ${EVENTO.dataCurta} · ${turno}`, quantity: 1, unit_price: valor, currency_id: 'BRL' }]
      : pack.linhas.map((l) => ({
          id: l.id,
          title: `${l.nome} · ${rotuloUnidades(l.cobranca, l.n)} · ${EVENTO.dataCurta}`,
          quantity: 1,
          unit_price: l.subtotal,
          currency_id: 'BRL',
        }))

  try {
    const pref = await chamarMP<Preferencia>('/checkout/preferences', {
      method: 'POST',
      idempotencia: reservaId,
      body: JSON.stringify({
        items: itensMP,
        payer: {
          name: nome,
          ...(email ? { email } : {}),
          phone: { area_code: telefone.slice(0, 2), number: telefone.slice(2) },
        },
        external_reference: reservaId,
        metadata: { reserva_id: reservaId, turno, pessoas: pack.pessoas },
        // O Mercado Pago só aceita aviso em https (no teste local fica sem; o status vem pela volta).
        ...(site.startsWith('https://') ? { notification_url: `${site}/api/mercadopago` } : {}),
        back_urls: {
          success: `${site}/?pagamento=sucesso&reserva=${reservaId}`,
          pending: `${site}/?pagamento=pendente&reserva=${reservaId}`,
          failure: `${site}/?pagamento=falha&reserva=${reservaId}`,
        },
        auto_return: 'approved',
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: expiraEm.toISOString(),
        date_of_expiration: expiraEm.toISOString(),
        statement_descriptor: PAGAMENTO.descricaoFatura.slice(0, 22),
        payment_methods: {
          installments: PAGAMENTO.parcelasMax,
          // Boleto leva dias para compensar — não serve para um evento de data marcada.
          excluded_payment_types: [{ id: 'ticket' }],
        },
      }),
    })
    await sql`update reservas.reservas set mp_preferencia = ${pref.id}, atualizada = now() where id = ${reservaId}`
    return json({ url: modoTeste() ? pref.sandbox_init_point : pref.init_point, reserva: reservaId })
  } catch (erro) {
    console.error('pagamento: falha no Mercado Pago', erro instanceof Error ? erro.message : erro)
    await sql`update reservas.reservas set status = 'cancelado', atualizada = now() where id = ${reservaId}`.catch(() => {})
    return json({ erro: 'indisponivel' }, 502)
  }
}
