/**
 * Contexto da visita, além do aparelho: de onde clicou, que horas eram lá,
 * qual a internet, se é a primeira vez, preferências do aparelho.
 */

export interface Contexto {
  /** Página de onde a pessoa veio (vazio = digitou, app ou link sem referência). */
  referencia: string
  fuso: string
  /** Hora local da pessoa, 0–23, e dia da semana (0 = domingo). */
  hora_local: number
  dia_semana: number
  /** 4g, 3g, 2g… (Chrome/Android). Vazio no iPhone, que não informa. */
  conexao: string
  velocidade_mbps: number | null
  economia_dados: boolean
  memoria_gb: number | null
  nucleos: number | null
  tema_escuro: boolean
  reduzir_movimento: boolean
  janela: string
  /** Quantas vezes este aparelho já abriu a página (1 = primeira). */
  visita_numero: number
  /** Dias desde a primeira visita deste aparelho. */
  dias_desde_primeira: number
}

type NavExtra = Navigator & {
  connection?: { effectiveType?: string; downlink?: number; saveData?: boolean }
  deviceMemory?: number
}

function contarVisita(): { numero: number; dias: number } {
  try {
    // Conta uma vez por aba, não a cada recarregamento dentro dela.
    const jaContou = sessionStorage.getItem('ecopark_visita_contada')
    const numero = Number(localStorage.getItem('ecopark_visitas') || '0') + (jaContou ? 0 : 1)
    if (!jaContou) {
      localStorage.setItem('ecopark_visitas', String(numero))
      sessionStorage.setItem('ecopark_visita_contada', '1')
    }
    let primeira = localStorage.getItem('ecopark_primeira_visita')
    if (!primeira) {
      primeira = new Date().toISOString()
      localStorage.setItem('ecopark_primeira_visita', primeira)
    }
    const dias = Math.floor((Date.now() - new Date(primeira).getTime()) / 86_400_000)
    return { numero, dias }
  } catch {
    return { numero: 1, dias: 0 }
  }
}

export function lerContexto(): Contexto {
  const n = navigator as NavExtra
  const agora = new Date()
  const visita = contarVisita()
  const ref = document.referrer
  return {
    referencia: ref && !ref.includes(location.host) ? ref.slice(0, 300) : '',
    fuso: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
    hora_local: agora.getHours(),
    dia_semana: agora.getDay(),
    conexao: n.connection?.effectiveType ?? '',
    velocidade_mbps: n.connection?.downlink ?? null,
    economia_dados: n.connection?.saveData === true,
    memoria_gb: n.deviceMemory ?? null,
    nucleos: n.hardwareConcurrency ?? null,
    tema_escuro: matchMedia('(prefers-color-scheme: dark)').matches,
    reduzir_movimento: matchMedia('(prefers-reduced-motion: reduce)').matches,
    janela: `${innerWidth}x${innerHeight}`,
    visita_numero: visita.numero,
    dias_desde_primeira: visita.dias,
  }
}
