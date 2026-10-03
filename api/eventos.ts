/**
 * Recebe os lotes de ações da página (src/dados/banco.ts) e grava no Postgres (schema "medicao").
 * Roda como função do Vercel. Conexão: DATABASE_URL, com o usuário medicao_site (só insere).
 *
 * Proteções: só aceita pedidos da própria página, limite de pedidos por IP, corpo pequeno,
 * nomes e dados validados, e um teto de eventos por visita no próprio banco.
 * Sem DATABASE_URL, responde 204 e descarta — a página nunca quebra por causa da medição.
 */
import { banco } from './_lib/db'
import { UUID, dentroDoLimite, lerJson, num, origemValida, sem, txt } from './_lib/protecao'

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {})
const bool = (v: unknown) => (typeof v === 'boolean' ? v : null)
const real = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

const NOME_EVENTO = /^[a-z][a-z0-9_]{1,59}$/
const CHAVE_DADO = /^[a-z][a-z0-9_]{0,39}$/

/** Mantém só pares chave → texto/número simples (no máximo 20), descartando o resto. */
function limparDados(d: Obj): Record<string, string | number> {
  const limpo: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(d).slice(0, 20)) {
    if (!CHAVE_DADO.test(k)) continue
    if (typeof v === 'number' && Number.isFinite(v)) limpo[k] = v
    else if (typeof v === 'string') limpo[k] = v.slice(0, 200)
  }
  return limpo
}

/** Hora do aparelho, aceita só se estiver perto do agora (relógio errado ou forjado vira "agora"). */
function quandoValido(v: unknown): Date {
  const d = new Date(typeof v === 'string' ? v : NaN)
  const agora = Date.now()
  return Number.isNaN(d.getTime()) || d.getTime() < agora - 86_400_000 || d.getTime() > agora + 300_000
    ? new Date()
    : d
}

/** Cabeçalhos de localização que o Vercel preenche pelo IP (o IP não é guardado). */
const geo = (req: Request, nome: string) => {
  const v = req.headers.get(nome)
  return v ? decodeURIComponent(v).slice(0, 80) : null
}

export async function POST(req: Request): Promise<Response> {
  const sql = banco('DATABASE_URL')
  if (!sql) return sem(204)
  if (!origemValida(req)) return sem(403)
  if (!dentroDoLimite(req, 120, 'eventos:')) return sem(429)

  const corpo = await lerJson(req, 100_000)
  if (!corpo) return sem(400)

  const sessao = txt(corpo.sessao, 36)
  const visitante = txt(corpo.visitante, 36)
  if (!sessao || !visitante || !UUID.test(sessao) || !UUID.test(visitante)) return sem(400)

  const origem = obj(corpo.origem)
  const d = obj(corpo.dispositivo)
  const c = obj(corpo.contexto)

  const linhas = (Array.isArray(corpo.eventos) ? corpo.eventos : [])
    .slice(0, 50)
    .map(obj)
    .map((e) => {
      const nome = txt(e.nome, 60)
      if (!nome || !NOME_EVENTO.test(nome)) return null
      const dados = limparDados(obj(e.dados))
      const segundos = num(dados.segundos)
      return {
        sessao,
        quando: quandoValido(e.quando),
        nome,
        secao: txt(dados.secao, 60),
        segundos: segundos !== null && segundos >= 0 && segundos <= 86_400 ? segundos : null,
        dados: sql.json(dados),
      }
    })
    .filter((l) => l !== null)

  try {
    // A sessão entra no primeiro lote; os seguintes só acrescentam eventos.
    // "on conflict do nothing" sem citar a coluna: com "(id)" o Postgres exigiria permissão de LEITURA,
    // e o usuário do site (medicao_site) só pode inserir.
    await sql`
      insert into medicao.sessoes ${sql({
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
      on conflict do nothing
    `
    if (linhas.length) await sql`insert into medicao.eventos ${sql(linhas)}`
  } catch (erro) {
    console.error('medição: falha ao gravar', erro instanceof Error ? erro.message : erro)
    return sem(500)
  }

  return sem(204)
}
