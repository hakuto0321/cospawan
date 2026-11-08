// 画面の表示用に、Supabase から商品と価格を読む（公開用の鍵で読むので、RLS で公開中のものだけが返る）
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Mall, PricedOffer, ShippingStatus } from "@/lib/pricing";
import { isOfferFresh } from "@/lib/health";
import { check } from "@/lib/supabase/client";
import { matchesPet } from "./mock";
import type { DataSource, PetType, ProductWithOffers, SaleEvent } from "./types";

/** 「前回」として比べる価格履歴の範囲（約1日前） */
const PREVIOUS_FROM_HOURS = 48;
const PREVIOUS_TO_HOURS = 20;

const PRODUCT_COLUMNS =
  "id, jan, name, pet_type, size, unit, amount, default_per_day, amazon_url, review_count, image_url, categories(name), " +
  "offers_latest(mall, item_code, shop_name, price, shipping, shipping_status, point_rate, points, effective_price, url, fetched_at, hold_reason)";

export type OfferRow = {
  mall: Mall;
  item_code: string;
  shop_name: string;
  price: number;
  shipping: number | null;
  shipping_status: ShippingStatus;
  point_rate: number | string;
  points: number;
  effective_price: number | null;
  url: string;
  fetched_at: string;
  hold_reason: string | null;
};

export type ProductRow = {
  id: number;
  jan: string;
  name: string;
  pet_type: PetType | null;
  size: string | null;
  unit: string | null;
  amount: number | string | null;
  default_per_day: number | string | null;
  amazon_url: string | null;
  review_count: number | null;
  image_url: string | null;
  categories: { name: string } | null;
  offers_latest: OfferRow[];
};

export type HistoryRow = { product_id: number; mall: Mall; effective_price_min: number; fetched_at: string };

const num = (v: number | string | null): number | null => (v === null ? null : Number(v));

export function toPricedOffer(r: OfferRow): PricedOffer {
  return {
    mall: r.mall,
    itemCode: r.item_code,
    shopName: r.shop_name,
    price: r.price,
    shipping: r.shipping,
    shippingStatus: r.shipping_status,
    pointRate: Number(r.point_rate),
    points: r.points,
    url: r.url,
    effectivePrice: r.effective_price,
    holdReason: r.hold_reason,
  };
}

/**
 * DB の1行を画面用の形にする。表示できる価格（保留していないもの）が1つもなければ null（載せない）
 */
export function toProductWithOffers(
  row: ProductRow,
  previousMin: number | null,
  now: Date = new Date(),
): ProductWithOffers | null {
  // 保留中の価格は外す。取得から24時間を過ぎた価格も、古すぎるので出さない（モールの取得が止まったときの守り）
  const visible = row.offers_latest.filter((o) => o.hold_reason === null && isOfferFresh(o.fetched_at, now));
  if (visible.length === 0) return null;
  const fetchedAt = visible.map((o) => o.fetched_at).reduce((a, b) => (Date.parse(a) >= Date.parse(b) ? a : b));
  return {
    product: {
      id: row.id,
      jan: row.jan,
      name: row.name,
      petType: row.pet_type,
      categoryName: row.categories?.name ?? "",
      size: row.size,
      unit: row.unit,
      amount: num(row.amount),
      defaultPerDay: num(row.default_per_day),
      amazonUrl: row.amazon_url,
      reviewCount: row.review_count,
      imageUrl: row.image_url,
    },
    offers: visible.map(toPricedOffer),
    previousMinEffectivePrice: previousMin,
    fetchedAt,
  };
}

/**
 * 約1日前の実質最安（全モール）を商品ごとに求める。
 * 履歴は新しい順に渡す。モールごとに一番新しい行を取り、その中の最安を使う
 */
export function previousMinByProduct(historyNewestFirst: HistoryRow[]): Map<number, number> {
  const latestPerMall = new Map<string, number>();
  for (const h of historyNewestFirst) {
    const key = `${h.product_id}:${h.mall}`;
    if (!latestPerMall.has(key)) latestPerMall.set(key, h.effective_price_min);
  }
  const out = new Map<number, number>();
  for (const [key, price] of latestPerMall) {
    const productId = Number(key.split(":")[0]);
    const cur = out.get(productId);
    if (cur === undefined || price < cur) out.set(productId, price);
  }
  return out;
}

export function createSupabaseDataSource(db: SupabaseClient, now: () => Date = () => new Date()): DataSource {
  async function load(jan?: string): Promise<ProductWithOffers[]> {
    let q = db.from("products").select(PRODUCT_COLUMNS).eq("status", "active").order("id");
    if (jan !== undefined) q = q.eq("jan", jan);
    const rows = check(await q, "商品の読み込み") as unknown as ProductRow[];
    if (rows.length === 0) return [];

    const t = now().getTime();
    const hours = (h: number) => new Date(t - h * 3_600_000).toISOString();
    const history = check(
      await db
        .from("price_history")
        .select("product_id, mall, effective_price_min, fetched_at")
        .in(
          "product_id",
          rows.map((r) => r.id),
        )
        .gte("fetched_at", hours(PREVIOUS_FROM_HOURS))
        .lte("fetched_at", hours(PREVIOUS_TO_HOURS))
        .order("fetched_at", { ascending: false }),
      "価格履歴の読み込み",
    ) as HistoryRow[];
    const prev = previousMinByProduct(history);

    return rows
      .map((r) => toProductWithOffers(r, prev.get(r.id) ?? null))
      .filter((p): p is ProductWithOffers => p !== null);
  }

  return {
    isMock: false,
    async getProductsForPet(pet) {
      return (await load()).filter((p) => matchesPet(p.product.petType, pet));
    },
    async getProduct(jan) {
      if (!/^[0-9]{8}$|^[0-9]{13}$/.test(jan)) return null;
      return (await load(jan))[0] ?? null;
    },
    async getAllProducts() {
      return load();
    },
    async getUpcomingEvents(at) {
      const rows = check(
        await db
          .from("events")
          .select("mall, name, starts_at, ends_at, bonus_rate")
          .gt("ends_at", at.toISOString())
          .order("starts_at"),
        "セールの予定の読み込み",
      ) as { mall: Mall; name: string; starts_at: string; ends_at: string; bonus_rate: number | string | null }[];
      return rows.map(
        (e): SaleEvent => ({
          mall: e.mall,
          name: e.name,
          startsAt: e.starts_at,
          endsAt: e.ends_at,
          bonusRate: num(e.bonus_rate),
        }),
      );
    },
  };
}
