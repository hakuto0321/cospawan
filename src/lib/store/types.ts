import type { Mall } from "@/lib/pricing";

export type UsageEvent =
  | { type: "click_out"; productId: number; mall: Mall | "amazon" }
  | { type: "waitlist_signup"; productId: number | null };

export type WaitlistResult = "created" | "duplicate";

/** 書き込み先。C1 で Supabase 版に差し替える */
export interface EventStore {
  readonly name: string;
  recordUsageEvent(event: UsageEvent): Promise<void>;
  /** メールは小文字にそろえて渡す。同じメール・同じ商品はもう一度入れない */
  addWaitlist(entry: { email: string; productId: number | null }): Promise<WaitlistResult>;
}
