-- NoSkip: banco na nuvem (Supabase), no mesmo projeto do Ice Cream Lab.
-- Cole tudo isto no Supabase em "SQL Editor" → "New query" e toque em "Run". Rodar de novo não estraga nada.
--
-- Uma tabela só guarda todos os dados do app, um registro por item
-- (cada meta e cada treino; ajustes e marcos vistos são um registro cada).
-- As regras de segurança (RLS) garantem que cada pessoa só lê e escreve os próprios dados.

create table if not exists public.noskip_registros (
  user_id       uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  tipo          text        not null,   -- metas, treinos, ajustes, marcos
  id            text        not null,   -- id do item dentro do app
  dados         jsonb,                  -- o item inteiro
  apagado       boolean     not null default false,  -- itens apagados ficam marcados, para sumir dos outros aparelhos
  alterado      bigint      not null,   -- quando o item foi mudado no aparelho (milissegundos); o mais recente vence
  atualizado_em timestamptz not null default now(),  -- quando chegou ao servidor (para buscar só o que é novo)
  primary key (user_id, tipo, id)
);

create index if not exists noskip_registros_usuario_atualizado on public.noskip_registros (user_id, atualizado_em);

-- Carimba a hora do servidor a cada gravação.
create or replace function public.noskip_registros_carimba() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists noskip_registros_carimba on public.noskip_registros;
create trigger noskip_registros_carimba before insert or update on public.noskip_registros
for each row execute function public.noskip_registros_carimba();

-- Segurança: cada usuário só enxerga e altera os próprios registros.
alter table public.noskip_registros enable row level security;

drop policy if exists "ler os próprios" on public.noskip_registros;
create policy "ler os próprios" on public.noskip_registros for select using (auth.uid() = user_id);

drop policy if exists "criar os próprios" on public.noskip_registros;
create policy "criar os próprios" on public.noskip_registros for insert with check (auth.uid() = user_id);

drop policy if exists "alterar os próprios" on public.noskip_registros;
create policy "alterar os próprios" on public.noskip_registros for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "apagar os próprios" on public.noskip_registros;
create policy "apagar os próprios" on public.noskip_registros for delete using (auth.uid() = user_id);
