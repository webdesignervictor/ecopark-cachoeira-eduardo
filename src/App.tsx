import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ATIVIDADES, AVALIACOES, BARRA, idHospedagem, COMO_FUNCIONA, CONTADOR, EVENTO, FECHO, FECHO_IMAGEM, FECHO_VIDEO, GALERIA, HOSPEDAGEM, HOSPEDAGEM_NOTA,
  HOSPEDAGEM_SECAO,
  LINK_PAGAMENTO, LOCALIZACAO, OBJECOES, PARA_QUEM, RESTAURANTE, RODAPE, TOPO, TOPO_MIDIA,
  WHATSAPP,
} from './dados/evento'
import { capturarOrigem, linkWhatsApp } from './dados/rastreio'
import { iniciarMedicao } from './dados/medicao'
import { AvisoIlustracao } from './componentes/AvisoIlustracao'
import { Botao } from './componentes/Botao'
import { Contador } from './componentes/Contador'
import { Estrelas } from './componentes/Estrelas'
import { CarrosselAvaliacoes } from './componentes/CarrosselAvaliacoes'
import { MontePack } from './componentes/MontePack'
import { Secao } from './componentes/Secao'
import { MidiaFundo } from './componentes/MidiaFundo'
import { BarraReserva } from './componentes/BarraReserva'
import { Trilho } from './componentes/Trilho'
import { VideoVertical } from './componentes/VideoVertical'

