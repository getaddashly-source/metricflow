-- ============================================================
-- MetricFlow: Google Ads Integration Schema
-- Mirrors Meta/Shopify patterns for Google Ads OAuth + insights
-- ============================================================

-- 1. google_ad_accounts
create table public.google_ad_accounts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  google_customer_id  text not null,
  google_account_name text,
  google_manager_id   text,
  client_id           text not null,
  is_active           boolean not null default true,
  connected_at        timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint uq_google_ad_accounts_client unique (user_id, client_id),
  constraint uq_google_ad_accounts_google unique (user_id, google_customer_id)
);

create index idx_google_ad_accounts_user_id on public.google_ad_accounts(user_id);

-- 2. google_tokens
create table public.google_tokens (
  id                    uuid primary key default gen_random_uuid(),
  google_ad_account_id  uuid not null references public.google_ad_accounts(id) on delete cascade,
  access_token_enc      text not null,
  refresh_token_enc     text not null,
  token_expires_at      timestamptz not null,
  scopes                text,
  last_refreshed_at     timestamptz,
  refresh_error         text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint uq_google_tokens_account unique (google_ad_account_id)
);

create index idx_google_tokens_expires_at on public.google_tokens(token_expires_at);

-- 3. google_sync_logs
create table public.google_sync_logs (
  id                    uuid primary key default gen_random_uuid(),
  google_ad_account_id  uuid not null references public.google_ad_accounts(id) on delete cascade,
  sync_type             text not null,
  status                public.sync_status not null default 'pending',
  started_at            timestamptz,
  completed_at          timestamptz,
  records_synced        int not null default 0,
  error_message         text,
  error_code            text,
  sync_date_from        date,
  sync_date_to          date,
  created_at            timestamptz not null default now()
);

create index idx_google_sync_logs_account on public.google_sync_logs(google_ad_account_id, created_at desc);
create index idx_google_sync_logs_status  on public.google_sync_logs(status) where status in ('pending', 'running', 'failed');

-- 4. google_oauth_states
create table public.google_oauth_states (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  client_id   text not null,
  state       text not null,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  constraint uq_google_oauth_states_state unique (state)
);

create index idx_google_oauth_states_state on public.google_oauth_states(state);
create index idx_google_oauth_states_expires on public.google_oauth_states(expires_at);

-- 5. google_campaign_insights
create table public.google_campaign_insights (
  id                      uuid primary key default gen_random_uuid(),
  google_ad_account_id    uuid not null references public.google_ad_accounts(id) on delete cascade,
  campaign_id             text not null,
  campaign_name           text,
  date_start              date not null,
  date_stop               date not null,
  impressions             bigint not null default 0,
  clicks                  bigint not null default 0,
  spend                   numeric(12,2) not null default 0,
  reach                   bigint not null default 0,
  ctr                     numeric(8,4) default 0,
  cpc                     numeric(10,4) default 0,
  cpm                     numeric(10,4) default 0,
  conversions             bigint default 0,
  conversion_value        numeric(12,2) default 0,
  cost_per_conversion     numeric(10,4) default 0,
  campaign_status         text,
  campaign_type           text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint uq_google_campaign_insights_day unique (google_ad_account_id, campaign_id, date_start)
);

create index idx_google_campaign_insights_account_date on public.google_campaign_insights(google_ad_account_id, date_start desc);
create index idx_google_campaign_insights_campaign     on public.google_campaign_insights(campaign_id, date_start desc);

-- RLS
alter table public.google_ad_accounts enable row level security;
create policy "Agency owner manages own google accounts" on public.google_ad_accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Service role manages all google accounts" on public.google_ad_accounts for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

alter table public.google_tokens enable row level security;
create policy "Agency owner reads own google tokens"   on public.google_tokens for select using (exists (select 1 from public.google_ad_accounts a where a.id = google_tokens.google_ad_account_id and a.user_id = auth.uid()));
create policy "Agency owner deletes own google tokens" on public.google_tokens for delete using (exists (select 1 from public.google_ad_accounts a where a.id = google_tokens.google_ad_account_id and a.user_id = auth.uid()));
create policy "Service role manages all google tokens" on public.google_tokens for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

alter table public.google_sync_logs enable row level security;
create policy "Agency owner reads own google sync logs" on public.google_sync_logs for select using (exists (select 1 from public.google_ad_accounts a where a.id = google_sync_logs.google_ad_account_id and a.user_id = auth.uid()));
create policy "Service role manages all google sync logs" on public.google_sync_logs for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

alter table public.google_oauth_states enable row level security;
create policy "Users manage own google oauth states" on public.google_oauth_states for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.google_campaign_insights enable row level security;
create policy "Agency reads own google insights" on public.google_campaign_insights for select using (exists (select 1 from public.google_ad_accounts a where a.id = google_campaign_insights.google_ad_account_id and a.user_id = auth.uid()));
create policy "Client viewer reads google insights" on public.google_campaign_insights for select using (exists (
  select 1 from public.google_ad_accounts a
  join public.client_viewers cv on cv.agency_id = a.user_id and cv.client_id = a.client_id
  where a.id = google_campaign_insights.google_ad_account_id and cv.viewer_id = auth.uid()
));
create policy "Service role manages google insights" on public.google_campaign_insights for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Triggers
create trigger trg_google_ad_accounts_updated_at before update on public.google_ad_accounts for each row execute function public.set_updated_at();
create trigger trg_google_tokens_updated_at before update on public.google_tokens for each row execute function public.set_updated_at();
create trigger trg_google_campaign_insights_updated_at before update on public.google_campaign_insights for each row execute function public.set_updated_at();
