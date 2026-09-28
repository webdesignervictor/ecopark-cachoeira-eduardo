/**
 * Recebe os lotes de ações da página (src/dados/banco.ts) e grava no Postgres.
 * Roda como função do Vercel. A conexão vem da variável de ambiente DATABASE_URL.
 *
 * Sem DATABASE_URL, responde 204 e descarta — a página nunca quebra por causa da medição.
 */
import postgres from 'postgres'

const url = process.env.DATABASE_URL
// prepare: false funciona com os "poolers" do Neon e do Supabase.
// SSL obrigatório nos provedores; desligado só para um banco local de teste.
const local = !!url && /@(localhost|127\.0\.0\.1)[:/]/.test(url)
const sql = url ? postgres(url, { ssl: local ? false : 'require', max: 1, prepare: false, idle_timeout: 20 }) : null

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Texto limpo e curto, ou null. Tudo que chega da página é tratado como não confiável. */
const txt = (v: unknown, max = 120): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null)

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {})

/** Cabeçalhos de localização que o Vercel preenche pelo IP (o IP não é guardado). */
const geo = (req: Request, nome: string) => {
  const v = req.headers.get(nome)
  return v ? decodeURIComponent(v).slice(0, 80) : null
}

export async function POST(req: Request): Promise<Response> {
  if (!sql) return new Response(null, { status: 204 })

  let corpo: Obj
  try {
    const bruto = await req.text()
    if (bruto.length > 100_000) return new Response(null, { status: 413 })
    corpo = obj(JSON.parse(bruto))
  } catch {
    return new Response(null, { status: 400 })
  }

  const sessao = txt(corpo.sessao, 36)
  const visitante = txt(corpo.visitante, 36)
  if (!sessao || !visitante || !UUID.test(sessao) || !UUID.test(visitante)) {
    return new Response(null, { status: 400 })
  }

  const origem = obj(corpo.origem)
  const d = obj(corpo.dispositivo)
  const c = obj(corpo.contexto)
  const bool = (v: unknown) => (typeof v === 'boolean' ? v : null)
  const real = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  const eventos = (Array.isArray(corpo.eventos) ? corpo.eventos : []).slice(0, 50).map(obj)

  try {
    // A sessão entra no primeiro lote; os seguintes só acrescentam eventos.
    await sql`
      insert into sessoes ${sql({
        id: sessao,
        visitante,
        pagina: txt(corpo.pagina, 200),
        origem: txt(origem.fonte),
        campanha: txt(origem.campanha),
        conteudo: txt(origem.conteudo),
        tipo_dispositivo: txt(d.tipo, 20),
        fabricante: txt(d.fabricante, 40),
        modelo: txt(d.modelo),
        modelo_estimado: d.modelo_estimado === true,
        sistema: txt(d.sistema, 40),
        versao_sistema: txt(d.versao_sistema, 40),
        navegador: txt(d.navegador, 40),
        versao_navegador: txt(d.versao_navegador, 40),
        app: txt(d.app, 40),
        tela: txt(d.tela, 30),
        idioma: txt(d.idioma, 20),
        user_agent: txt(d.user_agent, 400),
        cidade: geo(req, 'x-vercel-ip-city'),
        estado: geo(req, 'x-vercel-ip-country-region'),
        pais: geo(req, 'x-vercel-ip-country'),
        referencia: txt(c.referencia, 300),
        fuso: txt(c.fuso, 60),
        hora_local: num(c.hora_local),
        dia_semana: num(c.dia_semana),
        conexao: txt(c.conexao, 10),
        velocidade_mbps: real(c.velocidade_mbps),
        economia_dados: bool(c.economia_dados),
        memoria_gb: real(c.memoria_gb),
        nucleos: num(c.nucleos),
        tema_escuro: bool(c.tema_escuro),
        reduzir_movimento: bool(c.reduzir_movimento),
        janela: txt(c.janela, 20),
        visita_numero: num(c.visita_numero),
        dias_desde_primeira: num(c.dias_desde_primeira),
      })}
      on conflict (id) do nothing
    `

    const linhas = eventos
      .map((e) => {
        const dados = obj(e.dados)
        const quando = new Date(typeof e.quando === 'string' ? e.quando : Date.now())
        return {
          sessao,
          quando: Number.isNaN(quando.getTime()) ? new Date() : quando,
          nome: txt(e.nome, 60),
          secao: txt(dados.secao, 60),
          segundos: num(dados.segundos),
          // Acima de 2 KB o conteúdo é descartado (nenhuma ação legítima da página chega perto disso).
          dados: sql.json((JSON.stringify(dados).length <= 2000 ? dados : { cortado: true }) as never),
        }
      })
      .filter((l) => l.nome)

    if (linhas.length) await sql`insert into eventos ${sql(linhas)}`
  } catch (erro) {
    console.error('medição: falha ao gravar', erro)
    return new Response(null, { status: 500 })
  }

  return new Response(null, { status: 204 })
}
