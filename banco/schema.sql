-- Banco de medição da landing page (Postgres: Neon, Supabase ou qualquer outro).
-- Rodar inteiro no editor SQL do provedor, com o usuário dono do banco.
-- Pode rodar de novo sem estragar nada. Depois, rodar banco/acessos.sql.
--
-- Tudo fica no schema "medicao", separado do "public": no Supabase, o "public" é exposto
-- pela API automática; o "medicao" não é, e ninguém além dos usuários de acessos.sql entra.

create schema if not exists medicao;
revoke all on schema medicao from public;

-- Uma linha por aba aberta: de onde veio, em que aparelho, de que cidade.
create table if not exists medicao.sessoes (
  id               uuid primary key,
  visitante        uuid not null,           -- anônimo, guardado no aparelho; repete quando a pessoa volta
  inicio           timestamptz not null default now(),
  pagina           text,

  origem           text,                    -- utm_source ou site de onde veio (instagram, meta, direto…)
  campanha         text,                    -- utm_campaign
  conteudo         text,                    -- utm_content

  tipo_dispositivo text,                    -- celular | tablet | computador
  fabricante       text,                    -- Samsung, Apple, Motorola…
  modelo           text,                    -- SM-S918B, "iPhone 15", "iPhone 14 Pro / 15 / 15 Pro / 16"…
  modelo_estimado  boolean default false,   -- true no Safari do iPhone (estimado pela tela)
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
  dias_desde_primeira integer,

  -- Segunda barreira: mesmo se a função de entrada falhar, nada gigante entra.
  constraint sessoes_textos_curtos check (
    coalesce(length(user_agent), 0) <= 400 and coalesce(length(referencia), 0) <= 300
    and coalesce(length(pagina), 0) <= 200 and coalesce(length(modelo), 0) <= 120
  )
);

-- Uma linha por ação: clique, seção vista, tempo em seção, rolagem, pergunta aberta…
create table if not exists medicao.eventos (
  id        bigserial primary key,
  sessao    uuid not null references medicao.sessoes (id) on delete cascade,
  quando    timestamptz not null,           -- hora no aparelho da pessoa
  recebido  timestamptz not null default now(),
  nome      text not null,                  -- clique_whatsapp, tempo_secao, secao_vista…
  secao     text,                           -- topo, avaliacoes, atividades… (quando houver)
  segundos  integer,                        -- tempo_secao, video_assistido
  dados     jsonb not null default '{}',    -- o resto do que veio com a ação

  constraint eventos_nome_valido check (nome ~ '^[a-z][a-z0-9_]{1,59}$'),
  constraint eventos_segundos_validos check (segundos is null or segundos between 0 and 86400),
  constraint eventos_dados_pequenos check (pg_column_size(dados) <= 4000)
);

create index if not exists eventos_nome_idx   on medicao.eventos (nome);
create index if not exists eventos_sessao_idx on medicao.eventos (sessao);
create index if not exists eventos_quando_idx on medicao.eventos (quando);
create index if not exists sessoes_inicio_idx on medicao.sessoes (inicio);

-- Teto por visita: passou de 2.000 ações numa mesma aba, o resto é descartado em silêncio.
-- Nenhuma visita real chega perto; segura robô e script repetindo envio.
-- "security definer" porque quem insere (o site) não tem permissão de ler a tabela.
create or replace function medicao.limitar_eventos_por_sessao() returns trigger
language plpgsql security definer set search_path = medicao, pg_temp as $$
begin
  if (select count(*) from medicao.eventos where sessao = new.sessao) >= 2000 then
    return null;
  end if;
  return new;
end;
$$;
revoke all on function medicao.limitar_eventos_por_sessao() from public;

drop trigger if exists limitar_eventos on medicao.eventos;
create trigger limitar_eventos before insert on medicao.eventos
for each row execute function medicao.limitar_eventos_por_sessao();

-- Limpeza: apaga visitas com mais de N dias (padrão 400, pouco mais de um ano).
-- Rodar à mão de vez em quando, ou agendar (pg_cron): select medicao.apagar_antigos();
create or replace function medicao.apagar_antigos(dias integer default 400) returns bigint
language sql as $$
  with apagadas as (
    delete from medicao.sessoes where inicio < now() - make_interval(days => dias) returning 1
  )
  select count(*) from apagadas;
$$;
revoke all on function medicao.apagar_antigos(integer) from public;

-- Análises prontas. "security_invoker": a visão respeita as permissões de quem consulta
-- (sem isso, uma visão exposta vazaria as tabelas com os poderes do dono).

-- Tempo em cada seção, somado por visita (uma pessoa pode passar pela mesma seção mais de uma vez).
create or replace view medicao.tempo_por_secao with (security_invoker = true) as
select s.id as sessao, s.visitante, s.origem, s.modelo, s.sistema, e.secao,
       sum(e.segundos) as segundos
from medicao.eventos e
join medicao.sessoes s on s.id = e.sessao
where e.nome = 'tempo_secao'
group by s.id, s.visitante, s.origem, s.modelo, s.sistema, e.secao;

-- Resumo por seção: quantas pessoas viram e tempo médio / mediano.
create or replace view medicao.resumo_secoes with (security_invoker = true) as
select secao,
       count(distinct sessao)                                   as pessoas,
       round(avg(segundos))                                      as segundos_media,
       percentile_cont(0.5) within group (order by segundos)     as segundos_mediana
from medicao.tempo_por_secao
group by secao
order by pessoas desc;

-- Funil por origem: visitas e quantas clicaram no WhatsApp.
create or replace view medicao.funil_por_origem with (security_invoker = true) as
select s.origem,
       count(distinct s.id) as visitas,
       count(distinct s.id) filter (where e.nome in ('clique_whatsapp', 'clique_hospedagem')) as cliques_whatsapp
from medicao.sessoes s
left join medicao.eventos e on e.sessao = s.id
group by s.origem
order by visitas desc;

-- Resumo final de cada visita (o último resumo_visita enviado por sessão).
create or replace view medicao.visitas with (security_invoker = true) as
select distinct on (e.sessao)
       e.sessao, s.visitante, s.inicio, s.origem, s.campanha, s.modelo, s.sistema, s.app, s.cidade,
       s.visita_numero,
       (e.dados->>'segundos_visivel')::int as segundos_visivel,
       (e.dados->>'rolagem_max')::int      as rolagem_max,
       (e.dados->>'secoes_vistas')::int    as secoes_vistas,
       (e.dados->>'cliques')::int          as cliques,
       exists (select 1 from medicao.eventos w
               where w.sessao = e.sessao and w.nome in ('clique_whatsapp', 'clique_hospedagem')) as chamou_whatsapp
from medicao.eventos e
join medicao.sessoes s on s.id = e.sessao
where e.nome = 'resumo_visita'
order by e.sessao, e.quando desc;

-- Vídeos: quantas pessoas assistiram e por quanto tempo.
create or replace view medicao.videos with (security_invoker = true) as
select dados->>'video' as video, secao,
       count(distinct sessao) as pessoas,
       sum(segundos)          as segundos_total,
       round(avg(segundos))   as segundos_media,
       count(*) filter (where (dados->>'com_som')::int = 1) as vezes_com_som
from medicao.eventos
where nome = 'video_assistido'
group by 1, 2
order by pessoas desc;

-- Aparelhos mais comuns.
create or replace view medicao.aparelhos with (security_invoker = true) as
select tipo_dispositivo, fabricante, modelo, sistema, versao_sistema, app, count(*) as sessoes
from medicao.sessoes
group by 1, 2, 3, 4, 5, 6
order by sessoes desc;
