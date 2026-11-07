import { afterEach, describe, expect, it, vi } from "vitest";
import { staleOfferIds, toOfferRow, toStoredOffer } from "@/lib/batch/supabaseRepo";
import type { StoredOffer } from "@/lib/batch/types";
import { dataMode } from "@/lib/supabase/client";
import { previousMinByProduct, toProductWithOffers, type OfferRow, type ProductRow } from "./supabase";

const offerRow = (over: Partial<OfferRow> = {}): OfferRow => ({
  mall: "rakuten",
  item_code: "shop:1",
  shop_name: "ショップA",
  price: 2000,
  shipping: 0,
  shipping_status: "free",
  point_rate: "1",
  points: 18,
  effective_price: 1982,
  url: "https://example.com/a",
  fetched_at: "2026-11-08T07:05:00+09:00",
  hold_reason: null,
  ...over,
});

const productRow = (offers: OfferRow[]): ProductRow => ({
  id: 7,
  jan: "2000000000015",
  name: "【仮】ドッグフード",
  pet_type: "dog",
  size: "2kg",
  unit: "g",
  amount: "2000",
  default_per_day: "100",
  amazon_url: null,
  categories: { name: "フード" },
  offers_latest: offers,
});

describe("toProductWithOffers", () => {
  it("DB の行を画面用の形にする（数値の文字列は数にする）", () => {
    const p = toProductWithOffers(
      productRow([offerRow(), offerRow({ mall: "yahoo", item_code: "c_1", fetched_at: "2026-11-08T07:06:00+09:00" })]),
      2100,
    )!;
    expect(p.product).toMatchObject({ id: 7, categoryName: "フード", amount: 2000, defaultPerDay: 100 });
    expect(p.offers[0]).toMatchObject({ itemCode: "shop:1", pointRate: 1, effectivePrice: 1982, holdReason: null });
    expect(p.previousMinEffectivePrice).toBe(2100);
    expect(p.fetchedAt).toBe("2026-11-08T07:06:00+09:00"); // いちばん新しい取得日時
  });

  it("保留中の価格は外す。表示できる価格がなければ載せない", () => {
    const held = offerRow({ hold_reason: "前回から50%以上の変動" });
    expect(toProductWithOffers(productRow([held, offerRow({ item_code: "x" })]), null)!.offers).toHaveLength(1);
    expect(toProductWithOffers(productRow([held]), null)).toBeNull();
    expect(toProductWithOffers(productRow([]), null)).toBeNull();
  });
});

describe("previousMinByProduct", () => {
  it("モールごとに一番新しい行を取り、その中の最安を使う", () => {
    const m = previousMinByProduct([
      { product_id: 1, mall: "rakuten", effective_price_min: 2000, fetched_at: "2026-11-07T07:00:00Z" },
      { product_id: 1, mall: "yahoo", effective_price_min: 1950, fetched_at: "2026-11-07T07:00:00Z" },
      { product_id: 1, mall: "yahoo", effective_price_min: 1500, fetched_at: "2026-11-06T22:00:00Z" }, // 古いので使わない
      { product_id: 2, mall: "rakuten", effective_price_min: 800, fetched_at: "2026-11-07T07:00:00Z" },
    ]);
    expect([...m]).toEqual([
      [1, 1950],
      [2, 800],
    ]);
  });
});

describe("バッチの保存の形", () => {
  const stored: StoredOffer = {
    mall: "rakuten",
    itemCode: "shop:1",
    shopName: "ショップA",
    price: 2000,
    shipping: null,
    shippingStatus: "unknown",
    pointRate: 1,
    points: 18,
    url: "https://example.com/a",
    effectivePrice: null,
    holdReason: null,
    referencePrice: 2000,
    fetchedAt: "2026-11-08T07:05:00.000Z",
  };

  it("保存した行を読み戻すと同じ値になる", () => {
    const row = toOfferRow(7, stored);
    expect(row).toMatchObject({ product_id: 7, item_code: "shop:1", shipping: null, reference_price: 2000 });
    expect(toStoredOffer({ ...row, id: 1, point_rate: "1" })).toEqual(stored);
  });

  it("今回出てこなかったショップの行だけを消す", () => {
    const existing = [
      { id: 1, item_code: "shop:1" },
      { id: 2, item_code: "shop:2" },
    ];
    expect(staleOfferIds(existing, [stored])).toEqual([2]);
    expect(staleOfferIds(existing, [])).toEqual([1, 2]);
  });
});

describe("dataMode", () => {
  afterEach(() => vi.unstubAllEnvs());
  const keys = () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
  };

  it("キーがそろっていれば supabase、なければ仮データ", () => {
    vi.stubEnv("DATA_SOURCE", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(dataMode()).toBe("mock");
    keys();
    expect(dataMode()).toBe("supabase");
  });

  it("DATA_SOURCE=mock なら、キーがあっても仮データ", () => {
    keys();
    vi.stubEnv("DATA_SOURCE", "mock");
    expect(dataMode()).toBe("mock");
  });

  it("DATA_SOURCE=supabase でキーがなければ止める（本番で仮データを出さないため）", () => {
    vi.stubEnv("DATA_SOURCE", "supabase");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(() => dataMode()).toThrow("DATA_SOURCE=supabase");
  });
});
