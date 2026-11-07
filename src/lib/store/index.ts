import { dataMode, getAdminClient } from "@/lib/supabase/client";
import { memoryStore } from "./memory";
import { createSupabaseStore } from "./supabase";
import type { EventStore } from "./types";

export type * from "./types";

let supabaseStore: EventStore | null = null;

/** 書き込み先。Supabase を使うときは DB、仮データのときはメモリ（再起動で消える） */
export function getEventStore(): EventStore {
  if (dataMode() === "mock") return memoryStore;
  return (supabaseStore ??= createSupabaseStore(getAdminClient()));
}
