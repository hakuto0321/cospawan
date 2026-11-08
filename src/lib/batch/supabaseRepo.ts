// 定期バッチの保存先：Supabase（管理用の鍵を使う）
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OfferRow } from "@/lib/data/supabase";
import { toPricedOffer } from "@/lib/data/supabase";
import type { Mall } from "@/lib/pricing";
import { check } from "@/lib/supabase/client";
import type { BatchRepository, StoredOffer } from "./types";

type StoredOfferRow = OfferRow & { id: number; reference_price: number | null };

export function toStoredOffer(r: StoredOfferRow): StoredOffer {
  return { ...toPricedOffer(r), referencePrice: r.reference_price, fetchedAt: r.fetched_at };
}

export function toOfferRow(productId: number, o: StoredOffer) {
  return {
    product_id: productId,
    mall: o.mall,
    item_code: o.itemCode,
    shop_name: o.shopName,
    price: o.price,
    shipping: o.shipping,
    shipping_status: o.shippingStatus,
    point_rate: o.pointRate,
    points: o.points,
    effective_price: o.effectivePrice,
    url: o.url,
    fetched_at: o.fetchedAt,
    hold_reason: o.holdReason,
    reference_price: o.referencePrice,
  };
}

/** 今回の取得に出てこなかった行（売り切れ・掲載終了など）の id */
export function staleOfferIds(existing: { id: number; item_code: string }[], next: StoredOffer[]): number[] {
  const keep = new Set(next.map((o) => o.itemCode));
  return existing.filter((r) => !keep.has(r.item_code)).map((r) => r.id);
}

export function createSupabaseBatchRepo(db: SupabaseClient): BatchRepository {
  return {
    async listActiveProducts() {
      const rows = check(
        await db.from("products").select("id, jan, name, pet_type").eq("status", "active").order("id"),
        "掲載中の商品の読み込み",
      ) as { id: number; jan: string; name: string; pet_type: "dog" | "cat" | "both" | "small" | null }[];
      return rows.map((r) => ({ id: r.id, jan: r.jan, name: r.name, petType: r.pet_type }));
    },

    async getLatestOffers(productId) {
      const rows = check(
        await db.from("offers_latest").select("*").eq("product_id", productId).order("id"),
        "最新価格の読み込み",
      ) as StoredOfferRow[];
      return rows.map(toStoredOffer);
    },

    // 消してから入れると、その間だけ価格が消えて見えるので、先に上書き・追加してから、出てこなかった行を消す
    async replaceOffers(productId: number, mall: Mall, offers: StoredOffer[]) {
      if (offers.length > 0) {
        check(
          await db
            .from("offers_latest")
            .upsert(
              offers.map((o) => toOfferRow(productId, o)),
              { onConflict: "product_id,mall,item_code" },
            ),
          "最新価格の保存",
        );
      }
      const existing = check(
        await db.from("offers_latest").select("id, item_code").eq("product_id", productId).eq("mall", mall),
        "最新価格の読み込み",
      ) as { id: number; item_code: string }[];
      const stale = staleOfferIds(existing, offers);
      if (stale.length > 0) {
        check(await db.from("offers_latest").delete().in("id", stale), "古い価格の削除");
      }
    },

    async updateTags(productId, tags) {
      check(
        await db.from("products").update({ breeds: tags.breeds, sizes: tags.sizes, ages: tags.ages }).eq("id", productId),
        "タグの保存",
      );
    },

    async updateImageUrl(productId, url) {
      check(await db.from("products").update({ image_url: url }).eq("id", productId), "画像URLの保存");
    },

    async updateReviewCount(productId, count) {
      check(
        await db
          .from("products")
          .update({ review_count: count, review_updated_at: new Date().toISOString() })
          .eq("id", productId),
        "口コミ数の保存",
      );
    },

    async appendHistory(row) {
      check(
        await db.from("price_history").insert({
          product_id: row.productId,
          mall: row.mall,
          effective_price_min: row.effectivePriceMin,
          top_offers: row.topOffers,
          fetched_at: row.fetchedAt,
        }),
        "価格履歴の保存",
      );
    },

    async startRun() {
      const run = check(
        await db.from("batch_runs").insert({ status: "running" }).select("id").single(),
        "実行記録の作成",
      ) as { id: number };
      return run.id;
    },

    async finishRun(runId, status, stats, error) {
      check(
        await db
          .from("batch_runs")
          .update({ status, stats, error: error ?? null, finished_at: new Date().toISOString() })
          .eq("id", runId),
        "実行記録の更新",
      );
    },
  };
}
