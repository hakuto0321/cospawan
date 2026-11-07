-- 開発用の仮データ（本番には入れない）
-- JAN は実在商品と重ならないよう、店内用の 20 番台を使う

insert into categories (slug, name, parent_id, sort_order) values
  ('pet', 'ペット用品', null, 0);

insert into categories (slug, name, parent_id, sort_order) values
  ('pet-food',   'フード',     (select id from categories where slug = 'pet'), 1),
  ('pet-litter', '猫砂',       (select id from categories where slug = 'pet'), 2),
  ('pet-sheet',  'ペットシーツ', (select id from categories where slug = 'pet'), 3);

insert into products (jan, name, pet_type, category_id, size, unit, amount, default_per_day, status) values
  ('2000000000015', '【仮】ドッグフード 成犬用 チキン 2kg', 'dog',
     (select id from categories where slug = 'pet-food'),   '2kg',  'g', 2000, 100, 'active'),
  ('2000000000022', '【仮】キャットフード 室内猫用 1.6kg', 'cat',
     (select id from categories where slug = 'pet-food'),   '1.6kg', 'g', 1600, 50, 'active'),
  ('2000000000039', '【仮】システムトイレ用 猫砂 4L', 'cat',
     (select id from categories where slug = 'pet-litter'), '4L', 'L', 4, 0.2, 'active'),
  ('2000000000046', '【仮】ペットシーツ レギュラー 100枚', 'both',
     (select id from categories where slug = 'pet-sheet'),  '100枚', '枚', 100, 5, 'active'),
  ('2000000000053', '【仮】下書きの商品（公開されない）', 'dog',
     (select id from categories where slug = 'pet-food'),   '1kg', 'g', 1000, 50, 'draft');

-- 最新価格（effective_price = price + shipping - points）
insert into offers_latest
  (product_id, mall, item_code, shop_name, price, shipping, shipping_status, point_rate, points, effective_price, url, fetched_at, hold_reason)
values
  ((select id from products where jan = '2000000000015'), 'rakuten', 'shopa:10001', '仮ショップA',   2480,    0, 'free',     1, 22, 2458, 'https://example.com/a', now() - interval '1 hour', null),
  ((select id from products where jan = '2000000000015'), 'rakuten', 'shopb:20001', '仮ショップB',   2280,  500, 'paid',     1, 20, 2760, 'https://example.com/b', now() - interval '1 hour', null),
  ((select id from products where jan = '2000000000015'), 'yahoo',   'shopc_30001', '仮ショップC',   2398,    0, 'free',     1, 21, 2377, 'https://example.com/c', now() - interval '1 hour', null),
  ((select id from products where jan = '2000000000022'), 'rakuten', 'shopa:10002', '仮ショップA',   1980,    0, 'free',     1, 18, 1962, 'https://example.com/d', now() - interval '1 hour', null),
  ((select id from products where jan = '2000000000022'), 'yahoo',   'shopd_40001', '仮ショップD',   1890,  null, 'unknown', 1, 17, null, 'https://example.com/e', now() - interval '1 hour', null),
  ((select id from products where jan = '2000000000039'), 'rakuten', 'shope:50001', '仮ショップE',    980,    0, 'included', 1,  8,  972, 'https://example.com/f', now() - interval '1 hour', null),
  ((select id from products where jan = '2000000000039'), 'yahoo',   'shopf_60001', '仮ショップF',    298,    0, 'free',     1,  2,  296, 'https://example.com/g', now() - interval '1 hour', '前回から50%以上の変動'),
  ((select id from products where jan = '2000000000046'), 'rakuten', 'shopa:10003', '仮ショップA',   1580,    0, 'free',     1, 14, 1566, 'https://example.com/h', now() - interval '1 hour', null),
  ((select id from products where jan = '2000000000046'), 'yahoo',   'shopc_30002', '仮ショップC',   1520,    0, 'free',     1, 13, 1507, 'https://example.com/i', now() - interval '1 hour', null);

-- 価格履歴（ドッグフードだけ数回分）
insert into price_history (product_id, mall, effective_price_min, top_offers, fetched_at) values
  ((select id from products where jan = '2000000000015'), 'rakuten', 2520, '[]', now() - interval '2 days'),
  ((select id from products where jan = '2000000000015'), 'rakuten', 2490, '[]', now() - interval '1 day'),
  ((select id from products where jan = '2000000000015'), 'rakuten', 2458,
     '[{"shop_name":"仮ショップA","price":2480,"shipping":0,"points":22,"effective_price":2458,"url":"https://example.com/a"}]',
     now() - interval '1 hour'),
  ((select id from products where jan = '2000000000015'), 'yahoo',   2377,
     '[{"shop_name":"仮ショップC","price":2398,"shipping":0,"points":21,"effective_price":2377,"url":"https://example.com/c"}]',
     now() - interval '1 hour');

insert into events (mall, name, starts_at, ends_at, bonus_rate) values
  ('rakuten', '【仮】お買い物マラソン', now() + interval '3 days', now() + interval '10 days', 9);

-- 公開中の価格は「最後に公開した価格」と同じ
update offers_latest set reference_price = price where hold_reason is null;
