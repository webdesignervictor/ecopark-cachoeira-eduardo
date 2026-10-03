/**
 * Rastreamento das ações de quem visita a página.
 *
 * Um único ponto de disparo, `rastrear(nome, dados)`, manda cada ação para o nosso banco
 * (banco.ts) e para as ferramentas que tiverem ID preenchido. ID vazio = a ferramenta não
 * carrega e nenhum dado sai para ela.
 *
 * Os scripts externos só carregam depois que a página terminou de abrir,
 * para não pesar na velocidade.
 *
 * Em `npm run dev`, cada ação aparece no console do navegador como [medição].
 */
import { enviarLote, iniciarBanco, registrar } from './banco'
import { iniciarPixel, PIXEL_META } from './pixel'
import type { Origem } from './rastreio'

/** Google Analytics 4 — "ID da métrica", formato G-XXXXXXXXXX. */
export const GA4_ID = ''

/** Microsoft Clarity — gravação de sessões e mapa de calor. ID do projeto em clarity.microsoft.com. */
export const CLARITY_ID = ''

type Dados = Record<string, string | number>

type Janela = Window & {
  fbq?: (...a: unknown[]) => void
  gtag?: (...a: unknown[]) => void
  dataLayer?: unknown[]
  clarity?: (...a: unknown[]) => void
}
const w = () => window as Janela

/**
 * Ações que viram evento padrão do Meta (é o que otimiza a campanha):
 * - abriu o Monte seu pack → InitiateCheckout (começou a montar o pedido);
 * - enviou o pack → Lead, com o valor estimado em reais (o Meta aprende quem gasta mais);
 * - qualquer clique para o WhatsApp → Contact;
 * - tocou em "Pagar agora" → AddPaymentInfo, com o valor;
 * - voltou do Mercado Pago com pagamento aprovado → Purchase, com o valor pago.
 */
const PADRAO_META: Record<string, string> = {
  pack_aberto: 'InitiateCheckout',
  pack_enviado: 'Lead',
  clique_whatsapp: 'Contact',
  pagamento_iniciado: 'AddPaymentInfo',
  compra: 'Purchase',
}

/** Parâmetros no formato que o Meta entende (valor e moeda no Lead do pack). */
function paramsMeta(nome: string, dados: Dados): Dados {
  if (nome === 'compra') return { value: Number(dados.valor) || 0, currency: 'BRL' }
  if (nome === 'pagamento_iniciado') return { value: Number(dados.total) || 0, currency: 'BRL', num_items: Number(dados.quantidade) || 0 }
  if (nome !== 'pack_enviado') return dados
  return {
    value: Number(dados.total) || 0,
    currency: 'BRL',
    content_name: String(dados.itens ?? ''),
    num_items: Number(dados.quantidade) || 0,
  }
}

/** Ações que acontecem antes de os scripts carregarem esperam aqui e saem assim que eles sobem. */
let carregado = false
const pendentes: [string, Dados][] = []

export function rastrear(nome: string, dados: Dados = {}): void {
  if (typeof window === 'undefined') return
  if (import.meta.env.DEV) console.info('[medição]', nome, dados)
  registrar(nome, dados)
  if (!carregado) {
    pendentes.push([nome, dados])
    return
  }
  enviar(nome, dados)
}

function enviar(nome: string, dados: Dados): void {
  const j = w()
  if (PIXEL_META && j.fbq) {
    const padrao = PADRAO_META[nome]
    if (padrao) j.fbq('track', padrao, paramsMeta(nome, dados))
    else j.fbq('trackCustom', nome, dados)
  }
  if (GA4_ID && j.gtag) j.gtag('event', nome, dados)
  if (CLARITY_ID && j.clarity) j.clarity('event', nome)
}

function carregarScript(src: string): void {
  const s = document.createElement('script')
  s.async = true
  s.src = src
  document.head.appendChild(s)
}

function iniciarGA4(origem: Origem): void {
  if (!GA4_ID) return
  const j = w()
  j.dataLayer = j.dataLayer || []
  j.gtag = function () {
    // O gtag exige o objeto "arguments", não um array.
    // eslint-disable-next-line prefer-rest-params
    j.dataLayer!.push(arguments)
  }
  j.gtag('js', new Date())
  // transport_type beacon: o tempo da última seção chega mesmo com a aba fechando.
  j.gtag('config', GA4_ID, { origem_visita: origem.fonte, transport_type: 'beacon' })
  carregarScript(`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`)
}

