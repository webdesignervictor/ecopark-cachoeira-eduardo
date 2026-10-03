/**
 * Aceite do aviso de cookies. O aviso é informativo: a medição carrega de qualquer forma.
 * O aceite só serve para o aviso não aparecer de novo (fica salvo no aparelho).
 * Para voltar a condicionar Pixel/GA4/Clarity ao aceite, use aoConsentir() em iniciarMedicao.
 */
const CHAVE = 'ecopark_cookies_aceitos'
const EVENTO = 'ecopark:consentimento'

export function temConsentimento(): boolean {
  try {
    return localStorage.getItem(CHAVE) === '1'
  } catch {
    return false
  }
}

export function darConsentimento(): void {
  try {
    localStorage.setItem(CHAVE, '1')
  } catch {
    /* sem armazenamento: vale só para esta visita */
  }
  window.dispatchEvent(new Event(EVENTO))
}

/** Chama `fn` assim que houver aceite (na hora, se já houver). */
export function aoConsentir(fn: () => void): void {
  if (temConsentimento()) fn()
  else window.addEventListener(EVENTO, fn, { once: true })
}
