/**
 * Todo o texto da página vive aqui. Nenhuma frase é escrita dentro de componente.
 * Para mudar preço, data ou copy, mexa só neste arquivo.
 */

export interface Atividade {
  slug: string
  nome: string
  preco: string
  precoNumero: number
  descricao: string
  destaque?: boolean
  observacao?: string
  /** Vídeo vertical 9:16 do card, em public/videos/. */
  video: string
}

export interface Hospedagem {
  nome: string
  preco: string
  detalhe: string
  video: string
  selo?: string
  destaque?: boolean
}

/** Vídeo vertical 9:16. O pôster é opcional — sem ele, aparece o primeiro quadro. */
export interface Video {
  src: string
  poster?: string
  legenda: string
}

export interface Passo {
  numero: string
  titulo: string
  texto: string
}

export interface Objecao {
  pergunta: string
  resposta: string
}

export const EVENTO = {
  nome: 'Cachoeira do Esmeril',
  local: 'Altinópolis e Patrocínio Paulista · SP',
  distancia: '34 km de Altinópolis',
  data: 'Sábado, 10 de outubro',
  /** Início do primeiro turno, horário de Brasília. É o alvo do contador. */
  inicio: '2026-10-10T09:00:00-03:00',
  dataCurta: '10/10',
  turnos: ['9h às 11h45', '13h às 16h'],
  outrasDatas: '11, 24 e 25 de outubro',
  aviso: 'Vagas limitadas por turno · reserva antecipada',
} as const

export const TOPO = {
  rotulo: 'Sábado, 10 de outubro · Altinópolis-SP',
  titulo: 'Salta, ou fica olhando?',
  subtitulo:
    'Rope Jump na Cachoeira do Esmeril. Dois turnos, vagas limitadas, e um dia que não tem como fazer pela metade.',
  chamada: 'Quero minha vaga',
  apoio: 'Também tem trilha, rede suspensa e cachoeira — para quem prefere ver de baixo.',
} as const

/**
 * Vídeo da hero, vertical 9:16, em loop e sem som. A foto é o pôster enquanto carrega.
 * No celular cobre a hero inteira; no desktop vira um card à direita.
 */
export const TOPO_MIDIA = {
  video: '/videos/hero.mp4',
  foto: '/imagens/topo.jpg',
} as const

export const GALERIA: { rotulo: string; titulo: string; intro: string; videos: Video[] } = {
  rotulo: 'Assista antes de decidir',
  titulo: 'É isso que te espera no sábado',
  intro: 'Vídeos gravados no local. Arraste para o lado.',
  videos: [
    { src: '/videos/galeria-01.mp4', legenda: 'A subida até a plataforma' },
    { src: '/videos/galeria-02.mp4', legenda: 'Conferência do equipamento' },
    { src: '/videos/galeria-03.mp4', legenda: 'Os segundos antes' },
    { src: '/videos/galeria-04.mp4', legenda: 'O salto' },
    { src: '/videos/galeria-05.mp4', legenda: 'O balanço depois' },
    { src: '/videos/galeria-06.mp4', legenda: 'Rede suspensa' },
    { src: '/videos/galeria-07.mp4', legenda: 'Cachoeira da Escondida' },
    { src: '/videos/galeria-08.mp4', legenda: 'Fim de tarde no camping' },
  ],
}

export const FECHO_VIDEO = '/videos/fecho.mp4'

export const PARA_QUEM = {
  titulo: 'Para quem é este sábado',
  sim: [
    'Quem já pensou em saltar e nunca teve a data na mão',
    'Turma de amigos que quer um dia que rende história',
    'Quem quer trilha e cachoeira sem precisar saltar',
    'Casal ou família que vai passar o fim de semana e quer acampar',
  ],
  nao: [
    'Quem procura um parque aquático com estrutura de resort',
    'Quem quer ir a qualquer dia — aqui as datas são marcadas',
    'Quem não tem como chegar até a região de Altinópolis',
  ],
} as const

