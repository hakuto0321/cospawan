-- テーブルの権限を明示する
-- Supabase の既定の権限に頼らず、「anon と authenticated は公開データを読むだけ」をここで決める。
-- 行の絞り込み（掲載中の商品だけ、など）は init の RLS ポリシーで行う。
-- service_role（サーバー側の secret key）は RLS を通らずに読み書きできる。

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated;

grant select on categories, products, offers_latest, price_history, events to anon, authenticated;

-- waitlist / usage_events / batch_runs は anon と authenticated から触れない（service_role だけが使う）

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
