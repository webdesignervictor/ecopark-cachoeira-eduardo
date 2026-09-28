/**
 * Aparelho de quem visita: tipo, modelo, sistema, navegador e tela.
 *
 * - Android no Chrome/Edge/Samsung: o modelo vem exato pelas "Client Hints" (ex.: SM-S918B).
 * - iPhone: o Safari não informa o modelo. Estimamos pela tela e marcamos modelo_estimado = true.
 * - A partir do iOS 26 o Safari congela a versão do sistema no texto do navegador;
 *   usamos a versão do Safari, que acompanha a do iOS.
 */

export interface Dispositivo {
  tipo: 'celular' | 'tablet' | 'computador'
  fabricante: string
  modelo: string
  modelo_estimado: boolean
  sistema: string
  versao_sistema: string
  navegador: string
  versao_navegador: string
  /** Navegador interno de app (Instagram, Facebook…), vazio se for navegador comum. */
  app: string
  tela: string
  idioma: string
  user_agent: string
}

interface DicasAltaPrecisao {
  model?: string
  platform?: string
  platformVersion?: string
  mobile?: boolean
  fullVersionList?: { brand: string; version: string }[]
}

type NavComDicas = Navigator & {
  userAgentData?: { getHighEntropyValues(h: string[]): Promise<DicasAltaPrecisao> }
}

/** Tela em pontos CSS (largura x altura @ densidade) → famílias de iPhone. */
const IPHONES: Record<string, string> = {
  '320x568@2': 'iPhone SE (1ª geração) / 5s',
  '375x667@2': 'iPhone SE (2ª/3ª) / 6 / 7 / 8',
  '414x736@3': 'iPhone 6 Plus / 7 Plus / 8 Plus',
  '375x812@3': 'iPhone X / XS / 11 Pro / 12 mini / 13 mini',
  '414x896@2': 'iPhone XR / 11',
  '414x896@3': 'iPhone XS Max / 11 Pro Max',
  '390x844@3': 'iPhone 12 / 12 Pro / 13 / 13 Pro / 14',
  '428x926@3': 'iPhone 12 Pro Max / 13 Pro Max / 14 Plus',
  '393x852@3': 'iPhone 14 Pro / 15 / 15 Pro / 16',
  '430x932@3': 'iPhone 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus',
  '402x874@3': 'iPhone 16 Pro / 17 / 17 Pro',
  '420x912@3': 'iPhone Air',
  '440x956@3': 'iPhone 16 Pro Max / 17 Pro Max',
}

/**
 * Código de hardware que os apps da Meta põem no navegador interno do iPhone (ex.: "iPhone15,4").
 * Com ele o modelo é exato. Códigos fora da lista ficam gravados como vieram.
 */
const CODIGOS_IPHONE: Record<string, string> = {
  'iPhone12,1': 'iPhone 11', 'iPhone12,3': 'iPhone 11 Pro', 'iPhone12,5': 'iPhone 11 Pro Max',
  'iPhone12,8': 'iPhone SE (2ª geração)',
  'iPhone13,1': 'iPhone 12 mini', 'iPhone13,2': 'iPhone 12', 'iPhone13,3': 'iPhone 12 Pro',
  'iPhone13,4': 'iPhone 12 Pro Max',
  'iPhone14,4': 'iPhone 13 mini', 'iPhone14,5': 'iPhone 13', 'iPhone14,2': 'iPhone 13 Pro',
  'iPhone14,3': 'iPhone 13 Pro Max', 'iPhone14,6': 'iPhone SE (3ª geração)',
  'iPhone14,7': 'iPhone 14', 'iPhone14,8': 'iPhone 14 Plus',
  'iPhone15,2': 'iPhone 14 Pro', 'iPhone15,3': 'iPhone 14 Pro Max',
  'iPhone15,4': 'iPhone 15', 'iPhone15,5': 'iPhone 15 Plus',
  'iPhone16,1': 'iPhone 15 Pro', 'iPhone16,2': 'iPhone 15 Pro Max',
  'iPhone17,1': 'iPhone 16 Pro', 'iPhone17,2': 'iPhone 16 Pro Max',
  'iPhone17,3': 'iPhone 16', 'iPhone17,4': 'iPhone 16 Plus', 'iPhone17,5': 'iPhone 16e',
}

const achar = (ua: string, re: RegExp) => ua.match(re)?.[1] ?? ''
const pontos = (v: string) => v.replace(/_/g, '.')

function navegadorDoUA(ua: string): { navegador: string; versao: string; app: string } {
  const app = /Instagram/.test(ua)
    ? 'Instagram'
    : /FBAN|FBAV|FB_IAB/.test(ua)
      ? 'Facebook'
      : /WhatsApp/.test(ua)
        ? 'WhatsApp'
        : /TikTok|musical_ly|BytedanceWebview/.test(ua)
          ? 'TikTok'
          : ''

  const regras: [string, RegExp][] = [
    ['Samsung Internet', /SamsungBrowser\/([\d.]+)/],
    ['Edge', /Edg(?:A|iOS)?\/([\d.]+)/],
    ['Opera', /OPR\/([\d.]+)/],
    ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/],
    ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
    ['Safari', /Version\/([\d.]+).*Safari/],
  ]
  for (const [navegador, re] of regras) {
    const versao = achar(ua, re)
    if (versao) return { navegador, versao, app }
  }
  return { navegador: app ? 'Navegador do app' : 'Outro', versao: '', app }
}

