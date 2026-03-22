-- ============================================================
-- Addashly: Shopify Order Analytics Schema
-- Adds order-level analytics data synced from Shopify Admin API
-- ============================================================

-- 1. shopify_order_analytics — daily aggregated order/revenue data
create table public.shopify_order_analytics (
  id                  uuid primary key default gen_random_uuid(),
  shopify_store_id    uuid not null references public.shopify_stores(id) on delete cascade,

  -- Date-level aggregation
  order_date          date not null,

  -- Order metrics
  total_orders        int not null default 0,
  total_revenue       numeric(12,2) not null default 0,
  total_refunds       numeric(12,2) not null default 0,
  net_revenue         numeric(12,2) not null default 0,
  total_items_sold    int not null default 0,
  avg_order_value     numeric(10,2) not null default 0,

  -- Customer metrics
  new_customers       int not null default 0,
  returning_customers int not null default 0,

  -- Fulfillment
  orders_fulfilled    int not null default 0,
  orders_pending      int not null default 0,
  orders_cancelled    int not null default 0,

  -- Housekeeping
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint uq_shopify_order_analytics_day unique (shopify_store_id, order_date)
);

create index idx_shopify_order_analytics_store_date on public.shopify_order_analytics(shopify_store_id, order_date desc);

-- 2. shopify_product_analytics — product-level performance
create table public.shopify_product_analytics (
  id                  uuid primary key default gen_random_uuid(),
  shopify_store_id    uuid not null references public.shopify_stores(id) on delete cascade,

  product_id          text not null,
  product_title       text,
  variant_title       text,

  -- Aggregated metrics (rolling / total over sync period)
  total_quantity_sold int not null default 0,
  total_revenue       numeric(12,2) not null default 0,
  total_orders        int not null default 0,

  -- Date range this data covers
  date_from           date not null,
  date_to             date not null,

  -- Housekeeping
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint uq_shopify_product_analytics unique (shopify_store_id, product_id, date_from)
);

create index idx_shopify_product_analytics_store on public.shopify_product_analytics(shopify_store_id, total_revenue desc);

-- RLS
alter table public.shopify_order_analytics enable row level security;

create policy "Agency reads own shopify order analytics"
  on public.shopify_order_analytics for select
  using (exists (
    select 1 from public.shopify_stores s
    where s.id = shopify_order_analytics.shopify_store_id
      and s.user_id = auth.uid()
  ));

create policy "Client viewer reads shopify order analytics"
  on public.shopify_order_analytics for select
  using (exists (
    select 1 from public.shopify_stores s
    join public.client_viewers cv on cv.agency_id = s.user_id and cv.client_id = s.client_id
    where s.id = shopify_order_analytics.shopify_store_id
      and cv.viewer_id = auth.uid()
  ));

create policy "Service role manages shopify order analytics"
  on public.shopify_order_analytics for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

alter table public.shopify_product_analytics enable row level security;

create policy "Agency reads own shopify product analytics"
  on public.shopify_product_analytics for select
  using (exists (
    select 1 from public.shopify_stores s
    where s.id = shopify_product_analytics.shopify_store_id
      and s.user_id = auth.uid()
  ));

create policy "Client viewer reads shopify product analytics"
  on public.shopify_product_analytics for select
  using (exists (
    select 1 from public.shopify_stores s
    join public.client_viewers cv on cv.agency_id = s.user_id and cv.client_id = s.client_id
    where s.id = shopify_product_analytics.shopify_store_id
      and cv.viewer_id = auth.uid()
  ));

create policy "Service role manages shopify product analytics"
  on public.shopify_product_analytics for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Triggers
create trigger trg_shopify_order_analytics_updated_at
  before update on public.shopify_order_analytics
  for each row execute function public.set_updated_at();

create trigger trg_shopify_product_analytics_updated_at
  before update on public.shopify_product_analytics
  for each row execute function public.set_updated_at();


