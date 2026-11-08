import { describe, expect, it, vi } from "vitest";
import type { Mall, Offer } from "@/lib/pricing";
import { createMemoryBatchRepo } from "./memoryRepo";
import { createRevalidator } from "./revalidate";
import { decideStatus, emptyMalls, runBatch } from "./run";
import type { BatchStats, MallFetcher } from "./types";

const JAN = "2000000000015";

const offer = (mall: Mall, itemCode: string, price: number, extra: Partial<Offer> = {}): Offer => ({
  mall,
  itemCode,
  shopName: `${mall}-${itemCode}`,
  price,
  shipping: 0,
  shippingStatus: "free",
  pointRate: 0,
  points: 0,
  url: `https://example.com/${itemCode}`,
  ...extra,
});

/** 回ごとに返す価格を変えられる取得部品 */
function fetcherSeq(mall: Mall, rounds: Offer[][] | (() => never)): MallFetcher {
  let n = 0;
  return {
    mall,
    async fetch() {
      if (typeof rounds === "function") return rounds();
      const offers = rounds[Math.min(n++, rounds.length - 1)];
      return { offers, skipped: [], total: offers.length };
    },
  };
}

const clock = () => {
  let t = Date.parse("2026-11-08T07:00:00+09:00");
  return () => new Date((t += 1000));
};

describe("runBatch", () => {
  it("取得して保存し、モールごとの最安を履歴に足し、作り直しを1回呼ぶ", async () => {
    const repo = createMemoryBatchRepo([{ id: 1, jan: JAN }]);
    const revalidate = vi.fn(async () => {});
    const { status, stats } = await runBatch({
      repo,
      fetchers: [
        fetcherSeq("rakuten", [[offer("rakuten", "a", 2000), offer("rakuten", "b", 1900, { shippingStatus: "unknown", shipping: null })]]),
        fetcherSeq("yahoo", [[offer("yahoo", "c", 2100)]]),
      ],
      revalidate,
      now: clock(),
    });

    expect(status).toBe("succeeded");
    expect(stats).toMatchObject({ products: 1, fetches: 2, offersSaved: 3, historyRows: 2, revalidated: true });
    expect(revalidate).toHaveBeenCalledOnce();
    const saved = repo.offers.get(1)!;
    expect(saved.map((o) => [o.itemCode, o.effectivePrice, o.referencePrice])).toEqual([
      ["a", 2000, 2000],
      ["b", null, 1900], // 送料別：実質は出さないが、価格の基準は持つ
      ["c", 2100, 2100],
    ]);
    expect(repo.history.map((h) => [h.mall, h.effectivePriceMin])).toEqual([
      ["rakuten", 2000],
      ["yahoo", 2100],
    ]);
    expect(repo.runs[0]).toMatchObject({ status: "succeeded" });
  });

  it("50%以上の変動は保留し、基準の価格は前回のまま引き継ぐ。戻れば公開する", async () => {
    const repo = createMemoryBatchRepo([{ id: 1, jan: JAN }]);
    const rakuten = fetcherSeq("rakuten", [
      [offer("rakuten", "a", 2000)],
      [offer("rakuten", "a", 900)], // 急に安い → 保留
      [offer("rakuten", "a", 950)], // まだ基準(2000)から50%以上 → 保留のまま
      [offer("rakuten", "a", 1980)], // 戻った → 公開
    ]);
    const yahoo = fetcherSeq("yahoo", [[offer("yahoo", "c", 2100)]]);
    const now = clock();

    await runBatch({ repo, fetchers: [rakuten, yahoo], now });
    const second = await runBatch({ repo, fetchers: [rakuten, yahoo], now });
    expect(second.stats.held).toEqual([
      { jan: JAN, mall: "rakuten", shopName: "rakuten-a", price: 900, reason: "前回から50%以上の変動" },
    ]);
    expect(repo.offers.get(1)!.find((o) => o.itemCode === "a")).toMatchObject({
      price: 900,
      holdReason: "前回から50%以上の変動",
      referencePrice: 2000,
    });

    const third = await runBatch({ repo, fetchers: [rakuten, yahoo], now });
    expect(third.stats.held).toHaveLength(1);

    const fourth = await runBatch({ repo, fetchers: [rakuten, yahoo], now });
    expect(fourth.stats.held).toHaveLength(0);
    expect(repo.offers.get(1)!.find((o) => o.itemCode === "a")).toMatchObject({ price: 1980, referencePrice: 1980 });
  });

  it("保留した回は、そのモールの履歴に保留中の価格を入れない", async () => {
    const repo = createMemoryBatchRepo([{ id: 1, jan: JAN }]);
    const rakuten = fetcherSeq("rakuten", [[offer("rakuten", "a", 2000)], [offer("rakuten", "a", 500)]]);
    const now = clock();
    await runBatch({ repo, fetchers: [rakuten], now });
    await runBatch({ repo, fetchers: [rakuten], now });
    expect(repo.history.map((h) => h.effectivePriceMin)).toEqual([2000]);
  });

  it("取れなかったモールは前回の価格を残す。失敗が2割以上なら failed", async () => {
    const repo = createMemoryBatchRepo([{ id: 1, jan: JAN }]);
    const now = clock();
    await runBatch({
      repo,
      fetchers: [fetcherSeq("rakuten", [[offer("rakuten", "a", 2000)]]), fetcherSeq("yahoo", [[offer("yahoo", "c", 2100)]])],
      now,
    });
    const broken = fetcherSeq("yahoo", () => {
      throw new Error("HTTP 503");
    });
    const { status, stats } = await runBatch({
      repo,
      fetchers: [fetcherSeq("rakuten", [[offer("rakuten", "a", 2010)]]), broken],
      now,
    });
    expect(status).toBe("failed");
    expect(stats.fetchErrors).toEqual([{ jan: JAN, mall: "yahoo", message: "HTTP 503" }]);
    expect(repo.offers.get(1)!.map((o) => [o.itemCode, o.price])).toEqual([
      ["c", 2100], // Yahoo! は前回のまま
      ["a", 2010],
    ]);
    expect(repo.runs[1]).toMatchObject({ status: "failed" });
    expect(repo.runs[1].error).toContain("取得の失敗 1/2件");
  });

  it("作り直しに失敗しても、価格の保存は成功として扱う", async () => {
    const repo = createMemoryBatchRepo([{ id: 1, jan: JAN }]);
    const { status, stats } = await runBatch({
      repo,
      fetchers: [fetcherSeq("rakuten", [[offer("rakuten", "a", 2000)]])],
      revalidate: async () => {
        throw new Error("HTTP 500");
      },
    });
    expect(status).toBe("succeeded");
    expect(stats.revalidated).toBe(false);
  });

  it("途中で止まったら failed を記録して例外を投げる", async () => {
    const repo = createMemoryBatchRepo([{ id: 1, jan: JAN }]);
    repo.replaceOffers = async () => {
      throw new Error("DB down");
    };
    await expect(runBatch({ repo, fetchers: [fetcherSeq("rakuten", [[offer("rakuten", "a", 2000)]])] })).rejects.toThrow(
      "DB down",
    );
    expect(repo.runs[0]).toMatchObject({ status: "failed", error: "DB down" });
  });
});