export async function detectarDispositivo(): Promise<Dispositivo> {
  const ua = navigator.userAgent
  const larg = Math.round(Math.min(screen.width, screen.height))
  const alt = Math.round(Math.max(screen.width, screen.height))
  const dpr = Math.round(window.devicePixelRatio || 1)
  const { navegador, versao, app } = navegadorDoUA(ua)

  // iPad moderno se apresenta como Mac; o toque denuncia.
  const ipad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  const iphone = /iPhone|iPod/.test(ua)
  const android = /Android/.test(ua)

  const d: Dispositivo = {
    tipo: 'computador',
    fabricante: '',
    modelo: '',
    modelo_estimado: false,
    sistema: '',
    versao_sistema: '',
    navegador,
    versao_navegador: versao,
    app,
    tela: `${larg}x${alt}@${dpr}`,
    idioma: navigator.language,
    user_agent: ua.slice(0, 400),
  }

  if (iphone || ipad) {
    d.tipo = ipad ? 'tablet' : 'celular'
    d.fabricante = 'Apple'
    d.sistema = ipad ? 'iPadOS' : 'iOS'
    const doSistema = pontos(achar(ua, /OS (\d+[_\d]*) like Mac/))
    const doSafari = achar(ua, /Version\/(\d+(?:\.\d+)?)/)
    // Do iOS 26 em diante o "OS 18_x" é congelado; a versão do Safari é a real.
    d.versao_sistema = doSafari && Number(doSafari.split('.')[0]) >= 26 ? doSafari : doSistema || doSafari
    const codigo = achar(ua, /\b((?:iPhone|iPad)\d+,\d+)\b/)
    if (codigo) {
      d.modelo = CODIGOS_IPHONE[codigo] ?? codigo
    } else {
      d.modelo = ipad ? 'iPad' : (IPHONES[d.tela] ?? 'iPhone')
      d.modelo_estimado = true
    }
  } else if (android) {
    d.tipo = /Mobile/.test(ua) ? 'celular' : 'tablet'
    d.sistema = 'Android'
    d.versao_sistema = achar(ua, /Android ([\d.]+)/)
    // "Android 13; moto g84 5G Build/…; wv)" · "Android 10; K)" (Chrome esconde o modelo: vem das Client Hints)
    const doUA = achar(ua, /Android [\d.]+; (?:[a-z]{2}[-_][A-Za-z]{2}; )?([^;)]+?)(?:\s+Build\/[^;)]*)?(?:;|\))/)
    d.modelo = doUA && doUA !== 'K' ? doUA.trim() : ''
  } else if (/Windows NT/.test(ua)) {
    d.sistema = 'Windows'
  } else if (/Mac OS X/.test(ua)) {
    d.sistema = 'macOS'
    d.versao_sistema = pontos(achar(ua, /Mac OS X ([\d_]+)/))
  } else if (/Linux|CrOS/.test(ua)) {
    d.sistema = /CrOS/.test(ua) ? 'ChromeOS' : 'Linux'
  }

  // Chrome/Edge/Samsung: modelo e versões exatas (o texto do navegador vem reduzido nesses).
  const dicas = (navigator as NavComDicas).userAgentData
  if (dicas) {
    try {
      const h = await dicas.getHighEntropyValues(['model', 'platform', 'platformVersion', 'fullVersionList'])
      if (h.model) d.modelo = h.model
      if (h.platform === 'Android' && h.platformVersion) d.versao_sistema = h.platformVersion
      if (h.platform === 'Windows' && h.platformVersion) {
        // platformVersion 13+ = Windows 11; abaixo, Windows 10.
        d.versao_sistema = Number(h.platformVersion.split('.')[0]) >= 13 ? '11' : '10'
      }
      if (h.platform === 'macOS' && h.platformVersion) d.versao_sistema = h.platformVersion
      const marca = h.fullVersionList?.find((b) =>
        d.navegador === 'Edge' ? b.brand === 'Microsoft Edge' : b.brand === 'Google Chrome',
      )
      if (marca) d.versao_navegador = marca.version
    } catch {
      /* navegador recusou; fica com o que veio do texto */
    }
  }

  if (d.fabricante === '' && d.modelo) d.fabricante = fabricanteDoModelo(d.modelo)
  return d
}

/** Prefixos de modelo mais comuns no Brasil → fabricante. */
function fabricanteDoModelo(m: string): string {
  if (/^SM-|^Galaxy|^GT-/i.test(m)) return 'Samsung'
  if (/^moto|^XT\d/i.test(m)) return 'Motorola'
  if (/^Redmi|^POCO|^Mi |^M\d{4}|^2\d{3}[A-Z0-9]{4,}/i.test(m)) return 'Xiaomi'
  if (/^Pixel/i.test(m)) return 'Google'
  if (/^LM-|^LG/i.test(m)) return 'LG'
  if (/^CPH|^RMX/i.test(m)) return /^RMX/i.test(m) ? 'Realme' : 'Oppo'
  if (/^ASUS|^ZenFone/i.test(m)) return 'Asus'
  return ''
}
