-- Banco de medição da landing page (Postgres: Neon, Supabase ou qualquer outro).
-- Rodar uma vez no editor SQL do provedor. Pode rodar de novo sem estragar nada.

-- Uma linha por aba aberta: de onde veio, em que aparelho, de que cidade.
create table if not exists sessoes (
  id               uuid primary key,
  visitante        uuid not null,           -- anônimo, guardado no aparelho; repete quando a pessoa volta
  inicio           timestamptz not null default now(),
  pagina           text,

  origem           text,                    -- utm_source ou site de onde veio (instagram, meta, direto…)
  campanha         text,                    -- utm_campaign
  conteudo         text,                    -- utm_content

  tipo_dispositivo text,                    -- celular | tablet | computador
  fabricante       text,                    -- Samsung, Apple, Motorola…
  modelo           text,                    -- SM-S918B, "iPhone 14 Pro / 15 / 15 Pro / 16"…
  modelo_estimado  boolean default false,   -- true no iPhone (estimado pela tela)
  sistema          text,                    -- Android, iOS, Windows…
  versao_sistema   text,
  navegador        text,
  versao_navegador text,
  app              text,                    -- navegador interno: Instagram, Facebook, WhatsApp, TikTok
  tela             text,                    -- 393x852@3
  idioma           text,
  user_agent       text,

  cidade           text,                    -- vem do Vercel pelo IP; o IP em si não é guardado
  estado           text,
  pais             text,

  referencia       text,                    -- página de onde clicou (vazio = app, digitado…)
  fuso             text,
  hora_local       smallint,                -- 0–23, na hora da pessoa
  dia_semana       smallint,                -- 0 = domingo
  conexao          text,                    -- 4g, 3g… (não vem no iPhone)
  velocidade_mbps  real,
  economia_dados   boolean,
  memoria_gb       real,
  nucleos          smallint,
  tema_escuro      boolean,
  reduzir_movimento boolean,
  janela           text,                    -- tamanho da área visível
  visita_numero    integer,                 -- 1 = primeira vez deste aparelho
  dias_desde_primeira integer
);

-- Para bancos criados antes destas colunas existirem.
alter table sessoes add column if not exists referencia text;
alter table sessoes add column if not exists fuso text;
alter table sessoes add column if not exists hora_local smallint;
alter table sessoes add column if not exists dia_semana smallint;
alter table sessoes add column if not exists conexao text;
alter table sessoes add column if not exists velocidade_mbps real;
alter table sessoes add column if not exists economia_dados boolean;
alter table sessoes add column if not exists memoria_gb real;
alter table sessoes add column if not exists nucleos smallint;
alter table sessoes add column if not exists tema_escuro boolean;
alter table sessoes add column if not exists reduzir_movimento boolean;
alter table sessoes add column if not exists janela text;
alter table sessoes add column if not exists visita_numero integer;
alter table sessoes add column if not exists dias_desde_primeira integer;

-- Uma linha por ação: clique, seção vista, tempo em seção, rolagem, pergunta aberta…
create table if not exists eventos (
  id        bigserial primary key,
  sessao    uuid not null references sessoes (id) on delete cascade,
  quando    timestamptz not null,           -- hora no aparelho da pessoa
  recebido  timestamptz not null default now(),
  nome      text not null,                  -- clique_whatsapp, tempo_secao, secao_vista…
  secao     text,                           -- topo, avaliacoes, atividades… (quando houver)
  segundos  integer,                        -- só em tempo_secao
  dados     jsonb not null default '{}'     -- o resto do que veio com a ação
);

create index if not exists eventos_nome_idx   on eventos (nome);
create index if not exists eventos_sessao_idx on eventos (sessao);
create index if not exists eventos_quando_idx on eventos (quando);
create index if not exists sessoes_inicio_idx on sessoes (inicio);

-- Tempo em cada seção, somado por sessão (uma pessoa pode passar pela mesma seção mais de uma vez).
create or replace view tempo_por_secao as
select s.id as sessao, s.visitante, s.origem, s.modelo, s.sistema, e.secao,
       sum(e.segundos) as segundos
from eventos e
join sessoes s on s.id = e.sessao
where e.nome = 'tempo_secao'
group by s.id, s.visitante, s.origem, s.modelo, s.sistema, e.secao;

-- Resumo por seção: quantas pessoas viram e tempo médio / mediano.
create or replace view resumo_secoes as
select secao,
       count(distinct sessao)                                   as pessoas,
       round(avg(segundos))                                      as segundos_media,
       percentile_cont(0.5) within group (order by segundos)     as segundos_mediana
from tempo_por_secao
group by secao
order by pessoas desc;

-- Funil por origem: visitas e quantas clicaram no WhatsApp.
create or replace view funil_por_origem as
select s.origem,
       count(distinct s.id) as visitas,
       count(distinct s.id) filter (where e.nome in ('clique_whatsapp', 'clique_hospedagem')) as cliques_whatsapp
from sessoes s
left join eventos e on e.sessao = s.id
group by s.origem
order by visitas desc;

-- Resumo final de cada visita (o último resumo_visita enviado por sessão).
create or replace view visitas as
select distinct on (e.sessao)
       e.sessao, s.visitante, s.inicio, s.origem, s.campanha, s.modelo, s.sistema, s.app, s.cidade,
       s.visita_numero,
       (e.dados->>'segundos_visivel')::int as segundos_visivel,
       (e.dados->>'rolagem_max')::int      as rolagem_max,
       (e.dados->>'secoes_vistas')::int    as secoes_vistas,
       (e.dados->>'cliques')::int          as cliques,
       exists (select 1 from eventos w where w.sessao = e.sessao and w.nome in ('clique_whatsapp', 'clique_hospedagem')) as chamou_whatsapp
from eventos e
join sessoes s on s.id = e.sessao
where e.nome = 'resumo_visita'
order by e.sessao, e.quando desc;

-- Vídeos: quantas pessoas assistiram e por quanto tempo.
create or replace view videos as
select dados->>'video' as video, secao,
       count(distinct sessao) as pessoas,
       sum(segundos)          as segundos_total,
       round(avg(segundos))   as segundos_media,
       count(*) filter (where (dados->>'com_som')::int = 1) as vezes_com_som
from eventos
where nome = 'video_assistido'
group by 1, 2
order by pessoas desc;

-- Aparelhos mais comuns.
create or replace view aparelhos as
select tipo_dispositivo, fabricante, modelo, sistema, versao_sistema, app, count(*) as sessoes
from sessoes
group by 1, 2, 3, 4, 5, 6
order by sessoes desc;
