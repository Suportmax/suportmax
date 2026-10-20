-- =====================================================================
-- SUPORT MAX — CRM Básico: armazenamento na nuvem
-- Sincroniza os dados entre celular e computador.
--
-- COMO USAR: copie TODO este texto, cole no SQL Editor do Supabase
-- (menu "SQL Editor" -> "New query"), clique em "RUN".
-- Pode rodar quantas vezes quiser: não apaga nada.
-- =====================================================================

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

-- 3) Recarrega o cache do PostgREST (faz a tabela aparecer na hora)
notify pgrst, 'reload schema';

-- (fim)
