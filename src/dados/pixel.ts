/**
 * Pixel do Meta. Deixe o ID vazio até a conta de anúncio do cliente existir —
 * com ID vazio nada é carregado e nenhum dado sai da página.
 * Os eventos saem por `rastrear()`, em medicao.ts.
 */
export const PIXEL_META = ''

export function iniciarPixel(): void {
  if (!PIXEL_META || typeof window === 'undefined') return
  const w = window as unknown as Record<string, unknown>
  if (w.fbq) return

  /* eslint-disable */
  ;(function (f: any, b: any, e: string, v: string) {
    let n: any, t: any, s: any
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
    }
    if (!f._fbq) f._fbq = n
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []
    t = b.createElement(e)
    t.async = true
    t.src = v
    s = b.getElementsByTagName(e)[0]
    s.parentNode.insertBefore(t, s)
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
  /* eslint-enable */

  const fbq = (window as unknown as { fbq: (...a: unknown[]) => void }).fbq
  fbq('init', PIXEL_META)
  fbq('track', 'PageView')
}
