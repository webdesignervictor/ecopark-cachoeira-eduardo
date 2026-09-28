/**
 * Envio das ações para o nosso banco (função /api/eventos no Vercel → Postgres).
 *
 * Cada visita tem:
 * - visitante: identificador anônimo guardado no aparelho (reconhece quem volta);
 * - sessão: um por aba aberta.
 * Nenhum dado pessoal (nome, telefone, IP) sai daqui.
 *
 * Os eventos vão em lotes: a cada 5 s, a cada 20 eventos, e ao sair da página (sendBeacon).
 * Só envia no site publicado; em `npm run dev` nada sai.
 */
import { lerContexto, type Contexto } from './contexto'
import { detectarDispositivo, type Dispositivo } from './dispositivo'
import type { Origem } from './rastreio'

const ENDPOINT = '/api/eventos'
const ATIVO = import.meta.env.PROD

interface Evento {
  nome: string
  dados: Record<string, string | number>
  quando: string
}

const fila: Evento[] = []
let dispositivo: Dispositivo | null = null
let contexto: Contexto | null = null
let origem: Origem | null = null
let timer = 0

function idGuardado(armazenamento: Storage, chave: string): string {
  try {
    let id = armazenamento.getItem(chave)
    if (!id) {
      id = crypto.randomUUID()
      armazenamento.setItem(chave, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

const visitante = () => idGuardado(localStorage, 'ecopark_visitante')
const sessao = () => idGuardado(sessionStorage, 'ecopark_sessao')

export async function iniciarBanco(o: Origem): Promise<void> {
  if (!ATIVO) return
  origem = o
  contexto = lerContexto()
  dispositivo = await detectarDispositivo()
  enviarLote()
}

export function registrar(nome: string, dados: Record<string, string | number>): void {
  if (!ATIVO) return
  fila.push({ nome, dados, quando: new Date().toISOString() })
  if (fila.length >= 20) enviarLote()
  else if (!timer) timer = window.setTimeout(enviarLote, 5000)
}

/** Manda o que estiver na fila. `saindo` usa sendBeacon, que sobrevive ao fechamento da aba. */
export function enviarLote(saindo = false): void {
  clearTimeout(timer)
  timer = 0
  // Espera o aparelho ser detectado (leva milissegundos) antes do primeiro envio.
  if (!ATIVO || !fila.length || !dispositivo || !origem) return

  const corpo = JSON.stringify({
    visitante: visitante(),
    sessao: sessao(),
    pagina: location.pathname,
    origem,
    dispositivo,
    contexto,
    eventos: fila.splice(0, 50),
  })

  if (saindo && navigator.sendBeacon) {
    navigator.sendBeacon(ENDPOINT, new Blob([corpo], { type: 'application/json' }))
  } else {
    fetch(ENDPOINT, { method: 'POST', body: corpo, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(
      () => {},
    )
  }
  if (fila.length) enviarLote(saindo)
}
