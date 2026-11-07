import { dataMode, getPublicClient } from "@/lib/supabase/client";
import { mockDataSource } from "./mock";
import { createSupabaseDataSource } from "./supabase";
import type { DataSource } from "./types";

export type * from "./types";

let supabaseSource: DataSource | null = null;

/** 画面はここからデータを取る。Supabase のキーがあれば Supabase、なければ仮データ */
export function getDataSource(): DataSource {
  if (dataMode() === "mock") return mockDataSource;
  return (supabaseSource ??= createSupabaseDataSource(getPublicClient()));
}
