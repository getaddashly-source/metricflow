-- Store Meta app-scoped user ID for deauthorize/data-deletion callbacks
-- so we can map callback signed_request.user_id to connected records.

alter table public.meta_ad_accounts
  add column if not exists meta_user_id text;

create index if not exists idx_meta_ad_accounts_meta_user_id
  on public.meta_ad_accounts(meta_user_id);