export const ATIVIDADES: Atividade[] = [
  {
    slug: 'rope-jump',
    video: '/videos/rope-jump.mp4',
    nome: 'Rope Jump',
    preco: 'R$ 200',
    precoNumero: 200,
    descricao:
      'O salto de corda. Equipe, equipamento e conferência de segurança inclusos. Não precisa de experiência — precisa de decisão.',
    destaque: true,
  },
  {
    slug: 'rede-suspensa',
    video: '/videos/rede-suspensa.mp4',
    nome: 'Rede Suspensa',
    preco: 'R$ 70',
    precoNumero: 70,
    descricao: 'Deitar no vão, com a mata embaixo. A foto que todo mundo pede depois.',
  },
  {
    slug: 'cachoeira-escondida',
    video: '/videos/cachoeira-escondida.mp4',
    nome: 'Cachoeira da Escondida',
    preco: 'R$ 50',
    precoNumero: 50,
    descricao: 'Visita guiada à queda mais reservada da propriedade.',
  },
  {
    slug: 'morro-da-mesa',
    video: '/videos/morro-da-mesa.mp4',
    nome: 'Morro da Mesa · 4x4',
    preco: 'R$ 500',
    precoNumero: 500,
    descricao: 'Passeio de 4x4 até o alto do morro.',
    observacao: 'Valor por veículo, até 4 pessoas',
  },
]

export const VISITACAO = {
  nome: 'Taxa de visitação',
  preco: 'R$ 20',
  descricao:
    'Entrada no espaço, sem atividades. Dá acesso à área, ao restaurante e às cachoeiras abertas à visitação.',
} as const

export const HOSPEDAGEM_SECAO = {
  rotulo: 'Fica o fim de semana',
  titulo: 'Acampe ou durma no chalé',
  intro: 'Quem dorme no local não pega estrada no sábado cedo e já está lá para o turno da manhã.',
  chamada: 'Reservar',
  /** Abertura da mensagem do WhatsApp quando o clique vem de um card de hospedagem. */
  pedido: 'Quero reservar hospedagem para o fim de semana do dia 10/10',
} as const

export const HOSPEDAGEM: Hospedagem[] = [
  {
    nome: 'Camping · diária',
    preco: 'R$ 50',
    detalhe: 'Por pessoa, de sábado a domingo',
    video: '/videos/camping.mp4',
  },
  {
    nome: 'Camping · fim de semana',
    preco: 'R$ 70',
    detalhe: 'Por pessoa, de sexta a domingo',
    video: '/videos/camping-fds.mp4',
    selo: 'Sexta a domingo',
  },
  {
    nome: 'Chalé casal',
    preco: 'R$ 350',
    detalhe: 'O casal, de sexta a domingo',
    video: '/videos/chale.mp4',
    selo: 'Para casal',
    destaque: true,
  },
]

export const HOSPEDAGEM_NOTA = 'Taxa de visitação já inclusa na hospedagem.'

export const RESTAURANTE = {
  rotulo: 'Restaurante no local',
  titulo: 'Depois do salto, a mesa está pronta',
  texto:
    'Aberto sábado e domingo, com pratos feitos na hora, porções, lanches e bebida gelada. Não precisa estar hospedado nem fazer atividade para comer aqui.',
  destaques: [
    'Aberto sábado e domingo',
    'Pratos feitos na hora',
    'Porções e lanches',
    'Bebida gelada',
    'Aberto a quem só vem visitar',
  ],
  videos: [
    { src: '/videos/restaurante.mp4', legenda: 'O restaurante' },
    { src: '/videos/restaurante-pratos.mp4', legenda: 'Pratos feitos na hora' },
    { src: '/videos/restaurante-porcoes.mp4', legenda: 'Porções e lanches' },
    { src: '/videos/restaurante-bebidas.mp4', legenda: 'Bebida gelada' },
  ] satisfies Video[] as Video[],
  chamada: 'Falar com o restaurante',
  pedido: 'Quero saber do restaurante no fim de semana do dia 10/10',
}

export interface Avaliacao {
  texto: string
  /** 1 a 5. */
  nota: number
  /** Nome como aparece no Google. Vazio = mostra só "Avaliação no Google". */
  autor?: string
}

/**
 * Avaliações reais do perfil "Cachoeira do Esmeril Camping Vale dos Sonhos" no Google Maps,
 * copiadas sem edição. Nota e total conferidos em 27/09/2026 — atualize quando mudar.
 */
