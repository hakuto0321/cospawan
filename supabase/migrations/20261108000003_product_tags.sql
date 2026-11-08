-- 商品ごとの犬種・大きさ・年齢（名前と説明文から自動で決める。手作業はしない）
alter table products add column breeds text[] not null default '{}';
alter table products add column sizes text[] not null default '{}';
alter table products add column ages text[] not null default '{}';
