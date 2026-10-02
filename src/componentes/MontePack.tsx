import { useEffect, useMemo, useRef, useState } from 'react'
import { ATIVIDADES, EVENTO, HOSPEDAGEM, PACK, VISITACAO, WHATSAPP, idHospedagem } from '../dados/evento'
import { linkWhatsAppTexto, type Origem } from '../dados/rastreio'
import { rastrear } from '../dados/medicao'
import { Botao } from './Botao'

type Cobranca = 'pessoa' | 'veiculo' | 'casal'

interface Item {
  id: string
  grupo: 'atividade' | 'hospedagem' | 'entrada'
  nome: string
  preco: number
  cobranca: Cobranca
}

const ITENS: Item[] = [
  ...ATIVIDADES.map((a): Item => ({
    id: a.slug, grupo: 'atividade', nome: a.nome, preco: a.precoNumero, cobranca: a.cobranca ?? 'pessoa',
  })),
  ...HOSPEDAGEM.map((h): Item => ({
    id: idHospedagem(h.nome), grupo: 'hospedagem', nome: h.nome, preco: h.precoNumero, cobranca: h.cobranca,
  })),
  { id: 'visitacao', grupo: 'entrada', nome: VISITACAO.nome, preco: VISITACAO.precoNumero, cobranca: 'pessoa' },
]

const real = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

/** Quantas unidades cobrar: pessoas, veículos de até 4 ou casais/chalés de até 2. */
function unidades(cobranca: Cobranca, pessoas: number) {
  if (cobranca === 'veiculo') return Math.ceil(pessoas / 4)
  if (cobranca === 'casal') return Math.ceil(pessoas / 2)
  return pessoas
}

function rotuloUnidades(cobranca: Cobranca, n: number) {
  if (cobranca === 'veiculo') return n === 1 ? '1 veículo' : `${n} veículos`
  if (cobranca === 'casal') return n === 1 ? '1 unidade' : `${n} unidades`
  return n === 1 ? '1 pessoa' : `${n} pessoas`
}

const porQue = (c: Cobranca) => (c === 'veiculo' ? PACK.porVeiculo : c === 'casal' ? PACK.porCasal : PACK.porPessoa)

interface Props {
  /** Itens já marcados ao abrir (ex.: o Rope Jump, ou a hospedagem do card clicado). */
  inicial: string[]
  origem: Origem
  onFechar: () => void
}

/**
 * Painel "Monte o seu sábado". No celular sobe de baixo (folha); no desktop, janela centralizada.
 * A pessoa escolhe de 1 serviço a todos, ajusta pessoas e turno, vê o total estimado
 * e envia o pack já escrito no WhatsApp.
 * Montado só enquanto está aberto: cada abertura começa do zero, com `inicial` marcado.
 */
