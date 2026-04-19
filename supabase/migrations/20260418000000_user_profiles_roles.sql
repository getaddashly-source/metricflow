-- ============================================================
-- User profiles and role model (additive, non-destructive)
-- ============================================================

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_profiles_role on public.user_profiles(role);
create index if not exists idx_user_profiles_created_by on public.user_profiles(created_by);
create unique index if not exists uq_user_profiles_email_lower on public.user_profiles(lower(email));

create or replace function public.set_user_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_user_profiles_updated_at'
  ) then
    create trigger trg_user_profiles_updated_at
    before update on public.user_profiles
    for each row
    execute function public.set_user_profiles_updated_at();
  end if;
end;
$$;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, email, role)
  values (new.id, coalesce(new.email, ''), 'customer')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'on_auth_user_created_user_profile'
  ) then
    create trigger on_auth_user_created_user_profile
    after insert on auth.users
    for each row
    execute function public.handle_new_user_profile();
  end if;
end;
$$;

insert into public.user_profiles (user_id, email, role)
select u.id, coalesce(u.email, ''), 'customer'
from auth.users u
where not exists (
  select 1
  from public.user_profiles p
  where p.user_id = u.id
);

update public.user_profiles p
set role = 'admin', created_by = null
where p.user_id = (
  select u.id
  from auth.users u
  order by u.created_at asc
  limit 1
)
and not exists (
  select 1
  from public.user_profiles existing_admin
  where existing_admin.role = 'admin'
);

alter table public.user_profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'Users read own profile'
  ) then
    create policy "Users read own profile"
      on public.user_profiles for select
      using (auth.uid() = user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'Admins read created customers'
  ) then
    create policy "Admins read created customers"
      on public.user_profiles for select
      using (
        created_by = auth.uid()
        and exists (
          select 1
          from public.user_profiles self
          where self.user_id = auth.uid()
            and self.role = 'admin'
        )
      );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'Service role manages profiles'
  ) then
    create policy "Service role manages profiles"
      on public.user_profiles for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end;
$$;
