/**
 * AGENDA DO EVENTO — o único lugar onde datas e horários são escritos.
 *
 * Para um novo evento, troque só a lista `datas` (e `turnos`, se mudarem).
 * Dia da semana, "10/10", "10 de outubro", horários, contador, SEO (título, descrição, dados do Google)
 * e as mensagens do WhatsApp saem daqui.
 *
 * Automático: a data principal é sempre a primeira da lista que ainda não terminou. Passou o último
 * turno do dia 10, a página vira para o dia 11 sozinha; as demais viram "outras datas".
 * Não importa nada do navegador: o vite.config.ts também lê este arquivo para o index.html.
 */

/** Horários no formato 24h `HH:MM`: [início, fim]. */
type Turno = readonly [string, string]

export interface DataEvento {
  /** Dia, no formato AAAA-MM-DD. */
  dia: string
  /** Só se este dia tiver horários diferentes dos `turnos` padrão. */
  turnos?: readonly Turno[]
}

export const AGENDA = {
  /** Fuso de Brasília. Os horários abaixo são sempre neste fuso. */
  fuso: '-03:00',
  /** Horários de todos os dias, salvo os que trouxerem `turnos` próprios. */
  turnos: [
    ['09:00', '11:45'],
    ['13:00', '16:00'],
  ] as readonly Turno[],
  /** Em ordem de data. Pode deixar as passadas: são ignoradas. */
  datas: [
    { dia: '2026-10-10' },
    { dia: '2026-10-11' },
    { dia: '2026-10-24' },
    { dia: '2026-10-25' },
  ] as readonly DataEvento[],
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

/** `2026-10-10` → [2026, 10, 10]. */
const partes = (dia: string) => dia.split('-').map(Number) as [number, number, number]

/** Dia da semana (0 = domingo) de uma data AAAA-MM-DD, sem depender do fuso de quem abre a página. */
function diaDaSemana(dia: string, deslocamento = 0): number {
  const [a, m, d] = partes(dia)
  return (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + deslocamento + 7) % 7
}

/** `09:00` → `9h`; `11:45` → `11h45`. */
function hora(hhmm: string): string {
  const [h, m] = hhmm.split(':')
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`
}

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** ['a','b','c'] → 'a, b e c'. */
function lista(itens: string[]): string {
  return itens.length < 2 ? (itens[0] ?? '') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`
}

/** ['2026-10-11','2026-10-24'] → '11 e 24 de outubro'. Meses diferentes: '30 de outubro e 5 de novembro'. */
function listaDeDatas(dias: string[]): string {
  const grupos: { mes: number; dias: number[] }[] = []
  for (const dia of dias) {
    const [, m, d] = partes(dia)
    const g = grupos[grupos.length - 1]
    if (g && g.mes === m) g.dias.push(d)
    else grupos.push({ mes: m, dias: [d] })
  }
  return lista(grupos.map((g) => `${lista(g.dias.map(String))} de ${MESES[g.mes - 1]}`))
}

const turnosDe = (d: DataEvento) => d.turnos ?? AGENDA.turnos
const instante = (dia: string, hhmm: string) => `${dia}T${hhmm}:00${AGENDA.fuso}`
/** Fim do dia = fim do último turno. */
const fimDoDia = (d: DataEvento) => instante(d.dia, turnosDe(d)[turnosDe(d).length - 1][1])

/** Tudo o que a página mostra sobre as datas, calculado para o momento `agora`. */
export function calcularAgenda(agora: Date = new Date()) {
  const futuras = AGENDA.datas.filter((d) => new Date(fimDoDia(d)).getTime() > agora.getTime())
  // Se tudo já passou, mantém a última data para a página não ficar vazia até alguém atualizar a lista.
  const principal = futuras[0] ?? AGENDA.datas[AGENDA.datas.length - 1]
  const outras = futuras.slice(1)
  const turnos = turnosDe(principal)
  const [, mes, dia] = partes(principal.dia)
  const diaSemana = SEMANA[diaDaSemana(principal.dia)]
  const dataExtensa = `${dia} de ${MESES[mes - 1]}`
  const intervalos = turnos.map(([i, f]) => `${hora(i)} às ${hora(f)}`)

  return {
    /** 'sábado' */
    diaSemana,
    /** 'sexta' (o dia antes) e 'domingo' (o dia depois): para as diárias da hospedagem. */
    diaAntes: SEMANA[diaDaSemana(principal.dia, -1)],
    diaDepois: SEMANA[diaDaSemana(principal.dia, 1)],
    /** '10 de outubro' */
    dataExtensa,
    /** 'Sábado, 10 de outubro' */
    dataCompleta: `${maiuscula(diaSemana)}, ${dataExtensa}`,
    /** '10/10' */
    dataCurta: `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`,
    /** ISO com fuso: alvo do contador e dado do Google. */
    inicio: instante(principal.dia, turnos[0][0]),
    fim: fimDoDia(principal),
    /** ['9h às 11h45', '13h às 16h'] */
    turnos: intervalos,
    /** 'das 9h às 11h45 e 13h às 16h' */
    turnosTexto: `das ${lista(intervalos)}`,
    /** '11, 24 e 25 de outubro'; vazio quando não há mais datas. */
    outrasDatas: listaDeDatas(outras.map((d) => d.dia)),
    temOutrasDatas: outras.length > 0,
  }
}

/** Agenda no instante em que a página abriu. */
export const DATA = calcularAgenda()
