-- =====================================================================
-- SUPORT MAX — CRM Básico: armazenamento na nuvem
-- Sincroniza os dados entre celular e computador.
--
-- COMO USAR: copie TODO este texto, cole no SQL Editor do Supabase
-- (menu "SQL Editor" -> "New query"), clique em "RUN".
-- Pode rodar quantas vezes quiser: não apaga nada.
-- =====================================================================

-- PRIMEIRO ACESSO: crie o usuário em Authentication -> Users e depois
-- autorize-o inserindo seu UUID em public.crm_members (exemplo no CRM).
-- Para outras contas, repita o cadastro com role 'admin' ou 'comum'.
create extension if not exists pgcrypto;

-- 1) Guarda os dados do CRM (um registro por usuário autorizado)
create table if not exists public.crm_state (
    user_id       uuid primary key references auth.users(id) on delete cascade,
    dados         jsonb not null default '{}'::jsonb,
    atualizado_em timestamptz not null default now()
);

alter table public.crm_state enable row level security;

-- 2) Cada usuário só lê e grava o próprio registro
drop policy if exists "crm_state_select_own" on public.crm_state;
create policy "crm_state_select_own"
    on public.crm_state for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "crm_state_insert_own" on public.crm_state;
create policy "crm_state_insert_own"
    on public.crm_state for insert to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "crm_state_update_own" on public.crm_state;
create policy "crm_state_update_own"
    on public.crm_state for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

grant select, insert, update on public.crm_state to authenticated;

-- 3) Cadastro de contas autorizadas e papel (admin/comum)
create table if not exists public.crm_members (
    user_id    uuid primary key references auth.users(id) on delete cascade,
    role       text not null default 'admin' check (role in ('admin', 'comum')),
    created_at timestamptz not null default now()
);
alter table public.crm_members add column if not exists role text not null default 'admin';

alter table public.crm_members enable row level security;
drop policy if exists "crm_members_select_own" on public.crm_members;
create policy "crm_members_select_own"
    on public.crm_members for select to authenticated
    using ((select auth.uid()) = user_id);

grant select on public.crm_members to authenticated;
revoke insert, update, delete on public.crm_members from anon, authenticated;

-- A autorização é consultada pelo app sem expor a lista de membros.
create or replace function public.is_crm_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.crm_members m
        where m.user_id = (select auth.uid())
    );
$$;

revoke all on function public.is_crm_member() from public, anon;
grant execute on function public.is_crm_member() to authenticated;

-- 4) Recarrega o cache do PostgREST (faz as tabelas aparecerem na hora)
notify pgrst, 'reload schema';

-- (fim)
