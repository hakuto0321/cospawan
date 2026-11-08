// 自動登録の保存先：Supabase（管理用の鍵を使う）
import type { SupabaseClient } from "@supabase/supabase-js";
import { check } from "@/lib/supabase/client";
import type { DiscoveryRepo, DraftInsert } from "./run";

export function createDiscoveryRepo(db: SupabaseClient): DiscoveryRepo {
  return {
    async existingJans() {
      const rows = check(await db.from("products").select("jan"), "登録済みの商品の読み込み") as { jan: string }[];
      return new Set(rows.map((r) => r.jan));
    },
    async categoryIds() {
      const rows = check(await db.from("categories").select("id, slug"), "カテゴリの読み込み") as {
        id: number;
        slug: string;
      }[];
      return new Map(rows.map((r) => [r.slug, r.id]));
    },
    async insertDrafts(rows: DraftInsert[]) {
      check(await db.from("products").insert(rows), "下書きの登録");
    },
  };
}