function iniciarClarity(origem: Origem): void {
  if (!CLARITY_ID) return
  const j = w()
  // Fila no mesmo formato do snippet oficial: o script do Clarity lê j.clarity.q ao subir.
  const stub = function () {
    // eslint-disable-next-line prefer-rest-params
    ;(stub.q = stub.q || []).push(arguments)
  } as ((...a: unknown[]) => void) & { q?: IArguments[] }
  j.clarity = stub
  carregarScript(`https://www.clarity.ms/tag/${CLARITY_ID}`)
  // Permite filtrar as gravações por origem (instagram, meta…) no painel do Clarity.
  j.clarity('set', 'origem', origem.fonte)
  if (origem.campanha) j.clarity('set', 'campanha', origem.campanha)
}

/** Classifica um link clicado pelo destino. */
function acaoDoLink(href: string): string | null {
  if (href.includes('wa.me/')) return 'clique_whatsapp'
  if (href.includes('google.com/maps/dir')) return 'clique_rota_google'
  if (href.includes('waze.com')) return 'clique_rota_waze'
  if (href.includes('search.google.com/local/reviews')) return 'clique_avaliacoes_google'
  if (href.startsWith('http')) return 'clique_link_externo'
  return null
}

/**
 * Onde a ação aconteceu: data-local (elementos fixos, como a barra de reserva) ou data-secao.
 * Só data-secao conta como "seção vista".
 */
const secaoDe = (el: Element) => {
  const lugar = el.closest<HTMLElement>('[data-local], [data-secao]')
  return lugar?.dataset.local ?? lugar?.dataset.secao ?? 'desconhecida'
}

/** Liga os ouvintes de cliques, perguntas abertas, seções vistas e rolagem. */
function ouvirAcoes(): void {
  // Cliques: links (pelo destino) e qualquer elemento com data-evento.
  document.addEventListener(
    'click',
    (e) => {
      const alvo = e.target as Element | null
      if (!alvo) return

      const marcado = alvo.closest<HTMLElement>('[data-evento]')
      if (marcado) {
        rastrear(marcado.dataset.evento!, { secao: secaoDe(marcado), ...(marcado.dataset.detalhe ? { detalhe: marcado.dataset.detalhe } : {}) })
        return
      }

      const link = alvo.closest<HTMLAnchorElement>('a[href]')
      if (!link) return
      let acao = acaoDoLink(link.href)
      if (!acao) return
      const secao = secaoDe(link)
      if (acao === 'clique_whatsapp' && secao === 'hospedagem') acao = 'clique_hospedagem'
      rastrear(acao, { secao, texto: (link.textContent ?? '').trim().slice(0, 60) })
    },
    { capture: true },
  )

  // Perguntas frequentes abertas.
  document.addEventListener(
    'toggle',
    (e) => {
      const d = e.target as HTMLDetailsElement
      if (d.tagName !== 'DETAILS' || !d.open) return
      rastrear('pergunta_aberta', { pergunta: (d.querySelector('summary')?.textContent ?? '').trim().slice(0, 80) })
    },
    { capture: true },
  )

  // Cada seção conta uma vez quando metade dela aparece na tela.
  const vistas = new Set<string>()
  const obs = new IntersectionObserver(
    (entradas) => {
      for (const en of entradas) {
        const nome = (en.target as HTMLElement).dataset.secao!
        if (!en.isIntersecting || vistas.has(nome)) continue
        vistas.add(nome)
        rastrear('secao_vista', { secao: nome })
        obs.unobserve(en.target)
      }
    },
    { threshold: 0.5 },
  )
  document.querySelectorAll('[data-secao]').forEach((s) => obs.observe(s))

  medirTempoPorSecao()

  ouvirComportamento()

  // Ao sair (depois de fechar o tempo da seção atual e o resumo, ligados acima): último lote pro banco.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') enviarLote(true)
  })
  window.addEventListener('pagehide', () => enviarLote(true))

  // Profundidade de rolagem: 25, 50, 75 e 90%.
  const marcos = [25, 50, 75, 90]
  const batidos = new Set<number>()
  const aoRolar = () => {
    const total = document.documentElement.scrollHeight - window.innerHeight
    if (total <= 0) return
    const pct = (window.scrollY / total) * 100
    for (const m of marcos) {
      if (pct >= m && !batidos.has(m)) {
        batidos.add(m)
        rastrear('rolagem', { percentual: m })
      }
    }
    if (batidos.size === marcos.length) window.removeEventListener('scroll', aoRolar)
  }
  window.addEventListener('scroll', aoRolar, { passive: true })
}

