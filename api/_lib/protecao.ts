/**
 * Proteções da porta de entrada do backend. Tudo que chega da página é tratado como não confiável.
 */

/** Só aceita pedidos feitos pela própria página (ou por domínios listados em ORIGENS_PERMITIDAS). */
export function origemValida(req: Request): boolean {
  const origem = req.headers.get('origin')
  if (!origem) return false
  let host: string
  try {
    host = new URL(origem).host
  } catch {
    return false
  }
  const proprio = req.headers.get('x-forwarded-host') ?? new URL(req.url).host
  const extras = (process.env.ORIGENS_PERMITIDAS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  return host === proprio || extras.includes(host)
}

/** IP só para o limite de pedidos, na memória. Nunca é gravado. */
function ipDe(req: Request): string {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'desconhecido'
}

const janelas = new Map<string, { inicio: number; n: number }>()

/**
 * Limite de pedidos por IP numa janela de 1 minuto. Vale por instância da função
 * (barreira de primeira linha; para ataques maiores, use o Firewall do Vercel).
 */
export function dentroDoLimite(req: Request, porMinuto: number, chave = ''): boolean {
  const agora = Date.now()
  const id = chave + ipDe(req)
  const j = janelas.get(id)
  if (!j || agora - j.inicio > 60_000) {
    janelas.set(id, { inicio: agora, n: 1 })
    if (janelas.size > 5000) janelas.clear() // não deixa a memória crescer sem fim
    return true
  }
  j.n++
  return j.n <= porMinuto
}

/** Lê o corpo como JSON com teto de tamanho. Devolve null se for grande demais ou inválido. */
export async function lerJson(req: Request, maxBytes: number): Promise<Record<string, unknown> | null> {
  try {
    const bruto = await req.text()
    if (bruto.length > maxBytes) return null
    const v = JSON.parse(bruto)
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null
  } catch {
    return null
  }
}

export const sem = (status: number) => new Response(null, { status })

export const json = (dados: unknown, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

/** Texto limpo e curto, ou null. */
export const txt = (v: unknown, max = 120): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null

export const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null)

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
