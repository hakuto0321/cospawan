// Supabase につなぐ部品
// - 公開用（publishable key）：画面の表示に使う。RLS で「公開中の商品と価格」しか読めない
// - 管理用（secret key）：送客クリック・事前登録の保存と、定期バッチに使う。サーバーの中だけで使う
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type DataMode = "mock" | "supabase";

/**
 * 仮データと Supabase のどちらを使うか。
 * DATA_SOURCE=mock / supabase で決める。指定がなければ、キーがそろっていれば supabase。
 * 本番では DATA_SOURCE=supabase を入れておく（キーが抜けたときに仮データを出さず、止めるため）
 */
export function dataMode(): DataMode {
  const forced = process.env.DATA_SOURCE;
  if (forced === "mock") return "mock";
  const ready = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (forced === "supabase" && !ready) {
    throw new Error("DATA_SOURCE=supabase ですが、NEXT_PUBLIC_SUPABASE_URL か NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY がありません");
  }
  return ready ? "supabase" : "mock";
}

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

let publicClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

/** 画面の表示用（だれが見てもよい範囲だけ読める） */
export function getPublicClient(): SupabaseClient {
  // NEXT_PUBLIC_ の値はビルド時に埋め込まれるので、process.env.〜 をそのまま書く
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY が必要です");
  return (publicClient ??= createClient(url, key, options));
}

/** 書き込み用（何でもできる鍵）。ブラウザに渡るコードからは呼ばない */
export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SECRET_KEY が必要です");
  return (adminClient ??= createClient(url, key, options));
}

/** Supabase のエラーを、メッセージ付きの例外にする */
export function check<T>(res: { data: T; error: { message: string; code?: string } | null }, what: string): T {
  if (res.error) throw new SupabaseError(`${what}に失敗: ${res.error.message}`, res.error.code);
  return res.data;
}

export class SupabaseError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "SupabaseError";
  }
}