/**
 * Tempo em cada seção. A seção "atual" é a que cruza a linha do meio da tela.
 * O relógio pausa com a aba escondida (troca de app, tela bloqueada).
 * Ao sair da seção — ou da página — sai um evento tempo_secao com os segundos.
 * Passagens rápidas (menos de 1 s, rolando direto) não contam.
 */
function medirTempoPorSecao(): void {
  let atual: string | null = null
  let inicio = 0

  const fechar = () => {
    if (!atual || !inicio) return
    const segundos = Math.round((performance.now() - inicio) / 1000)
    inicio = 0
    if (segundos >= 1) rastrear('tempo_secao', { secao: atual, segundos })
  }
  const abrir = (nome: string) => {
    atual = nome
    inicio = document.visibilityState === 'visible' ? performance.now() : 0
  }

  const obs = new IntersectionObserver(
    (entradas) => {
      for (const en of entradas) {
        if (!en.isIntersecting) continue
        const nome = (en.target as HTMLElement).dataset.secao!
        if (nome === atual) continue
        fechar()
        abrir(nome)
      }
    },
    { rootMargin: '-50% 0px -50% 0px' },
  )
  document.querySelectorAll('[data-secao]').forEach((s) => obs.observe(s))

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') fechar()
    else if (atual) inicio = performance.now()
  })
  // Fechamento de aba no desktop, que nem sempre passa por visibilitychange.
  window.addEventListener('pagehide', fechar)
}

/**
 * Comportamento fino: vídeos assistidos, arrastes de galeria, mapa, texto copiado,
 * cliques de frustração, erros, velocidade real da página e resumo da visita.
 */
