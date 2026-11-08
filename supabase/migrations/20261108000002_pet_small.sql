-- 小動物（犬・猫以外）を追加する。pet_type に small を足す
-- 将来、人気の動物（うさぎなど）を独立させるときは、別の列（animal）を足す想定
alter table products drop constraint if exists products_pet_type_check;
alter table products add constraint products_pet_type_check check (pet_type in ('dog', 'cat', 'both', 'small'));
