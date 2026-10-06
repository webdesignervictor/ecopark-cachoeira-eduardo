# Especificação de criativos — Landing page Evento 10/10 · Cachoeira do Esmeril

Todos os espaços de mídia da página são **verticais 9:16**. Um único formato de entrega serve para todos.

## Formato de entrega (vale para todos os vídeos)

| Item | Especificação |
|---|---|
| Proporção | **9:16 vertical** |
| Resolução | **1080 × 1920 px** (mínimo 720 × 1280) |
| Formato | **MP4, codec H.264** (não usar HEVC/H.265: não toca no Chrome) |
| Duração | 5 a 15 s, pensado para **loop** (fim emenda no começo) |
| Peso | Até **4 MB** por arquivo (a hero pode ir até 6 MB) |
| Áudio | Opcional. Todos começam **mudos**; nos cards a pessoa pode ligar o som. A hero nunca toca som. |
| Texto no vídeo | **Evitar.** A página já escreve título, preço e legenda por cima (ver áreas seguras). |

Os arquivos são nomeados exatamente como na lista do fim. O nome é o que liga o vídeo ao lugar certo.

## Onde cada vídeo aparece e em que tamanho

Tamanho de exibição em pixels de tela (o arquivo em 1080 × 1920 cobre com folga, inclusive em telas de alta densidade).

| Espaço | Celular (≈390 px de largura) | Computador | Observações |
|---|---|---|---|
| **Hero** (topo da página) | Tela inteira, ≈390 × 740 | Card 9:16 à direita, ≈330 × 590 | No celular o vídeo cobre a tela e **corta um pouco das laterais** (~9% de cada lado). Borda laranja e cantos arredondados (24 px) no computador. |
| **Galeria** (8 vídeos) | Card ≈265 × 471, carrossel lateral | Card 280 × 498, carrossel | Legenda curta embaixo. |
| **Atividades** (4 vídeos) | Card ≈265 × 471, carrossel | 4 colunas, ≈260 × 462 | Nome, preço e descrição sobre o vídeo. O Rope Jump tem contorno laranja de destaque. |
| **Hospedagem** (3 vídeos) | Card ≈265 × 471, carrossel | 3 colunas, ≈352 × 626 | Nome, preço, detalhe e botão "Reservar" sobre o vídeo. |
| **Restaurante** (4 vídeos) | Card ≈265 × 471, carrossel | 4 colunas, ≈260 × 462 | Legenda curta embaixo. |
| **Fecho** (1 vídeo) | 220 × 391 | 220 × 391 | Levemente inclinado (2°), ao lado da chamada final. |

Todos os cards têm **cantos arredondados de 16 px**: nada importante encostado nos cantos.

## Áreas seguras (onde não pôr o assunto principal)

**Cards (galeria, atividades, hospedagem, restaurante)**
- **40% de baixo:** coberto por um degradê escuro com o texto da página (nome, preço, descrição, botão). Deixe esse terço inferior mais "calmo" (céu, água, mata) e o assunto principal (pessoa, salto, prato) **no meio ou no terço de cima**.
- **Canto superior direito, ≈150 × 150 px no arquivo 1080 × 1920:** botão de som. Não colocar rosto nem detalhe ali.

**Hero no celular**
- **Metade de baixo:** coberta pelo título grande, subtítulo e botão "Quero minha vaga", sobre um degradê escuro.
- Assunto principal na **metade de cima e no centro**, longe das laterais (que são cortadas).

**Hero no computador**
- Vira um card inteiro sem texto por cima: o quadro todo aparece.

## Primeiro quadro

O primeiro quadro de cada vídeo aparece enquanto ele carrega, e fica fixo para quem desativou animações no celular. Ele deve funcionar sozinho como foto: nada de começar com tela preta, fade ou logo.

Para a hero, mandar também esse quadro como **JPG 1080 × 1920** (`topo.jpg`). Ele é a primeira coisa que carrega na página. Também é usado, desfocado, como fundo das seções escuras.

## Imagem de compartilhamento (falta)

Quando o link é enviado no WhatsApp ou no Instagram, aparece uma prévia. Hoje não há imagem para ela.

| Item | Especificação |
|---|---|
| Tamanho | **1200 × 630 px**, JPG, até 300 KB |
| Conteúdo | Foto forte do salto ou da cachoeira + "Rope Jump · 10/10" legível em tamanho pequeno |
| Área segura | Texto dentro do **centro 1000 × 500**: o WhatsApp corta as bordas em alguns aparelhos |
| Nome | `compartilhar.jpg` |

## Lista de arquivos

| Pasta | Arquivos |
|---|---|
| `videos/` | `hero-2.mp4` · `galeria-01.mp4` … `galeria-08.mp4` · `rope-jump.mp4` · `rede-suspensa.mp4` · `cachoeira-escondida.mp4` · `morro-da-mesa.mp4` · `camping.mp4` · `camping-fds.mp4` · `chale.mp4` · `restaurante.mp4` · `restaurante-pratos.mp4` · `restaurante-porcoes.mp4` · `restaurante-bebidas.mp4` · `fecho.mp4` |
| `imagens/` | `topo.jpg` (primeiro quadro da hero) · `compartilhar.jpg` |

**Total: 20 vídeos e 2 imagens.**

Legendas atuais de cada vídeo, para o roteiro:

- **Galeria:** 01 A subida até a plataforma · 02 Conferência do equipamento · 03 Os segundos antes · 04 O salto · 05 O balanço depois · 06 Rede suspensa · 07 Cachoeira da Escondida · 08 Fim de tarde no camping
- **Atividades:** Rope Jump · Rede Suspensa · Cachoeira da Escondida · Morro da Mesa (4x4)
- **Hospedagem:** Camping diária · Camping fim de semana · Chalé casal
- **Restaurante:** O restaurante · Pratos feitos na hora · Porções e lanches · Bebida gelada

## Cores da página (para os criativos conversarem com ela)

| Uso | Cor |
|---|---|
| Laranja (botões, destaques) | `#E8590C` |
| Verde-floresta (detalhes) | `#1F6B45` |
| Verde-noite (seções escuras) | `#0F2118` |
| Areia (fundo claro alternado) | `#F5F1E6` |
| Texto | `#13281C` |

Fontes: **Instrument Serif** (títulos grandes), **Figtree** (texto), **JetBrains Mono** (rótulos pequenos em caixa alta).
