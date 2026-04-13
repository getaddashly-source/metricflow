create table public.meta_oauth_account_selections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  selection_token text not null unique,
  access_token_enc text not null,
  token_expires_at timestamptz not null,
  scopes text,
  meta_user_id text,
  account_options jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index idx_meta_oauth_account_selections_user_id
  on public.meta_oauth_account_selections(user_id);

create index idx_meta_oauth_account_selections_expires_at
  on public.meta_oauth_account_selections(expires_at);

alter table public.meta_oauth_account_selections enable row level security;

create policy "Users manage own meta account selections"
  on public.meta_oauth_account_selections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Service role manages meta account selections"
  on public.meta_oauth_account_selections for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