export function MontePack({ inicial, origem, onFechar }: Props) {
  const [sel, setSel] = useState<Set<string>>(() => new Set(inicial))
  const [pessoas, setPessoas] = useState(1)
  const [turno, setTurno] = useState('')
  const fechar = useRef<HTMLButtonElement>(null)

  // Trava a rolagem da página, foca o fechar e fecha no Esc enquanto o painel está aberto.
  useEffect(() => {
    fechar.current?.focus()
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => {
      document.body.style.overflow = anterior
      window.removeEventListener('keydown', esc)
    }
  }, [onFechar])

  const temHospedagem = ITENS.some((i) => i.grupo === 'hospedagem' && sel.has(i.id))

  const alternar = (item: Item) => {
    const prox = new Set(sel)
    if (item.grupo === 'entrada') return // obrigatória, não desmarca
    if (prox.has(item.id)) prox.delete(item.id)
    else {
      // Hospedagem é uma só.
      if (item.grupo === 'hospedagem') ITENS.filter((i) => i.grupo === 'hospedagem').forEach((i) => prox.delete(i.id))
      prox.add(item.id)
    }
    setSel(prox)
    rastrear('pack_item', { item: item.nome, marcado: prox.has(item.id) ? 1 : 0 })
  }

  const todasAtividades = ITENS.filter((i) => i.grupo === 'atividade').every((i) => sel.has(i.id))
  const marcarTodas = () => {
    const prox = new Set(sel)
    ITENS.filter((i) => i.grupo === 'atividade').forEach((i) => (todasAtividades ? prox.delete(i.id) : prox.add(i.id)))
    setSel(prox)
    rastrear('pack_todas', { marcado: todasAtividades ? 0 : 1 })
  }

  // A visitação é obrigatória: entra sempre, a não ser com hospedagem (que já a inclui).
  const escolhidos = useMemo(
    () =>
      ITENS.filter((i) => (i.grupo === 'entrada' ? !temHospedagem : sel.has(i.id))).map((i) => {
        const n = unidades(i.cobranca, pessoas)
        return { ...i, n, subtotal: i.preco * n }
      }),
    [sel, pessoas, temHospedagem],
  )
  const total = escolhidos.reduce((s, i) => s + i.subtotal, 0)

  const mensagem = [
    PACK.pedido,
    ...escolhidos.map((i) => `• ${i.nome} — ${rotuloUnidades(i.cobranca, i.n)} — ${real(i.subtotal)}`),
    ...(temHospedagem ? [`• ${VISITACAO.nome} — ${PACK.inclusaNaHospedagem.toLowerCase()}`] : []),
    '',
    `Pessoas: ${pessoas}`,
    `Turno: ${turno || PACK.semTurno}`,
    `${PACK.total}: ${real(total)}`,
  ].join('\n')

  const linha = (item: Item) => {
    const entrada = item.grupo === 'entrada'
    const marcado = entrada || sel.has(item.id)
    const bloqueado = entrada && temHospedagem
    const n = unidades(item.cobranca, pessoas)
    return (
      <li key={item.id}>
        <button
          type="button"
          role="checkbox"
          aria-checked={marcado && !bloqueado}
          aria-disabled={entrada || undefined}
          disabled={bloqueado}
          onClick={() => alternar(item)}
          className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left sm:py-3.5 ring-1 ring-inset transition-colors disabled:opacity-50 ${entrada ? 'cursor-default' : ''} ${
            marcado && !bloqueado ? 'bg-agua/10 ring-agua' : 'bg-pedra/60 ring-linha hover:ring-agua/50'
          }`}
        >
          <span
            aria-hidden="true"
            className={`grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors ${
              marcado && !bloqueado ? 'border-agua bg-agua text-white' : 'border-linha'
            }`}
          >
            {marcado && !bloqueado && (
              <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-[3]">
                <path d="m5 12 5 5L20 7" />
              </svg>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-[15px] leading-tight font-semibold">
              {item.nome}
              {entrada && !bloqueado && (
                <span className="rounded-full bg-laranja/15 px-2 py-0.5 font-rotulo text-[9px] font-medium uppercase tracking-[.14em] text-laranja">
                  {PACK.obrigatoria}
                </span>
              )}
            </span>
            <span className="mt-0.5 block text-[12px] text-bruma">
              {bloqueado ? PACK.inclusaNaHospedagem : `${real(item.preco)} ${porQue(item.cobranca)}`}
            </span>
          </span>
          {marcado && !bloqueado && (
            <span className="shrink-0 font-rotulo text-sm tabular-nums text-agua">{real(item.preco * n)}</span>
          )}
        </button>
      </li>
    )
  }

  return (
    <div
      data-local="pack"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onFechar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pack-titulo"
        className="flex max-h-[92svh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-noite text-neve shadow-2xl supports-[height:100dvh]:max-h-[calc(100dvh-2.5rem)] sm:rounded-3xl sm:supports-[height:100dvh]:max-h-[90dvh]"
      >
        {/* Cabeçalho */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-linha px-5 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4">
          <div>
            <h2 id="pack-titulo" className="font-titulo text-[1.75rem] leading-none sm:text-3xl">{PACK.titulo}</h2>
            <p className="mt-1.5 text-[13px] leading-snug text-bruma sm:text-sm">{PACK.intro}</p>
          </div>
          <button
            ref={fechar}
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="grid size-10 shrink-0 place-items-center rounded-full border border-linha text-neve hover:border-agua"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-2">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* Escolhas */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-4 sm:space-y-6 sm:px-6 sm:py-5">
          <section>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-rotulo text-[10px] uppercase tracking-[.2em] text-agua">{PACK.grupoAtividades}</h3>
              <button type="button" onClick={marcarTodas} className="text-[13px] font-semibold text-laranja hover:underline">
                {todasAtividades ? 'Desmarcar todas' : PACK.tudo}
              </button>
            </div>
            <ul className="mt-2.5 space-y-2">{ITENS.filter((i) => i.grupo === 'atividade').map(linha)}</ul>
          </section>

          <section>
            <h3 className="font-rotulo text-[10px] uppercase tracking-[.2em] text-agua">{PACK.grupoHospedagem}</h3>
            <ul className="mt-2.5 space-y-2">{ITENS.filter((i) => i.grupo === 'hospedagem').map(linha)}</ul>
          </section>

          <section>
            <h3 className="font-rotulo text-[10px] uppercase tracking-[.2em] text-agua">{PACK.grupoEntrada}</h3>
            <ul className="mt-2.5 space-y-2">{ITENS.filter((i) => i.grupo === 'entrada').map(linha)}</ul>
          </section>

          <section className="grid gap-5 sm:grid-cols-2">
            <div>
              <h3 className="font-rotulo text-[10px] uppercase tracking-[.2em] text-agua">{PACK.pessoas}</h3>
              <div className="mt-3 inline-flex items-center gap-1 rounded-full ring-1 ring-linha">
                <button type="button" aria-label="Menos uma pessoa" disabled={pessoas <= 1}
                  onClick={() => setPessoas((p) => Math.max(1, p - 1))}
                  className="grid size-11 place-items-center rounded-full text-xl disabled:opacity-30">−</button>
                <span className="w-8 text-center font-rotulo text-lg tabular-nums" aria-live="polite">{pessoas}</span>
                <button type="button" aria-label="Mais uma pessoa" disabled={pessoas >= 30}
                  onClick={() => setPessoas((p) => Math.min(30, p + 1))}
                  className="grid size-11 place-items-center rounded-full text-xl disabled:opacity-30">+</button>
              </div>
            </div>
            <div>
              <h3 className="font-rotulo text-[10px] uppercase tracking-[.2em] text-agua">{PACK.turno}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {[...EVENTO.turnos, PACK.semTurno].map((t) => {
                  const valor = t === PACK.semTurno ? '' : t
                  const ativo = turno === valor
                  return (
                    <button key={t} type="button" aria-pressed={ativo} onClick={() => setTurno(valor)}
                      className={`rounded-full px-3.5 py-2 text-[13px] font-medium ring-1 ring-inset transition-colors ${
                        ativo ? 'bg-agua text-white ring-agua' : 'ring-linha hover:ring-agua/50'
                      }`}>
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Total e envio */}
        <div className="shrink-0 border-t border-linha bg-mata px-5 pt-3 pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+.75rem))] sm:px-6 sm:pt-4">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm font-semibold">{PACK.total}</span>
            <span className="font-rotulo text-2xl tabular-nums text-agua">{real(total)}</span>
          </div>
          <p className="mt-0.5 text-[12px] text-bruma">{PACK.aviso}</p>
            <div
              className="mt-3 [&>a]:w-full [&>a]:justify-between"
              onClickCapture={() =>
                rastrear('pack_enviado', {
                  itens: escolhidos.map((i) => i.nome).join(' + ').slice(0, 150),
                  quantidade: escolhidos.length,
                  pessoas,
                  total,
                })
              }
            >
              <Botao href={linkWhatsAppTexto(WHATSAPP, origem, mensagem)} pulso={false}>
                {PACK.chamada}
              </Botao>
            </div>
        </div>
      </div>
    </div>
  )
}
