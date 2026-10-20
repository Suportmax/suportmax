create extension if not exists pgcrypto;

create table if not exists public.crm_members (
    user_id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

create table if not exists public.crm_customers (
    id uuid primary key default gen_random_uuid(),
    company_name text not null,
    contact_name text not null default '',
    email text not null default '',
    phone text not null default '',
    notes text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.crm_interactions (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references public.crm_customers(id) on delete cascade,
    description text not null,
    happened_at timestamptz not null default now(),
    created_by uuid not null default auth.uid() references auth.users(id)
);

alter table public.crm_members enable row level security;
alter table public.crm_customers enable row level security;
alter table public.crm_interactions enable row level security;

create or replace function public.is_crm_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.crm_members
        where user_id = (select auth.uid())
    );
$$;

revoke all on table public.crm_members from anon, authenticated;
revoke all on function public.is_crm_member() from public;
grant execute on function public.is_crm_member() to authenticated;

drop policy if exists "CRM users can read customers" on public.crm_customers;
create policy "CRM users can read customers"
    on public.crm_customers for select to authenticated
    using ((select public.is_crm_member()));

drop policy if exists "CRM users can add customers" on public.crm_customers;
create policy "CRM users can add customers"
    on public.crm_customers for insert to authenticated
    with check ((select public.is_crm_member()));

drop policy if exists "CRM users can update customers" on public.crm_customers;
create policy "CRM users can update customers"
    on public.crm_customers for update to authenticated
    using ((select public.is_crm_member()))
    with check ((select public.is_crm_member()));

drop policy if exists "CRM users can delete customers" on public.crm_customers;
create policy "CRM users can delete customers"
    on public.crm_customers for delete to authenticated
    using ((select public.is_crm_member()));

drop policy if exists "CRM users can read interactions" on public.crm_interactions;
create policy "CRM users can read interactions"
    on public.crm_interactions for select to authenticated
    using ((select public.is_crm_member()));

drop policy if exists "CRM users can add interactions" on public.crm_interactions;
create policy "CRM users can add interactions"
    on public.crm_interactions for insert to authenticated
    with check ((select public.is_crm_member()) and auth.uid() = created_by);

grant select, insert, update, delete on public.crm_customers to authenticated;
grant select, insert on public.crm_interactions to authenticated;

notify pgrst, 'reload schema';