describe("decideStatus", () => {
  const base: BatchStats = {
    products: 10,
    fetches: 20,
    fetchErrors: [],
    offersSaved: 0,
    skipped: 0,
    held: [],
    historyRows: 0,
    revalidated: false,
  };
  const errors = (n: number) => Array.from({ length: n }, () => ({ jan: JAN, mall: "yahoo" as const, message: "x" }));
  it("失敗が2割未満なら成功、2割以上なら失敗", () => {
    expect(decideStatus({ ...base, fetchErrors: errors(3) })).toBe("succeeded");
    expect(decideStatus({ ...base, fetchErrors: errors(4) })).toBe("failed");
  });
  it("商品があるのに1回も取得していなければ失敗", () => {
    expect(decideStatus({ ...base, fetches: 0 })).toBe("failed");
    expect(decideStatus({ ...base, products: 0, fetches: 0 })).toBe("succeeded");
  });
});

describe("createRevalidator", () => {
  it("合言葉をヘッダーに付けて POST する", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    await createRevalidator("https://cospawan.example/", "s3cret", fetchImpl as unknown as typeof fetch)();
    expect(fetchImpl).toHaveBeenCalledWith("https://cospawan.example/api/revalidate", {
      method: "POST",
      headers: { "x-revalidate-secret": "s3cret" },
    });
  });
  it("失敗したら例外", async () => {
    const fetchImpl = vi.fn(async () => new Response("no", { status: 401 }));
    await expect(createRevalidator("https://x.example", "bad", fetchImpl as unknown as typeof fetch)()).rejects.toThrow("401");
  });
});

const emptyStats = (): BatchStats => ({
  products: 1,
  fetches: 0,
  fetchErrors: [],
  offersSaved: 0,
  skipped: 0,
  held: [],
  historyRows: 0,
  revalidated: false,
});

describe("空の応答（API の形が変わった疑い）", () => {
  it("件数0の応答が9割以上なら、そのモールがあるとき失敗にする", () => {
    const stats = { ...emptyStats(), fetches: 10, answered: { rakuten: 10 }, emptyAnswers: { rakuten: 9 } };
    expect(decideStatus(stats)).toBe("failed");
    expect(emptyMalls(stats)).toEqual(["rakuten"]);
  });
  it("応答が5回未満なら、空でも判定しない", () => {
    const stats = { ...emptyStats(), fetches: 4, answered: { rakuten: 4 }, emptyAnswers: { rakuten: 4 } };
    expect(decideStatus(stats)).toBe("succeeded");
  });
});
