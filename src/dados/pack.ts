/**
 * Regras de preço do Monte seu pack — usadas pela página (MontePack) e pelo servidor (api/pagamento),
 * para o total cobrado ser exatamente o que a pessoa viu. O servidor nunca confia no total que vem da página.
 */
import { ATIVIDADES, HOSPEDAGEM, VISITACAO, idHospedagem } from './evento'

export type Cobranca = 'pessoa' | 'veiculo' | 'casal'

export interface ItemPack {
  id: string
  grupo: 'atividade' | 'hospedagem' | 'entrada'
  nome: string
  preco: number
  cobranca: Cobranca
}

export const ITENS_PACK: ItemPack[] = [
  ...ATIVIDADES.map((a): ItemPack => ({
    id: a.slug, grupo: 'atividade', nome: a.nome, preco: a.precoNumero, cobranca: a.cobranca ?? 'pessoa',
  })),
  ...HOSPEDAGEM.map((h): ItemPack => ({
    id: idHospedagem(h.nome), grupo: 'hospedagem', nome: h.nome, preco: h.precoNumero, cobranca: h.cobranca,
  })),
  { id: 'visitacao', grupo: 'entrada', nome: VISITACAO.nome, preco: VISITACAO.precoNumero, cobranca: 'pessoa' },
]

export const PESSOAS_MAX = 30

/** Quantas unidades cobrar: pessoas, veículos de até 4 ou casais/chalés de até 2. */
export function unidades(cobranca: Cobranca, pessoas: number) {
  if (cobranca === 'veiculo') return Math.ceil(pessoas / 4)
  if (cobranca === 'casal') return Math.ceil(pessoas / 2)
  return pessoas
}

export function rotuloUnidades(cobranca: Cobranca, n: number) {
  if (cobranca === 'veiculo') return n === 1 ? '1 veículo' : `${n} veículos`
  if (cobranca === 'casal') return n === 1 ? '1 unidade' : `${n} unidades`
  return n === 1 ? '1 pessoa' : `${n} pessoas`
}

export interface LinhaPack extends ItemPack {
  n: number
  subtotal: number
}

/**
 * Calcula o pack a partir dos ids marcados. Ids desconhecidos são ignorados; só uma hospedagem vale;
 * a visitação entra sempre, a não ser com hospedagem (que já a inclui).
 */
export function calcularPack(ids: Iterable<string>, pessoas: number) {
  const marcados = new Set(ids)
  const p = Math.min(PESSOAS_MAX, Math.max(1, Math.floor(pessoas) || 1))
  const hospedagem = ITENS_PACK.find((i) => i.grupo === 'hospedagem' && marcados.has(i.id))
  const linhas: LinhaPack[] = ITENS_PACK.filter((i) =>
    i.grupo === 'entrada' ? !hospedagem : i.grupo === 'hospedagem' ? i === hospedagem : marcados.has(i.id),
  ).map((i) => {
    const n = unidades(i.cobranca, p)
    return { ...i, n, subtotal: i.preco * n }
  })
  return {
    pessoas: p,
    temHospedagem: Boolean(hospedagem),
    linhas,
    total: linhas.reduce((s, l) => s + l.subtotal, 0),
  }
}
