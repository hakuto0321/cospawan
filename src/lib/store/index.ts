import { memoryStore } from "./memory";
import type { EventStore } from "./types";

export type * from "./types";

/** 書き込み先。C1 で Supabase に切り替える */
export function getEventStore(): EventStore {
  return memoryStore;
}
