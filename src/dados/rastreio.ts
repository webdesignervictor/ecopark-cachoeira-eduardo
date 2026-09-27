/**
 * Medição sem site antigo e sem banco: UTM capturada na chegada e origem
 * embutida na mensagem do WhatsApp. É o que permite dizer, no relatório,
 * de onde veio cada conversa.
 */

const CHAVE = 'ecopark_origem_1010'

export interface Origem {
  fonte: string
  campanha?: string
  conteudo?: string
  chegada: string
}

/** Lê a UTM da URL, guarda na sessão e devolve a origem desta visita. */
export function capturarOrigem(): Origem {
  const vazia: Origem = { fonte: 'direto', chegada: new Date().toISOString() }
  if (typeof window === 'undefined') return vazia

  try {
    const p = new URLSearchParams(window.location.search)
    const fonte = p.get('utm_source')

    if (fonte) {
      const origem: Origem = {
        fonte,
        campanha: p.get('utm_campaign') ?? undefined,
        conteudo: p.get('utm_content') ?? undefined,
        chegada: new Date().toISOString(),
      }
      sessionStorage.setItem(CHAVE, JSON.stringify(origem))
      return origem
    }

    const guardada = sessionStorage.getItem(CHAVE)
    if (guardada) return JSON.parse(guardada) as Origem

    const ref = document.referrer
    if (ref && !ref.includes(window.location.host)) {
      try {
        return { fonte: new URL(ref).hostname, chegada: vazia.chegada }
      } catch {
        return vazia
      }
    }
  } catch {
    return vazia
  }

  return vazia
}

/** Rótulo curto da origem, para entrar na mensagem que o cliente envia. */
function rotuloOrigem(o: Origem): string {
  const partes = [o.fonte]
  if (o.campanha) partes.push(o.campanha)
  if (o.conteudo) partes.push(o.conteudo)
  return partes.join(' / ')
}

/**
 * Monta o link do WhatsApp com a mensagem pré-escrita e a origem embutida.
 * Quem atende vê de onde a pessoa veio sem precisar perguntar.
 */
export function linkWhatsApp(
  numero: string,
  origem: Origem,
  assunto: string,
  pedido = 'Quero garantir minha vaga no evento do dia 10/10',
): string {
  const texto = `Oi! ${pedido} — ${assunto}.\n\n(origem: ${rotuloOrigem(origem)})`
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
}
