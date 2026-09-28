-- Usuários do banco de medição. Rodar DEPOIS de schema.sql, com o usuário dono do banco.
--
--   medicao_site    → o que o site (api/eventos.ts) usa. Só INSERE. Não lê, não altera, não apaga.
--                     Se a senha vazar, dá para sujar a tabela, mas não para ler nem destruir os dados.
--   medicao_leitura → para você analisar (planilha, Metabase, Python…). Só LÊ.
--
-- Na primeira vez, o resultado mostra as senhas geradas. Copie na hora: elas não aparecem de novo.
-- Rodar outra vez não muda senha de quem já existe (para trocar, veja o fim do arquivo).
-- Não escreva senha neste arquivo — ele fica no git.

create temporary table senhas_novas (usuario text, senha text) on commit drop;

do $$
declare
  u text;
  senha text;
begin
  foreach u in array array['medicao_site', 'medicao_leitura'] loop
    if not exists (select 1 from pg_roles where rolname = u) then
      -- 64 caracteres aleatórios do gerador forte do Postgres.
      senha := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
      execute format('create role %I login password %L', u, senha);
      insert into senhas_novas values (u, senha);
    end if;
  end loop;
end
$$;

-- Nenhum dos dois cria nada, nem enxerga outros schemas.
alter role medicao_site    set search_path = medicao;
alter role medicao_leitura set search_path = medicao;
alter role medicao_site    connection limit 20;
alter role medicao_leitura connection limit 5;

grant usage on schema medicao to medicao_site, medicao_leitura;

-- Site: só insere nas duas tabelas (e usa o contador de id dos eventos).
revoke all on all tables in schema medicao from medicao_site;
grant insert on medicao.sessoes, medicao.eventos to medicao_site;
grant usage on sequence medicao.eventos_id_seq to medicao_site;

-- Leitura: consulta tabelas e visões, nada mais.
revoke all on all tables in schema medicao from medicao_leitura;
grant select on all tables in schema medicao to medicao_leitura;

-- Senhas geradas agora (vazio = os usuários já existiam).
select usuario, senha from senhas_novas;

-- Para trocar uma senha (se vazar ou por rotina), rode só a linha abaixo com uma senha nova
-- e atualize DATABASE_URL no Vercel:
--   alter role medicao_site password 'NOVA_SENHA_LONGA_AQUI';