function ouvirComportamento(): void {
  const inicioVisita = performance.now()
  let tempoVisivel = 0
  let visivelDesde: number | null = document.visibilityState === 'visible' ? inicioVisita : null
  let rolagemMax = 0
  const secoesVistas = new Set<string>()
  let cliques = 0

  window.addEventListener(
    'scroll',
    () => {
      const total = document.documentElement.scrollHeight - innerHeight
      if (total > 0) rolagemMax = Math.max(rolagemMax, Math.round((scrollY / total) * 100))
    },
    { passive: true },
  )

  // Vídeos: segundos realmente tocados por vídeo, e se estava com som.
  const tocando = new Map<HTMLVideoElement, number>()
  const nomeVideo = (v: HTMLVideoElement) => (v.currentSrc || v.src).split('/').pop() ?? 'video'
  const fecharVideo = (v: HTMLVideoElement) => {
    const desde = tocando.get(v)
    if (desde === undefined) return
    tocando.delete(v)
    const segundos = Math.round((performance.now() - desde) / 1000)
    if (segundos >= 1) {
      rastrear('video_assistido', { video: nomeVideo(v), secao: secaoDe(v), segundos, com_som: v.muted ? 0 : 1 })
    }
  }
  document.addEventListener('play', (e) => {
    const v = e.target as HTMLVideoElement
    if (v.tagName === 'VIDEO') tocando.set(v, performance.now())
  }, { capture: true })
  document.addEventListener('pause', (e) => {
    const v = e.target as HTMLVideoElement
    if (v.tagName === 'VIDEO') fecharVideo(v)
  }, { capture: true })

  // Galerias arrastadas para o lado (uma vez por seção).
  const arrastadas = new Set<string>()
  document.addEventListener('scroll', (e) => {
    const el = e.target as Element
    if (!(el instanceof HTMLElement) || !el.classList.contains('sem-barra') || el.scrollLeft < 40) return
    const secao = secaoDe(el)
    if (arrastadas.has(secao)) return
    arrastadas.add(secao)
    rastrear('galeria_arrastada', { secao })
  }, { capture: true, passive: true })

  // Mexeu no mapa do Google (o foco vai para dentro do iframe).
  let mapaTocado = false
  window.addEventListener('blur', () => {
    const ativo = document.activeElement
    if (mapaTocado || !ativo || ativo.tagName !== 'IFRAME') return
    mapaTocado = true
    rastrear('mapa_interacao', { secao: secaoDe(ativo) })
  })

  // Texto copiado (preço, endereço…).
  document.addEventListener('copy', () => {
    const texto = String(getSelection() ?? '').trim().slice(0, 100)
    if (texto) rastrear('texto_copiado', { texto, secao: secaoDe(getSelection()?.anchorNode?.parentElement ?? document.body) })
  })

  // Cliques de frustração: 3 ou mais no mesmo ponto em menos de 1 s.
  let rajada: { alvo: EventTarget | null; x: number; y: number; t: number; n: number } | null = null
  document.addEventListener('click', (e) => {
    cliques++
    // detail 0 = clique de teclado ou de script; não é dedo nem mouse.
    if (e.detail === 0) return
    const agora = performance.now()
    if (
      rajada &&
      rajada.alvo === e.target &&
      agora - rajada.t < 1000 &&
      Math.hypot(e.clientX - rajada.x, e.clientY - rajada.y) < 30
    ) {
      rajada.n++
      rajada.t = agora
      if (rajada.n === 3) {
        const el = e.target as Element
        rastrear('clique_frustrado', {
          secao: secaoDe(el),
          elemento: el.tagName.toLowerCase(),
          texto: (el.textContent ?? '').trim().slice(0, 60),
        })
      }
    } else {
      rajada = { alvo: e.target, x: e.clientX, y: e.clientY, t: agora, n: 1 }
    }
  }, { capture: true })

  // Erros de JavaScript (no máximo 5 por visita).
  let erros = 0
  const erro = (mensagem: string) => {
    if (++erros > 5) return
    rastrear('erro_js', { mensagem: mensagem.slice(0, 150) })
  }
  window.addEventListener('error', (e) => erro(e.message || 'erro'))
  window.addEventListener('unhandledrejection', (e) => erro(String(e.reason)))

  // Velocidade real da página no aparelho da pessoa.
  const vitais: Record<string, number> = {}
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (nav) vitais.ttfb_ms = Math.round(nav.responseStart)
    new PerformanceObserver((l) => {
      for (const en of l.getEntries()) if (en.name === 'first-contentful-paint') vitais.fcp_ms = Math.round(en.startTime)
    }).observe({ type: 'paint', buffered: true })
    new PerformanceObserver((l) => {
      const ult = l.getEntries().at(-1)
      if (ult) vitais.lcp_ms = Math.round(ult.startTime)
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    let cls = 0
    new PerformanceObserver((l) => {
      for (const en of l.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!en.hadRecentInput) cls += en.value
      }
      vitais.cls_x1000 = Math.round(cls * 1000)
    }).observe({ type: 'layout-shift', buffered: true })
  } catch {
    /* navegador sem suporte */
  }
  let vitaisEnviados = false

  // Seções vistas, para o resumo.
  const obs = new IntersectionObserver((ents) => {
    for (const en of ents) if (en.isIntersecting) secoesVistas.add((en.target as HTMLElement).dataset.secao!)
  }, { threshold: 0.5 })
  document.querySelectorAll('[data-secao]').forEach((el) => obs.observe(el))

  // Resumo da visita a cada saída (troca de app, aba fechada). O último é o definitivo.
  const resumir = () => {
    tocando.forEach((_, v) => fecharVideo(v))
    if (visivelDesde !== null) tempoVisivel += performance.now() - visivelDesde
    visivelDesde = null
    if (!vitaisEnviados && Object.keys(vitais).length) {
      vitaisEnviados = true
      rastrear('desempenho', vitais)
    }
    rastrear('resumo_visita', {
      segundos_visivel: Math.round(tempoVisivel / 1000),
      segundos_total: Math.round((performance.now() - inicioVisita) / 1000),
      rolagem_max: rolagemMax,
      secoes_vistas: secoesVistas.size,
      cliques,
    })
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') resumir()
    else visivelDesde = performance.now()
  })
  window.addEventListener('pagehide', () => {
    if (visivelDesde !== null) resumir()
  })
}

let iniciada = false

/** Chamar uma vez, na montagem da página. */
export function iniciarMedicao(origem: Origem): void {
  // O React em modo de desenvolvimento monta duas vezes; os ouvintes só podem ser ligados uma.
  if (typeof window === 'undefined' || iniciada) return
  iniciada = true
  void iniciarBanco(origem)
  rastrear('pagina_aberta', { largura_janela: window.innerWidth })
  ouvirAcoes()

  const carregar = () => {
    iniciarPixel()
    iniciarGA4(origem)
    iniciarClarity(origem)
    carregado = true
    for (const [nome, dados] of pendentes.splice(0)) enviar(nome, dados)
  }
  // Ferramentas de terceiros: carregam depois da página aberta, independente do aviso de cookies
  // (decisão do cliente: o aviso é informativo, com um botão só).
  if (document.readyState === 'complete') setTimeout(carregar, 0)
  else window.addEventListener('load', () => setTimeout(carregar, 0), { once: true })
}
