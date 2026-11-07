import { mockDataSource } from "./mock";
import type { DataSource } from "./types";

export type * from "./types";

/** 画面はここからデータを取る。C1 で Supabase に切り替える */
export function getDataSource(): DataSource {
  return mockDataSource;
}
