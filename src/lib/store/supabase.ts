// 送客クリックと事前登録を Supabase に保存する（管理用の鍵を使う。サーバーの中だけで動く）
import type { SupabaseClient } from "@supabase/supabase-js";
import { check } from "@/lib/supabase/client";
import type { EventStore } from "./types";

/** Postgres の「一意の制約に反した」エラー */
const UNIQUE_VIOLATION = "23505";

export function createSupabaseStore(db: SupabaseClient): EventStore {
  return {
    name: "supabase",
    async recordUsageEvent(event) {
      const row: { type: string; product_id: number | null; mall: string | null } = {
        type: event.type,
        product_id: event.productId,
        mall: event.type === "click_out" ? event.mall : null,
      };
      check(await db.from("usage_events").insert(row), "利用の記録");
    },
    async addWaitlist({ email, productId }) {
      const res = await db.from("waitlist").insert({ email, product_id: productId });
      // 同じメール・同じ商品はすでに登録済み（DB の一意の索引で判定する）
      if (res.error?.code === UNIQUE_VIOLATION) return "duplicate";
      check(res, "事前登録の保存");
      return "created";
    },
  };
}
