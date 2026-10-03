-- Reservas pagas pelo Mercado Pago (Monte seu pack → api/pagamento → api/mercadopago).
-- Rodar no editor SQL do provedor, com o usuário dono do banco. Pode rodar de novo sem estragar nada.
--
-- Fica no schema "reservas", separado da medição. Aqui HÁ dados pessoais (nome, WhatsApp, e-mail):
-- só o usuário reservas_site (o site) e o dono do banco enxergam.

create schema if not exists reservas;
revoke all on schema reservas from public;

create table if not exists reservas.reservas (
  id             uuid primary key default gen_random_uuid(),
  criada         timestamptz not null default now(),
  atualizada     timestamptz not null default now(),
  -- pendente: link gerado, aguardando · em_analise: Mercado Pago revisando · pago · recusado
  -- cancelado · expirado (link venceu sem pagamento) · estornado (devolvido/chargeback)
  status         text not null default 'pendente'
                 check (status in ('pendente', 'em_analise', 'pago', 'recusado', 'cancelado', 'expirado', 'estornado')),
  nome           text not null check (length(nome) between 2 and 120),
  telefone       text not null check (telefone ~ '^[0-9]{10,13}$'),
  email          text check (email is null or length(email) <= 160),
  turno          text not null,
  pessoas        integer not null check (pessoas between 1 and 30),
  itens          jsonb not null,               -- linhas do pack: id, nome, unidades, subtotal
  total          numeric(10, 2) not null check (total >= 0),       -- valor do pack
  valor_cobrado  numeric(10, 2) not null check (valor_cobrado > 0), -- total ou sinal
  modo           text not null check (modo in ('total', 'sinal')),
  tem_rope_jump  boolean not null default false,
  origem         text,                         -- utm_source de quem reservou
  campanha       text,
  visitante      uuid,                         -- liga com a medição (medicao.sessoes.visitante)
  expira_em      timestamptz not null,
  mp_preferencia text,
  mp_pagamento   text,
  mp_status      text,
  pago_em        timestamptz
);

create index if not exists reservas_turno_idx on reservas.reservas (turno, status);
create index if not exists reservas_criada_idx on reservas.reservas (criada);

-- Lugares ocupados, por turno: reservas pagas, em análise, ou com link ainda válido.
-- A lotação do dia (70 pessoas, em src/dados/evento.ts) é a soma dos dois turnos.
create or replace view reservas.ocupacao with (security_invoker = true) as
select turno, coalesce(sum(pessoas), 0)::int as pessoas,
       coalesce(sum(pessoas) filter (where tem_rope_jump), 0)::int as saltos
from reservas.reservas
where status in ('pago', 'em_analise') or (status = 'pendente' and expira_em > now())
group by turno;

-- Resumo para o Eduardo: quem pagou, por turno.
create or replace view reservas.confirmadas with (security_invoker = true) as
select turno, nome, telefone, pessoas, itens, valor_cobrado, total, modo, pago_em
from reservas.reservas
where status = 'pago'
order by turno, pago_em;

-- Usuário do site: lê, cria e atualiza reservas. Não apaga nada, não mexe em outros schemas.
-- Na primeira vez o resultado mostra a senha gerada (copie na hora). Rodar de novo não troca a senha.
create temporary table if not exists senha_nova (usuario text, senha text);
do $$
declare senha text;
begin
  if not exists (select 1 from pg_roles where rolname = 'reservas_site') then
    senha := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    execute format('create role reservas_site login password %L', senha);
    insert into senha_nova values ('reservas_site', senha);
  end if;
end
$$;
alter role reservas_site set search_path = reservas;
alter role reservas_site connection limit 10;
grant usage on schema reservas to reservas_site;
revoke all on all tables in schema reservas from reservas_site;
grant select, insert, update on reservas.reservas to reservas_site;
grant select on reservas.ocupacao, reservas.confirmadas to reservas_site;

-- Leitura para análise (o mesmo medicao_leitura de acessos.sql, se existir).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'medicao_leitura') then
    grant usage on schema reservas to medicao_leitura;
    grant select on all tables in schema reservas to medicao_leitura;
  end if;
end
$$;

select usuario, senha from senha_nova;
