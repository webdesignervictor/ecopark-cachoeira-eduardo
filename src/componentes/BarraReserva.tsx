import { Botao } from './Botao'

interface Props {
  visivel: boolean
  href: string
  titulo: string
  apoio: string
  chamada: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
  evento?: string
}

/**
 * Barra de reserva presa na base da tela, na zona do polegar.
 * Some no desktop, onde o botão do topo e o do fecho já bastam.
 */
export function BarraReserva({ visivel, href, titulo, apoio, chamada, onClick, evento }: Props) {
  return (
    <div
      data-local="barra_fixa"
      aria-hidden={!visivel}
      className={`tema-escuro fixed inset-x-0 bottom-0 z-50 bg-noite/95 px-4 pt-3 pb-[max(.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,.18)] backdrop-blur transition-transform duration-300 lg:hidden ${
        visivel ? 'translate-y-0' : 'pointer-events-none translate-y-full'
      }`}
    >
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{titulo}</p>
          <p className="truncate font-rotulo text-[10px] uppercase tracking-[.14em] text-bruma">{apoio}</p>
        </div>
        <Botao href={href} onClick={onClick} evento={evento} tamanho="compacto" tabIndex={visivel ? 0 : -1} className="shrink-0">
          {chamada}
        </Botao>
      </div>
    </div>
  )
}
