-- 保留の判定に使う「最後に公開した価格」
-- 保留した価格を基準にすると、次の回にその異常な価格が公開されてしまうため、
-- 公開した（保留しなかった）ときだけ更新する値を別に持つ
alter table offers_latest
  add column reference_price integer check (reference_price > 0);

comment on column offers_latest.reference_price is
  '最後に公開した価格。保留した回は前の値を引き継ぐ。初めて見つかったショップで保留したときは null';

update offers_latest set reference_price = price where hold_reason is null;
