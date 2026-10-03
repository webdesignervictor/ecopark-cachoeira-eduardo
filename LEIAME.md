# Landing page — Evento 10/10 · Cachoeira do Esmeril

Vite + React 19 + TypeScript estrito + Tailwind v4. Página única.

## Antes de publicar — obrigatório

Tudo em `src/dados/`:

| Arquivo | Campo | O que falta |
|---|---|---|
| `evento.ts` | `WHATSAPP` | ✅ Preenchido: `5511942532086` (Eduardo). Formato internacional, só dígitos. |
| `evento.ts` | `LINK_PAGAMENTO` | Opcional. Link de checkout, se um dia houver. Vazio = o botão cai no WhatsApp (a reserva não exige sinal). |
| `pixel.ts` | `PIXEL_META` | ✅ Preenchido: `1570101697673660`. Eventos: PageView, InitiateCheckout (abriu o pack), Lead com valor em R$ (enviou o pack), Contact (clicou no WhatsApp). |
| `.env` (ou Vercel) | `VITE_SITE_URL` | Endereço do site sem barra no final. Vai nas tags de compartilhamento (prévia no WhatsApp), no canonical, nos dados de Evento do Google e gera o `sitemap.xml`. Vazio = tags relativas e sem sitemap. |
| `medicao.ts` | `GA4_ID`, `CLARITY_ID` | Opcionais. Google Analytics 4 e Microsoft Clarity (gravação de sessões e mapa de calor). Vazio = não carrega. |
| Vercel | `DATABASE_URL` | Conexão do Postgres onde as ações ficam gravadas. Sem ela a página funciona, mas nada é guardado. Ver "Banco de medição". |

## Imagens

Hero, **vertical 9:16**, em loop e sem som. No celular cobre a hero inteira; no desktop vira um card à direita.

- `public/videos/hero.mp4` — já comprimido: H.264, 540×960, 24 fps, sem áudio, 5,5 MB (original HEVC de 55 MB guardado em `_to_delete/originais/`).
- `public/imagens/topo.jpg` — primeiro quadro do vídeo. Pôster enquanto carrega e imagem fixa para quem tem "reduzir movimento" ligado.

Para trocar o vídeo, comprimir assim antes (HEVC não toca no Chrome/Firefox):

```bash
ffmpeg -i ORIGINAL.mp4 -an -vf "scale=540:960:flags=lanczos,fps=24" -c:v libx264 -preset slow -crf 32 \
  -profile:v high -pix_fmt yuv420p -movflags +faststart public/videos/hero.mp4
ffmpeg -y -i public/videos/hero.mp4 -frames:v 1 -q:v 5 public/imagens/topo.jpg
```

## Vídeos (verticais 9:16)

Todos em `public/videos/`. Enquanto o arquivo não existe, o card mostra o nome esperado.
Tocam mudos e em loop quando aparecem na tela; o botão no canto liga o som.
Use MP4 (H.264), 1080×1920 ou 720×1280, de 5 a 15 s, idealmente abaixo de 4 MB cada.

| Onde | Arquivos |
|---|---|
| Galeria | `galeria-01.mp4` … `galeria-08.mp4` |
| Atividades | `rope-jump.mp4`, `rede-suspensa.mp4`, `cachoeira-escondida.mp4`, `morro-da-mesa.mp4` |
| Hospedagem | `camping.mp4`, `camping-fds.mp4`, `chale.mp4` |
| Restaurante | `restaurante.mp4`, `restaurante-pratos.mp4`, `restaurante-porcoes.mp4`, `restaurante-bebidas.mp4` |
| Fecho | `fecho.mp4` |

Legendas e caminhos ficam em `src/dados/evento.ts`.

## Medição

`src/dados/rastreio.ts` captura a UTM na chegada, guarda na sessão e embute a origem
na mensagem do WhatsApp. Quem atende vê de onde a pessoa veio sem perguntar.

Links a usar nas campanhas:

```
?utm_source=instagram&utm_campaign=evento1010&utm_content=bio
?utm_source=instagram&utm_campaign=evento1010&utm_content=stories
?utm_source=meta&utm_campaign=evento1010&utm_content=retargeting
?utm_source=meta&utm_campaign=evento1010&utm_content=frio
```

### O que é rastreado

Tudo passa por `rastrear()` em `src/dados/medicao.ts` e vai para o nosso banco e para as
ferramentas com ID preenchido. Em `npm run dev` cada ação aparece no console como `[medição]`
(e nada é enviado ao banco).