export default function App() {
  const origem = useMemo(() => capturarOrigem(), [])
  useEffect(() => iniciarMedicao(origem), [origem])
  const destino = (assunto: string) =>
    LINK_PAGAMENTO || linkWhatsApp(WHATSAPP, origem, assunto)

  // Monte seu pack: os botões de reserva abrem o painel com o serviço do botão já marcado.
  const [pack, setPack] = useState<{ aberto: boolean; inicial: string[] }>({ aberto: false, inicial: [] })
  const fecharPack = useCallback(() => setPack((p) => ({ ...p, aberto: false })), [])
  const abrirPack = (inicial: string[]) => (e: React.MouseEvent) => {
    if (LINK_PAGAMENTO) return // com checkout próprio, o botão segue direto para ele
    e.preventDefault()
    setPack({ aberto: true, inicial })
  }
  const reservar = { onClick: abrirPack(['rope-jump']), evento: 'pack_aberto' }

  // A barra fixa só aparece quando nenhum dos botões grandes (topo e fecho) está na tela.
  const topoRef = useRef<HTMLElement>(null)
  const fechoRef = useRef<HTMLDivElement>(null)
  const [visiveis, setVisiveis] = useState(() => new Set<Element>())
  useEffect(() => {
    const alvos = [topoRef.current, fechoRef.current].filter((e): e is HTMLElement => e !== null)
    const obs = new IntersectionObserver((entradas) =>
      setVisiveis((atual) => {
        const prox = new Set(atual)
        for (const e of entradas) {
          if (e.isIntersecting) prox.add(e.target)
          else prox.delete(e.target)
        }
        return prox
      }),
    )
    alvos.forEach((a) => obs.observe(a))
    return () => obs.disconnect()
  }, [])

  return (
    <main>
      {/* Contador preso no topo, acompanha a rolagem */}
      <Contador alvo={EVENTO.inicio} rotulo={CONTADOR.rotulo} chegou={CONTADOR.chegou} />

      {/* 01 · A promessa */}
      <header
        ref={topoRef}
        data-secao="topo"
        className="tema-escuro relative flex min-h-[88svh] flex-col justify-end overflow-hidden lg:justify-center bg-[linear-gradient(160deg,#1d3d2d,#0f2118_70%)] lg:min-h-[82vh]"
      >
        <MidiaFundo
          video={TOPO_MIDIA.video}
          foto={TOPO_MIDIA.foto}
          className="absolute inset-0 h-full w-full object-cover lg:inset-auto lg:top-1/2 lg:right-[max(2rem,calc((100vw-72rem)/2+2rem))] lg:aspect-[9/16] lg:h-[80%] lg:w-auto lg:-translate-y-1/2 lg:rounded-3xl lg:shadow-2xl lg:ring-4 lg:ring-laranja"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 lg:hidden bg-[linear-gradient(to_top,rgba(10,24,17,.92)_0%,rgba(10,24,17,.55)_45%,rgba(10,24,17,.15)_100%)]"
        />
        <div className="relative mx-auto w-full max-w-6xl px-5 pt-28 pb-10 sm:px-8 sm:pb-16 lg:py-16 lg:pr-[26rem]">
          <p className="font-rotulo text-[11px] uppercase tracking-[.22em] text-agua">{TOPO.rotulo}</p>
          <h1 className="mt-4 max-w-3xl font-titulo lg:max-w-2xl text-[3.25rem] leading-[.95] tracking-tight text-balance sm:text-7xl lg:text-8xl">
            {TOPO.titulo}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-bruma sm:text-xl">{TOPO.subtitulo}</p>

          <div className="mt-7 flex flex-col">
            <Botao href={destino('Rope Jump')} {...reservar} className="max-sm:self-center">{TOPO.chamada}</Botao>
          </div>

          <a
            href={AVALIACOES.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex w-fit items-center gap-2.5 text-sm hover:underline max-sm:mx-auto"
          >
            <Estrelas nota={5} />
            <span>
              <strong className="font-semibold">{AVALIACOES.nota}</strong>
              <span className="text-bruma"> · {AVALIACOES.total} avaliações no Google</span>
            </span>
          </a>

        </div>
      </header>

      {/* Ficha do evento */}
      <div data-secao="ficha" className="border-b border-linha">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            {[
              ['Data', EVENTO.data],
              ['Turnos', EVENTO.turnos.join(' · ')],
              ['Onde', EVENTO.distancia],
              ['Vagas', 'Limitadas por turno'],
            ].map(([rot, val]) => (
              <div key={rot}>
                <dt className="font-rotulo text-[10px] uppercase tracking-[.2em] text-agua">{rot}</dt>
                <dd className="mt-1.5 text-sm leading-snug text-neve">{val}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-sm text-bruma">{TOPO.apoio}</p>
        </div>
      </div>

      {/* 01b · Avaliações do Google — logo depois da ficha, para a prova vir cedo */}
      <Secao nome="avaliacoes" rotulo={AVALIACOES.rotulo} titulo={AVALIACOES.titulo} fundo="vidro">
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="font-titulo text-6xl leading-none">{AVALIACOES.nota}</p>
          <div>
            <Estrelas nota={5} />
            <p className="mt-1 text-sm text-bruma">{AVALIACOES.total} avaliações no Google</p>
          </div>
        </div>

        <CarrosselAvaliacoes avaliacoes={AVALIACOES.lista} className="mt-8" />

        <Botao href={AVALIACOES.link} variante="vazado" className="mt-8">
          {AVALIACOES.chamada}
        </Botao>
      </Secao>

      {/* 02 · Galeria de vídeos */}
      <Secao nome="galeria" rotulo={GALERIA.rotulo} titulo={GALERIA.titulo} intro={GALERIA.intro}>
        <Trilho className="mt-9">
          {GALERIA.videos.map((v, i) => (
            <VideoVertical key={v.src} src={v.src} poster={v.poster}>
              <span className="font-rotulo text-[10px] text-agua tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="mt-1 text-base leading-snug font-semibold">{v.legenda}</p>
            </VideoVertical>
          ))}
        </Trilho>
        <AvisoIlustracao />
      </Secao>

      {/* 03 · Para quem é */}
      <Secao nome="para_quem" rotulo="Para quem é" titulo={PARA_QUEM.titulo} fundo="vidro">
        <ul className="mt-8 max-w-2xl rounded-2xl bg-white/10 px-5 py-2 shadow-lg shadow-black/20 ring-1 ring-white/20 ring-inset backdrop-blur-xl sm:px-6">
          {PARA_QUEM.sim.map((t) => (
            <li key={t} className="flex gap-3 border-b border-white/10 py-3.5 text-[15px] leading-snug last:border-0">
              <span aria-hidden="true" className="mt-px text-agua">+</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Secao>

      {/* 04 · Como funciona */}
      <Secao nome="como_funciona" rotulo="Como funciona" titulo="Três passos e está feito">
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {COMO_FUNCIONA.map((p) => (
            <li key={p.numero} className="border-t border-agua/40 pt-5">
              <span className="font-rotulo text-xs text-agua">{p.numero}</span>
              <h3 className="mt-2 text-lg font-semibold">{p.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-bruma">{p.texto}</p>
            </li>
          ))}
        </ol>
      </Secao>

      {/* 05 · Atividades e preços */}
      <Secao
        id="atividades"
        nome="atividades"
        rotulo="O que dá para fazer"
        titulo="Escolha o seu dia"
        intro="Cada atividade é cobrada à parte, além da taxa de visitação. Você monta o sábado do tamanho que quiser."
        fundo="vidro"
      >
        <Trilho colunas={4} className="mt-9">
          {ATIVIDADES.map((a) => (
            <VideoVertical
              key={a.slug}
              src={a.video}
              poster={a.imagem}
              className={a.destaque ? 'borda-viva' : ''}
            >
              {a.destaque && (
                <span className="mb-2 inline-block rounded-full bg-laranja px-2.5 py-1 font-rotulo text-[9px] font-medium uppercase tracking-[.16em] text-white">
                  O principal
                </span>
              )}
              <h3 className="text-lg leading-tight font-semibold">{a.nome}</h3>
              <p className="mt-1 font-rotulo text-xl tabular-nums text-agua">{a.preco}</p>
              <p className="mt-2 line-clamp-3 text-[13px] leading-snug text-bruma">{a.descricao}</p>
              {a.observacao && (
                <p className="mt-2 font-rotulo text-[9px] uppercase tracking-[.14em] text-bruma">
                  {a.observacao}
                </p>
              )}
            </VideoVertical>
          ))}
        </Trilho>
        <AvisoIlustracao />
      </Secao>

      {/* 06 · Hospedagem */}
      <Secao nome="hospedagem" rotulo={HOSPEDAGEM_SECAO.rotulo} titulo={HOSPEDAGEM_SECAO.titulo} intro={HOSPEDAGEM_SECAO.intro}>
        <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-pedra px-3.5 py-1.5 text-sm font-medium text-agua">
          <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-[2.5]" aria-hidden="true">
            <path d="m5 12 5 5L20 7" />
          </svg>
          {HOSPEDAGEM_NOTA}
        </p>

        <Trilho colunas={3} className="mt-8">
          {HOSPEDAGEM.map((h) => (
            <VideoVertical key={h.nome} src={h.video} poster={h.imagem} className={h.destaque ? 'borda-viva' : ''}>
              {h.selo && (
                <span
                  className={`mb-2 inline-block rounded-full px-2.5 py-1 font-rotulo text-[9px] font-medium uppercase tracking-[.16em] ${
                    h.destaque ? 'bg-laranja text-white' : 'bg-white/15 text-white backdrop-blur'
                  }`}
                >
                  {h.selo}
                </span>
              )}
              <h3 className="text-xl leading-tight font-semibold">{h.nome}</h3>
              <p className="mt-1 font-rotulo text-2xl tabular-nums text-agua">{h.preco}</p>
              <p className="mt-1 text-[13px] leading-snug text-bruma">{h.detalhe}</p>
              <Botao
                href={linkWhatsApp(WHATSAPP, origem, h.nome, HOSPEDAGEM_SECAO.pedido)}
                onClick={abrirPack([idHospedagem(h.nome)])}
                evento="pack_aberto"
                tamanho="compacto"
                variante={h.destaque ? 'cheio' : 'vazado'}
                className="mt-4"
              >
                {HOSPEDAGEM_SECAO.chamada}
              </Botao>
            </VideoVertical>
          ))}
        </Trilho>
        <AvisoIlustracao />
      </Secao>

      {/* 07 · Restaurante */}
      <Secao nome="restaurante" rotulo={RESTAURANTE.rotulo} titulo={RESTAURANTE.titulo} intro={RESTAURANTE.texto} fundo="vidro">
        <ul className="mt-6 flex flex-wrap gap-2">
          {RESTAURANTE.destaques.map((d) => (
            <li
              key={d}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm shadow-md shadow-black/20 ring-1 ring-white/20 ring-inset backdrop-blur-xl"
            >
              <span aria-hidden="true" className="size-1.5 rounded-full bg-agua" />
              {d}
            </li>
          ))}
        </ul>

        <Trilho colunas={4} className="mt-8">
          {RESTAURANTE.videos.map((v) => (
            <VideoVertical
              key={v.src}
              src={v.src}
              poster={v.poster}
              className="shadow-xl shadow-black/30 ring-1 ring-white/20"
            >
              <p className="text-base leading-snug font-semibold">{v.legenda}</p>
            </VideoVertical>
          ))}
        </Trilho>

        <Botao
          href={linkWhatsApp(WHATSAPP, origem, 'Restaurante', RESTAURANTE.pedido)}
          className="mt-8"
        >
          {RESTAURANTE.chamada}
        </Botao>
      </Secao>

      {/* 08 · Localização */}
      <Secao nome="localizacao" rotulo={LOCALIZACAO.rotulo} titulo={LOCALIZACAO.titulo} fundo="mata">
        <p className="mt-4 font-semibold">{LOCALIZACAO.lugar}</p>
        <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-bruma">{LOCALIZACAO.texto}</p>

        <div className="mt-6 overflow-hidden rounded-3xl bg-pedra shadow-xl shadow-black/10 ring-1 ring-linha">
          <iframe
            src={LOCALIZACAO.embed}
            title={`Mapa: ${LOCALIZACAO.lugar}`}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="block aspect-square w-full border-0 sm:aspect-[16/9] lg:aspect-[21/9]"
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Botao href={LOCALIZACAO.rota}>
            <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2" aria-hidden="true">
              <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
              <circle cx="12" cy="9.5" r="2.5" />
            </svg>
            {LOCALIZACAO.chamada}
          </Botao>
          <a
            href={LOCALIZACAO.waze}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-agua underline decoration-agua/30 underline-offset-4 hover:decoration-agua"
          >
            {LOCALIZACAO.chamadaWaze}
          </a>
        </div>
      </Secao>

      {/* 09 · Objeções */}
      <Secao nome="perguntas" rotulo="Antes de decidir" titulo="O que costumam perguntar" fundo="vidro">
        <div className="mt-6 space-y-3">
          {OBJECOES.map((o) => (
            <details
              key={o.pergunta}
              className="group rounded-2xl bg-white/10 px-5 shadow-lg shadow-black/20 ring-1 ring-white/20 ring-inset backdrop-blur-xl transition-colors open:bg-white/15 sm:px-6"
            >
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-semibold sm:text-lg [&::-webkit-details-marker]:hidden">
                {o.pergunta}
                <span
                  aria-hidden="true"
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 text-agua ring-1 ring-white/20 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="max-w-2xl pb-5 text-[15px] leading-relaxed text-bruma">{o.resposta}</p>
            </details>
          ))}
        </div>
      </Secao>

      {/* 10 · Fecho */}
      <Secao nome="fecho" rotulo="Última chamada" fundo="mata">
        <div ref={fechoRef} className="grid items-center gap-8 overflow-hidden tema-escuro rounded-3xl bg-noite p-6 sm:grid-cols-[1fr_220px] sm:p-12 lg:grid-cols-[1fr_260px]">
          <div>
            <h2 className="max-w-xl font-titulo text-4xl leading-[1.05] text-balance sm:text-5xl">
              {FECHO.titulo}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-bruma sm:text-lg">{FECHO.texto}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Botao href={destino('Rope Jump')} {...reservar}>{FECHO.chamada}</Botao>
              <span className="font-rotulo text-xs uppercase tracking-[.16em] text-bruma">
                Outras datas: {EVENTO.outrasDatas}
              </span>
            </div>
          </div>
          <VideoVertical src={FECHO_VIDEO} poster={FECHO_IMAGEM} className="mx-auto w-full max-w-[220px] rotate-2" />
        </div>
      </Secao>

      <footer data-secao="rodape" className="tema-escuro bg-noite">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 pt-10 pb-32 text-sm text-bruma lg:pb-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="font-semibold text-neve">{RODAPE.negocio}</p>
            <p className="mt-1">{RODAPE.local}</p>
          </div>
          <p className="font-rotulo text-[10px] uppercase tracking-[.2em]">{RODAPE.credito}</p>
        </div>
      </footer>
      <BarraReserva
        visivel={visiveis.size === 0}
        href={destino('Rope Jump')}
        {...reservar}
        titulo={BARRA.titulo}
        apoio={BARRA.apoio}
        chamada={BARRA.chamada}
      />
      {pack.aberto && <MontePack inicial={pack.inicial} origem={origem} onFechar={fecharPack} />}
    </main>
  )
}
