// 開発用：サーバーのメモリに保存する。再起動すると消える
import type { EventStore, UsageEvent } from "./types";

type Stored<T> = T & { createdAt: string };

export function createMemoryStore() {
  const usageEvents: Stored<UsageEvent>[] = [];
  const waitlist: Stored<{ email: string; productId: number | null }>[] = [];

  const store: EventStore & {
    usageEvents: typeof usageEvents;
    waitlist: typeof waitlist;
    reset(): void;
  } = {
    name: "memory",
    usageEvents,
    waitlist,
    async recordUsageEvent(event) {
      usageEvents.push({ ...event, createdAt: new Date().toISOString() });
    },
    async addWaitlist({ email, productId }) {
      if (waitlist.some((w) => w.email === email && w.productId === productId)) return "duplicate";
      waitlist.push({ email, productId, createdAt: new Date().toISOString() });
      return "created";
    },
    reset() {
      usageEvents.length = 0;
      waitlist.length = 0;
    },
  };
  return store;
}

export const memoryStore = createMemoryStore();
