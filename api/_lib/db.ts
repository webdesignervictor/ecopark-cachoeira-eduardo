/**
 * Conexão com o Postgres, compartilhada pelas funções do backend.
 * Cada função usa a sua própria variável (usuário com só as permissões que precisa):
 *   DATABASE_URL           → api/eventos (medição; só insere)
 *   DATABASE_URL_RESERVAS  → api/pagamento e api/mercadopago (reservas)
 */
import postgres from 'postgres'

const conexoes = new Map<string, postgres.Sql>()

export function banco(variavel: 'DATABASE_URL' | 'DATABASE_URL_RESERVAS'): postgres.Sql | null {
  const url = process.env[variavel]
  if (!url) return null
  let sql = conexoes.get(url)
  if (!sql) {
    // SSL obrigatório nos provedores; desligado só para um banco local de teste.
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url)
    // prepare: false funciona com os "poolers" do Neon e do Supabase.
    sql = postgres(url, { ssl: local ? false : 'require', max: 1, prepare: false, idle_timeout: 20 })
    conexoes.set(url, sql)
  }
  return sql
}