| Ação | Quando |
|---|---|
| `pagina_aberta` | Abriu a página |
| `secao_vista` | Metade de uma seção apareceu na tela (uma vez por seção) |
| `tempo_secao` | Saiu de uma seção: segundos que ela ficou no meio da tela (pausa com a aba escondida) |
| `rolagem` | Passou de 25, 50, 75 e 90% da página |
| `clique_whatsapp` / `clique_hospedagem` | Clicou para reservar — com a seção de onde clicou |
| `clique_rota_google` / `clique_rota_waze` / `clique_avaliacoes_google` | Links de rota e avaliações |
| `pergunta_aberta` | Abriu uma pergunta frequente |
| `video_assistido` | Segundos que cada vídeo tocou, e se estava com som |
| `video_som_ligado` / `video_som_desligado` | Mexeu no som de um vídeo |
| `galeria_arrastada` / `galeria_seta` | Arrastou uma galeria ou usou as setas |
| `avaliacao_tocada` | Tocou num card de avaliação |
| `mapa_interacao` | Mexeu no mapa |
| `texto_copiado` | Copiou texto (preço, endereço…) |
| `clique_frustrado` | 3+ toques no mesmo elemento em menos de 1 s (algo parece clicável e não é) |
| `erro_js` | Erro de JavaScript no aparelho da pessoa |
| `desempenho` | Velocidade real: TTFB, FCP, LCP e CLS |
| `resumo_visita` | Ao sair: tempo visível, tempo total, rolagem máxima, seções vistas, cliques |

Por visita também ficam: origem (UTM), aparelho (fabricante, modelo, sistema e versão,
navegador e versão, app — Instagram, Facebook…), tela, cidade/estado (pelo Vercel; o IP não é
guardado), internet (4g…), hora local, se é a 1ª visita daquele aparelho, entre outros.
No iPhone o modelo é estimado pela tela (`modelo_estimado = true`), exceto dentro do
Instagram/Facebook, onde vem exato.

Seção nova precisa de `nome` no `<Secao>` — é o nome que aparece nos relatórios.

### Banco de medição

Postgres. Função de recebimento em `api/eventos.ts`; esquema e análises prontas em `banco/schema.sql`.

1. Criar o banco — o mais simples é no próprio Vercel: projeto → **Storage** → **Neon (Postgres)**.
   Ele já cria a variável `DATABASE_URL`. (Supabase também serve: usar a string do "pooler".)
2. Abrir o editor SQL do provedor e rodar `banco/schema.sql` inteiro (pode rodar de novo quando mudar).
3. Publicar de novo. Pronto — as visitas começam a entrar.

Visões prontas para consultar: `resumo_secoes` (pessoas e tempo médio por seção),
`tempo_por_secao` (por visita), `visitas` (resumo de cada visita e se chamou no WhatsApp),
`funil_por_origem`, `videos`, `aparelhos`.

**LGPD:** nenhum dado pessoal é gravado (nome, telefone, IP), mas há um identificador anônimo
guardado no aparelho. Se a página for usar Pixel/GA4/Clarity em campanha, o recomendado é ter
um aviso de cookies com consentimento.

## Monte seu pack

Os botões de reserva (topo, atividades, fecho, barra fixa e "Reservar" da hospedagem) abrem o painel
"Monte o seu sábado" (`src/componentes/MontePack.tsx`): a pessoa marca de 1 serviço a todos, escolhe
pessoas e turno, vê o total estimado e envia o pack escrito no WhatsApp.

- Preços e forma de cobrança vêm de `ATIVIDADES`, `HOSPEDAGEM` e `VISITACAO` (`precoNumero` e `cobranca`:
  por pessoa, por veículo de até 4, ou pelo casal). Textos do painel em `PACK`.
- Hospedagem é uma só; com hospedagem, a visitação aparece como inclusa.
- Se `LINK_PAGAMENTO` for preenchido, os botões vão direto para o checkout.
- Medição: `pack_aberto`, `pack_item`, `pack_todas`, `pack_enviado` (itens, pessoas, total) e `clique_whatsapp`.

## SEO e ícones

`index.html`: título, descrição, canonical, prévia de compartilhamento (`imagens/compartilhar.jpg`, 1200×630)
e dados estruturados de Evento (data, local, preço) — manter em sincronia com `evento.ts`.
Ícones em `public/`: `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `icone-512.png`, `site.webmanifest`.
`robots.txt` e `sitemap.xml` são gerados no build (`vite.config.ts`).

## Rodar

```bash
npm run dev      # desenvolvimento
npm run build    # produção
```

**Atenção:** o build falha ao esvaziar `dist` nesta máquina.
Antes de cada build: `mv dist "_to_delete/dist-$(date +%Y%m%d-%H%M%S)"`

## Conteúdo

Todo o texto vive em `src/dados/evento.ts`. Nenhuma frase é escrita dentro de componente —
para mudar preço, data ou copy, mexa só nesse arquivo.

Estrutura da página, na ordem: promessa · para quem é · como funciona ·
atividades e preços · hospedagem e restaurante · objeções · fecho.

## O que ainda não foi confirmado com o cliente

- Quantas vagas por turno (a página diz "limitadas por turno", sem número)
- Capacidade real do Rope Jump por turno
- Altura do salto e se há restrição de idade ou peso