export const AVALIACOES = {
  rotulo: 'Quem já foi',
  titulo: 'O que dizem no Google',
  nota: '4,7',
  total: 151,
  link: 'https://search.google.com/local/reviews?placeid=ChIJN-0GARVbt5QRxAeYyWQsTII',
  chamada: 'Ver todas no Google',
  lista: [
    { nota: 5, texto: 'Lugar top de mais, natureza exuberante um ótimo passeio com a família!' },
    { nota: 5, texto: 'Pessoal nota mil, comida deliciosa e com preço acessível.' },
    { nota: 5, texto: 'O restaurante prato feito muito saboroso e o lanche AMAMOS.' },
  ] satisfies Avaliacao[] as Avaliacao[],
}

export const LOCALIZACAO = {
  rotulo: 'Onde fica',
  titulo: 'Como chegar',
  lugar: 'Cachoeira do Esmeril · Camping Vale dos Sonhos',
  texto: 'A 34 km de Altinópolis-SP. Depois da reserva, a gente manda o horário de chegada e o que levar.',
  chamada: 'Traçar rota',
  embed:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3728.9268835153134!2d-47.3140229!3d-20.834658800000003!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94b75b150106ed37%3A0x824c2c64c99807c4!2sCachoeira%20do%20Esmeril%20Camping%20Vale%20dos%20Sonhos!5e0!3m2!1spt-BR!2sbr!4v1790474325769!5m2!1spt-BR!2sbr',
  /** Abre o app do Google Maps no celular já com o destino. */
  rota: 'https://www.google.com/maps/dir/?api=1&destination=-20.8346588,-47.3140229',
} as const

export const COMO_FUNCIONA: Passo[] = [
  {
    numero: '01',
    titulo: 'Escolha o turno',
    texto: 'Manhã, das 9h às 11h45, ou tarde, das 13h às 16h. Cada turno tem número limitado de vagas.',
  },
  {
    numero: '02',
    titulo: 'Reserve pelo WhatsApp',
    texto: 'Chama a gente, diz o turno e quantas pessoas. Seu nome entra na lista daquele horário.',
  },
  {
    numero: '03',
    titulo: 'Apareça no sábado',
    texto: 'A gente manda o endereço, o horário de chegada e o que levar. É só chegar.',
  },
]

export const OBJECOES: Objecao[] = [
  {
    pergunta: 'Nunca fiz nada parecido. Consigo?',
    resposta:
      'O Rope Jump não exige experiência nem preparo físico. A equipe faz a conferência de equipamento e explica tudo antes. A parte difícil é decidir pular.',
  },
  {
    pergunta: 'E se eu não quiser saltar?',
    resposta:
      'O dia funciona sem o salto. Tem a taxa de visitação de R$ 20, a rede suspensa, a visita à Cachoeira da Escondida, o passeio de 4x4 e o restaurante.',
  },
  {
    pergunta: 'Posso ir só passar o dia?',
    resposta:
      'Pode. A hospedagem é opcional e a taxa de visitação dá acesso à área e ao restaurante, sem precisar fazer atividade nenhuma.',
  },
  {
    pergunta: 'Não consigo nesta data.',
    resposta:
      'Ainda tem 11, 24 e 25 de outubro. Fala com a gente que a reserva é para a data que funcionar para você.',
  },
]

/** Barra fixa na base da tela do celular, que aparece depois do topo. */
export const BARRA = {
  titulo: 'Rope Jump · R$ 200',
  apoio: '10/10 · vagas limitadas',
  chamada: 'Reservar',
} as const

export const CONTADOR = {
  rotulo: 'Faltam para o salto',
  chegou: 'É hoje. Chama no WhatsApp para ver se ainda tem vaga.',
} as const

export const FECHO = {
  titulo: 'A data é sábado. A vaga é por turno.',
  texto:
    'Quando encher, encheu — e a próxima é só daqui a duas semanas. Se você já sabe que quer, garante agora.',
  chamada: 'Garantir minha vaga',
} as const

/** Número do WhatsApp em formato internacional, só dígitos. */
export const WHATSAPP = '[PREENCHER]'

/** Link de checkout, se um dia houver. Vazio = botão cai no WhatsApp. */
export const LINK_PAGAMENTO = ''

export const RODAPE = {
  negocio: 'Cachoeira do Esmeril',
  local: 'Altinópolis e Patrocínio Paulista · SP',
  credito: 'Página por Victtor Growth Systems',
} as const
