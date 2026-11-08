-- 口コミ数（Yahoo!ショッピングの値）。人気順の目安に使う。売れた数ではない
-- 取得できていない商品は null（人気順には出さない）
alter table products add column review_count integer check (review_count >= 0);
alter table products add column review_updated_at timestamptz;
