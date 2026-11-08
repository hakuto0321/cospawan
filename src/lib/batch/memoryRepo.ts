// 開発用：バッチの保存先をメモリに持つ（再起動で消える）
import type { Mall } from "@/lib/pricing";
import type { BatchProduct, BatchRepository, BatchStats, HistoryRow, RunStatus, StoredOffer } from "./types";

type Run = { id: number; startedAt: string; finishedAt?: string; status: RunStatus | "running"; stats?: BatchStats; error?: string };

export function createMemoryBatchRepo(products: BatchProduct[], initialOffers: Record<number, StoredOffer[]> = {}) {
  const offers = new Map<number, StoredOffer[]>(Object.entries(initialOffers).map(([k, v]) => [Number(k), v]));
  const history: HistoryRow[] = [];
  const runs: Run[] = [];

  const repo: BatchRepository & { offers: typeof offers; history: typeof history; runs: typeof runs } = {
    offers,
    history,
    runs,
    async listActiveProducts() {
      return products;
    },
    async getLatestOffers(productId) {
      return offers.get(productId) ?? [];
    },
    async replaceOffers(productId: number, mall: Mall, next: StoredOffer[]) {
      const others = (offers.get(productId) ?? []).filter((o) => o.mall !== mall);
      offers.set(productId, [...others, ...next]);
    },
    async updateReviewCount() {
      // 仮データの保存先では、口コミ数は覚えない
    },
    async appendHistory(row) {
      history.push(row);
    },
    async startRun() {
      const id = runs.length + 1;
      runs.push({ id, startedAt: new Date().toISOString(), status: "running" });
      return id;
    },
    async finishRun(runId, status, stats, error) {
      const run = runs.find((r) => r.id === runId);
      if (run) Object.assign(run, { finishedAt: new Date().toISOString(), status, stats, error });
    },
  };
  return repo;
}
