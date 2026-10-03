// Teste de ponta a ponta do backend (medição + pagamento + aviso), contra Postgres local e Mercado Pago simulado.
import { createServer } from 'node:http'
import { createHmac } from 'node:crypto'
import postgres from 'postgres'

const SITE = 'https://evento.exemplo.com.br'
const preferencias: any[] = []
const pagamentos = new Map<string, any>()
createServer((req, res) => {
  let corpo = ''
  req.on('data', (c) => (corpo += c))
  req.on('end', () => {
    res.setHeader('Content-Type', 'application/json')
    if (req.method === 'POST' && req.url === '/checkout/preferences') {
      preferencias.push(JSON.parse(corpo))
      return res.end(JSON.stringify({ id: `pref_${preferencias.length}`, init_point: 'https://mp/real', sandbox_init_point: 'https://mp/sandbox' }))
    }
    const m = req.url?.match(/^\/v1\/payments\/(\d+)$/)
    if (m && pagamentos.has(m[1])) return res.end(JSON.stringify(pagamentos.get(m[1])))
    res.statusCode = 404; res.end('{}')
  })
}).listen(55999)

const { POST: eventos } = await import(process.env.PROJETO + '/api/eventos.ts')
const { POST: pagamento } = await import(process.env.PROJETO + '/api/pagamento.ts')
const { POST: webhook } = await import(process.env.PROJETO + '/api/mercadopago.ts')
const dono = postgres('postgres://teste@localhost:55432/lp')
let ip = 0
const pedido = (caminho: string, corpo: unknown, cab: Record<string, string> = {}) =>
  new Request(SITE + caminho, { method: 'POST', body: JSON.stringify(corpo), headers: { origin: SITE, 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${++ip}`, ...cab } })
const ok = (cond: boolean, msg: string) => console.log(cond ? '  ✅' : '  ❌', msg)

console.log('\n1. Medição')
const sessao = crypto.randomUUID(), visitante = crypto.randomUUID()
const lote = { sessao, visitante, origem: { fonte: 'instagram' }, dispositivo: { tipo: 'celular', modelo: 'SM-S918B' }, contexto: {},
  eventos: [{ nome: 'secao_vista', dados: { secao: 'topo' }, quando: new Date().toISOString() },
            { nome: 'DROP TABLE;', dados: {}, quando: new Date().toISOString() },
            { nome: 'tempo_secao', dados: { secao: 'topo', segundos: 12, lixo: { a: 1 } }, quando: '1999-01-01' }] }
ok((await eventos(pedido('/api/eventos', lote))).status === 204, 'lote válido aceito (204)')
ok((await eventos(pedido('/api/eventos', lote, { origin: 'https://site-estranho.com' }))).status === 403, 'outra origem recusada (403)')
const semOrigem = new Request(SITE + '/api/eventos', { method: 'POST', body: JSON.stringify(lote) })
ok((await eventos(semOrigem)).status === 403, 'sem origem recusado (403)')
const ev = await dono`select nome, dados, quando from medicao.eventos where sessao = ${sessao} order by id`
ok(ev.length === 2, `nome inválido descartado (gravou ${ev.length} de 3)`)
ok(!('lixo' in ev[1].dados) && new Date(ev[1].quando).getFullYear() > 2000, 'dado aninhado descartado e data forjada corrigida')
try { await postgres(process.env.DATABASE_URL!)`select count(*) from medicao.eventos`; ok(false, 'medicao_site conseguiu LER (não devia)') }
catch (e: any) { ok(/permission denied/.test(e.message), 'medicao_site não consegue ler a tabela') }

console.log('\n2. Pagamento: cria reserva e link')
const base = { pessoas: 2, turno: '9h às 11h45', nome: 'Maria Teste', telefone: '(16) 99999-1234', email: 'maria@exemplo.com' }
let r = await pagamento(pedido('/api/pagamento', { ...base, itens: ['rope-jump', 'hospedagem:Chalé casal', 'inventado'], total: 1 }))
let j: any = await r.json()
ok(r.status === 200 && j.url === 'https://mp/sandbox', `link gerado em modo teste (${j.url})`)
const [res1] = await dono`select * from reservas.reservas where id = ${j.reserva}`
ok(res1.status === 'pendente' && Number(res1.total) === 750, `reserva pendente com total recalculado no servidor: R$ ${res1.total} (ignorou "total: 1" e o item inventado)`)
const pref = preferencias.at(-1)
ok(pref.items.reduce((s: number, i: any) => s + i.unit_price, 0) === 750 && pref.external_reference === j.reserva, 'itens do Mercado Pago somam R$ 750 e levam o código da reserva')
ok(pref.notification_url === SITE + '/api/mercadopago' && pref.payment_methods.excluded_payment_types[0].id === 'ticket', 'aviso apontando para o site e boleto excluído')
ok(res1.telefone === '16999991234', 'telefone normalizado')
r = await pagamento(pedido('/api/pagamento', { ...base, telefone: '123', itens: ['rope-jump'] }))
ok(r.status === 400, 'telefone inválido recusado (400)')
r = await pagamento(pedido('/api/pagamento', { ...base, turno: 'meia-noite', itens: ['rope-jump'] }))
ok(r.status === 400, 'turno inexistente recusado (400)')

console.log('\n3. Aviso do Mercado Pago')
pagamentos.set('111', { id: 111, status: 'approved', status_detail: 'accredited', external_reference: res1.id, transaction_amount: 750, date_approved: new Date().toISOString() })
r = await webhook(pedido('/api/mercadopago?type=payment&data.id=111', { type: 'payment', data: { id: '111' } }))
let [d] = await dono`select status, mp_pagamento from reservas.reservas where id = ${res1.id}`
ok(r.status === 200 && d.status === 'pago' && d.mp_pagamento === '111', 'pagamento aprovado → reserva PAGA')
pagamentos.set('111', { ...pagamentos.get('111'), status: 'pending' })
await webhook(pedido('/api/mercadopago?type=payment&data.id=111', {}))
;[d] = await dono`select status from reservas.reservas where id = ${res1.id}`
ok(d.status === 'pago', 'aviso atrasado "pendente" não desfaz o pago')
j = await (await pagamento(pedido('/api/pagamento', { ...base, itens: ['rope-jump'] }))).json()
pagamentos.set('222', { id: 222, status: 'approved', status_detail: 'accredited', external_reference: j.reserva, transaction_amount: 1, date_approved: null })
await webhook(pedido('/api/mercadopago?type=payment&data.id=222', {}))
;[d] = await dono`select status from reservas.reservas where id = ${j.reserva}`
ok(d.status === 'em_analise', 'valor pago diferente do cobrado → EM ANÁLISE (não confirma sozinho)')
process.env.MP_WEBHOOK_SECRET = 'segredo-teste'
r = await webhook(pedido('/api/mercadopago?type=payment&data.id=111', {}, { 'x-signature': 'ts=1,v1=falsa', 'x-request-id': 'abc' }))
ok(r.status === 401, 'assinatura falsa recusada (401)')
const ts = String(Date.now()), v1 = createHmac('sha256', 'segredo-teste').update(`id:111;request-id:abc;ts:${ts};`).digest('hex')
r = await webhook(pedido('/api/mercadopago?type=payment&data.id=111', {}, { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': 'abc' }))
ok(r.status === 200, 'assinatura verdadeira aceita (200)')
delete process.env.MP_WEBHOOK_SECRET

console.log('\n4. Lotação: 70 pessoas por dia')
let [o] = await dono`select coalesce(sum(pessoas),0)::int as n from reservas.ocupacao`
console.log(`  ocupadas agora: ${o.n}`)
const grupo = (n: number) => pagamento(pedido('/api/pagamento', { ...base, pessoas: n, itens: ['rope-jump'] }))
const simult = await Promise.all([grupo(30), grupo(30), grupo(30)])
const aceitos = simult.filter((x) => x.status === 200).length
;[o] = await dono`select coalesce(sum(pessoas),0)::int as n from reservas.ocupacao`
ok(aceitos === 2 && o.n <= 70, `3 pedidos de 30 ao mesmo tempo → ${aceitos} aceitos, ocupação ${o.n}/70 (trava funcionou)`)
const resta = 70 - o.n
ok((await grupo(resta + 1)).status === 409, `pedido de ${resta + 1} (passaria de 70) → esgotado (409)`)
ok((await grupo(resta)).status === 200, `pedido de ${resta} (fecha exatamente 70) → aceito`)
;[o] = await dono`select coalesce(sum(pessoas),0)::int as n from reservas.ocupacao`
ok(o.n === 70, `ocupação final ${o.n}/70`)
try { await postgres(process.env.DATABASE_URL_RESERVAS!)`delete from reservas.reservas`; ok(false, 'reservas_site conseguiu APAGAR') }
catch (e: any) { ok(/permission denied/.test(e.message), 'reservas_site não consegue apagar reservas') }
process.exit(0)
