-- ポチどき 初期テーブル
-- 方針
-- - 金額はすべて円の整数（integer）
-- - 種類を表す値は enum ではなく text + check にする（あとで増やしやすくするため）
-- - 書き込みはすべてサーバー側（service_role）から行う。anon は公開してよいデータの読み取りだけ

-- ============================================================
-- カテゴリ（ペットはカテゴリの一つ。将来ほかの消耗品にも広げる）
-- ============================================================
create table categories (
  id          bigint generated always as identity primary key,
  slug        text not null unique,               -- 例: pet, pet-food, pet-litter
  name        text not null,                      -- 例: ペット用品, ドッグフード
  parent_id   bigint references categories (id),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 商品（JANコードで識別）
-- ============================================================
create table products (
  id               bigint generated always as identity primary key,
  jan              text not null unique check (jan ~ '^[0-9]{8}$|^[0-9]{13}$'),
  name             text not null,
  pet_type         text check (pet_type in ('dog', 'cat', 'both')), -- ペット以外の商品では null
  category_id      bigint not null references categories (id),
  size             text,                          -- 表示用。例: 2kg, 100枚
  unit             text,                          -- 残量計算の単位。例: g, 枚
  amount           numeric check (amount > 0),    -- 1個あたりの量（unit 単位）
  default_per_day  numeric check (default_per_day > 0), -- 1日に使う量の目安（unit 単位）
  is_high_ticket   boolean not null default false,
  amazon_url       text,                          -- Amazon はリンクだけ持つ（価格は保存しない）
  status           text not null default 'draft'
                     check (status in ('draft', 'active', 'hidden')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index products_category_idx on products (category_id);
create index products_status_pet_type_idx on products (status, pet_type);

-- ============================================================
-- 全ショップの最新価格（取得のたびに上書き）
-- ============================================================
create table offers_latest (
  id               bigint generated always as identity primary key,
  product_id       bigint not null references products (id) on delete cascade,
  mall             text not null check (mall in ('rakuten', 'yahoo')),
  item_code        text not null,                 -- モール側の商品ID（楽天 itemCode / Yahoo! code）
  shop_name        text not null,
  price            integer not null check (price > 0),        -- 税込の商品価格
  shipping         integer check (shipping >= 0),             -- 送料。わからないときは null
  shipping_status  text not null
                     check (shipping_status in ('free', 'included', 'paid', 'unknown')),
  point_rate       numeric not null default 0 check (point_rate >= 0), -- 基本のポイント倍率（%）
  points           integer not null default 0 check (points >= 0),     -- もらえるポイント（1pt = 1円）
  effective_price  integer,                       -- 実質価格 = price + shipping - points。送料不明なら null
  url              text not null,                 -- 商品ページ（アフィリエイトURL）
  fetched_at       timestamptz not null,
  hold_reason      text,                          -- おかしな値で公開を保留しているときの理由。null なら公開
  unique (product_id, mall, item_code)
);

create index offers_latest_product_idx on offers_latest (product_id, effective_price);

-- ============================================================
-- 価格履歴（取得1回ごとに、モールごとの実質最安と上位数件だけ残す）
-- ============================================================
create table price_history (
  id                   bigint generated always as identity primary key,
  product_id           bigint not null references products (id) on delete cascade,
  mall                 text not null check (mall in ('rakuten', 'yahoo')),
  effective_price_min  integer not null check (effective_price_min > 0),
  top_offers           jsonb not null default '[]'::jsonb, -- [{shop_name, price, shipping, points, effective_price, url}]
  fetched_at           timestamptz not null
);

create index price_history_product_time_idx on price_history (product_id, mall, fetched_at desc);

-- ============================================================
-- セール（当面は手入力）
-- ============================================================
create table events (
  id          bigint generated always as identity primary key,
  mall        text not null check (mall in ('rakuten', 'yahoo')),
  name        text not null,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  bonus_rate  numeric check (bonus_rate >= 0),    -- 上乗せされるポイント倍率（%）の目安
  check (ends_at > starts_at)
);

create index events_time_idx on events (starts_at, ends_at);

-- ============================================================
-- 通知の事前登録
-- ============================================================
create table waitlist (
  id          bigint generated always as identity primary key,
  email       text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  product_id  bigint references products (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- 同じ人が同じ商品に二重登録しない（商品なしの登録も1件まで）
create unique index waitlist_email_product_idx
  on waitlist (lower(email), coalesce(product_id, 0));

-- ============================================================
-- 利用の記録（個人情報は入れない）
-- ============================================================
create table usage_events (
  id          bigint generated always as identity primary key,
  type        text not null check (type in ('click_out', 'waitlist_signup', 'search')),
  product_id  bigint references products (id) on delete set null,
  mall        text check (mall in ('rakuten', 'yahoo', 'amazon')),
  query       text,
  created_at  timestamptz not null default now()
);

create index usage_events_type_time_idx on usage_events (type, created_at desc);

-- ============================================================
-- バッチの実行記録（「最終更新が12時間以上前」の検知に使う）
-- ============================================================
create table batch_runs (
  id           bigint generated always as identity primary key,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  status       text not null default 'running'
                 check (status in ('running', 'succeeded', 'failed')),
  stats        jsonb not null default '{}'::jsonb, -- 取得件数、保留件数など
  error        text
);

create index batch_runs_started_idx on batch_runs (started_at desc);

-- ============================================================
-- updated_at の自動更新
-- ============================================================
create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

-- ============================================================
-- 行レベルセキュリティ
-- すべてのテーブルで有効にし、anon には公開データの読み取りだけ許す。
-- waitlist / usage_events / batch_runs は anon から一切見えない（service_role だけが使う）
-- ============================================================
alter table categories     enable row level security;
alter table products       enable row level security;
alter table offers_latest  enable row level security;
alter table price_history  enable row level security;
alter table events         enable row level security;
alter table waitlist       enable row level security;
alter table usage_events   enable row level security;
alter table batch_runs     enable row level security;

create policy "公開: カテゴリ" on categories
  for select to anon, authenticated using (true);

create policy "公開: 掲載中の商品" on products
  for select to anon, authenticated using (status = 'active');

create policy "公開: 保留していない価格" on offers_latest
  for select to anon, authenticated
  using (
    hold_reason is null
    and exists (select 1 from products p where p.id = product_id and p.status = 'active')
  );

create policy "公開: 価格履歴" on price_history
  for select to anon, authenticated
  using (exists (select 1 from products p where p.id = product_id and p.status = 'active'));

create policy "公開: セール" on events
  for select to anon, authenticated using (true);
