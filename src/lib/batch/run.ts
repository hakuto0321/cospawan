// C5 定期バッチの本体
// 1. 全商品について、各モールから価格・送料・ポイントを取る
// 2. おかしな値は保留にする（「最後に公開した価格」と比べる）
// 3. 実質価格を計算して最新価格を入れ替え、モールごとの最安と上位を履歴に足す
// 4. ページを作り直す（再検証）
// 5. 実行の記録を残す。失敗が多いときは failed にする（呼び出し側が終了コードで知らせる）
import { inferTags } from "@/lib/tags";
import { priceOffer, rankOffers, summarizeMall, type Mall } from "@/lib/pricing";
import type {
  BatchProduct,
  BatchRepository,
  BatchStats,
  MallFetcher,
  RunStatus,
  StoredOffer,
} from "./types";

/** 取得の失敗がこの割合以上なら failed にする */
export const FAILURE_RATIO_LIMIT = 0.2;

export type RunBatchOptions = {
  repo: BatchRepository;
  fetchers: MallFetcher[];
  /** ページの作り直し。なければ飛ばす */
  revalidate?: () => Promise<void>;
  now?: () => Date;
  log?: (message: string) => void;
};

export type RunBatchResult = { runId: number; status: RunStatus; stats: BatchStats };

export async function runBatch(opts: RunBatchOptions): Promise<RunBatchResult> {
  const { repo, fetchers, revalidate, now = () => new Date(), log = () => {} } = opts;
  const runId = await repo.startRun();
  const stats: BatchStats = {
    products: 0,
    fetches: 0,
    fetchErrors: [],
    offersSaved: 0,
    skipped: 0,
    held: [],
    historyRows: 0,
    revalidated: false,
    answered: {},
    emptyAnswers: {},
  };

  try {
    const products = await repo.listActiveProducts();
    stats.products = products.length;
    log(`商品 ${products.length}件の価格を取ります`);

    for (const product of products) {
      await updateProduct(product, { repo, fetchers, now, stats, log });
    }

    if (revalidate && stats.offersSaved > 0) {
      try {
        await revalidate();
        stats.revalidated = true;
      } catch (e) {
        log(`ページの作り直しに失敗: ${message(e)}`);
      }
    }

    const status = decideStatus(stats);
    await repo.finishRun(runId, status, stats, status === "failed" ? summarizeErrors(stats) : undefined);
    return { runId, status, stats };
  } catch (e) {
    await repo.finishRun(runId, "failed", stats, message(e));
    throw e;
  }
}

async function updateProduct(
  product: BatchProduct,
  ctx: {
    repo: BatchRepository;
    fetchers: MallFetcher[];
    now: () => Date;
    stats: BatchStats;
    log: (m: string) => void;
  },
) {
  const { repo, fetchers, now, stats, log } = ctx;
  const previous = await repo.getLatestOffers(product.id);

  // 比べる基準：前回公開していた実質最安（全モール）
  const previousMin = rankOffers(previous)[0]?.effectivePrice ?? null;
  const prevByKey = new Map(previous.map((o) => [key(o.mall, o.itemCode), o]));

  // モールごとに並行して取る（それぞれのモールの呼び出し間隔は fetcher 側で守る）
  const results = await Promise.all(
    fetchers.map(async (f) => {
      stats.fetches++;
      try {
        return { mall: f.mall, result: await f.fetch(product.jan) };
      } catch (e) {
        stats.fetchErrors.push({ jan: product.jan, mall: f.mall, message: message(e) });
        log(`取得に失敗 ${product.jan} ${f.mall}: ${message(e)}`);
        return { mall: f.mall, result: null };
      }
    }),
  );

  // 犬種・大きさ・年齢は、名前と（取れていれば）Yahoo! の説明文から決める
  if (product.petType) {
    const yahooResult = results.find((r) => r.mall === "yahoo")?.result ?? null;
    const tags = inferTags({ name: product.name, description: yahooResult?.description ?? null, pet: product.petType });
    await repo.updateTags(product.id, { breeds: tags.breeds, sizes: tags.sizes, ages: tags.ages });
  }

  for (const { mall, result } of results) {
    // 取れなかったモールは前回のまま残す（取得日時が古いまま見える）
    if (!result) continue;
    stats.answered![mall] = (stats.answered![mall] ?? 0) + 1;
    if (result.total === 0) stats.emptyAnswers![mall] = (stats.emptyAnswers![mall] ?? 0) + 1;
    if (mall === "yahoo" && typeof result.reviewCount === "number") {
      await repo.updateReviewCount(product.id, result.reviewCount);
    }
    if (mall === "yahoo" && result.imageUrl) {
      await repo.updateImageUrl(product.id, result.imageUrl);
    }
    const fetchedAt = now().toISOString();
    stats.skipped += result.skipped.length;

    const stored: StoredOffer[] = result.offers.map((offer) => {
      const prev = prevByKey.get(key(mall, offer.itemCode));
      const priced = priceOffer(offer, {
        previousPrice: prev?.referencePrice ?? null,
        previousMinEffectivePrice: previousMin,
      });
      if (priced.holdReason) {
        stats.held.push({
          jan: product.jan,
          mall,
          shopName: offer.shopName,
          price: offer.price,
          reason: priced.holdReason,
        });
      }
      return {
        ...priced,
        referencePrice: priced.holdReason === null ? priced.price : (prev?.referencePrice ?? null),
        fetchedAt,
      };
    });

    await repo.replaceOffers(product.id, mall, stored);
    stats.offersSaved += stored.length;

    const summary = summarizeMall(stored, mall);
    if (summary) {
      await repo.appendHistory({
        productId: product.id,
        mall,
        effectivePriceMin: summary.effectivePriceMin,
        topOffers: summary.topOffers,
        fetchedAt,
      });
      stats.historyRows++;
    }
  }
}

/** 応答が空に偏っているモール（件数0が9割以上。5回以上応答があったとき）。API の形が変わった疑いがある */
export const EMPTY_RATIO_LIMIT = 0.9;
export const EMPTY_MIN_ANSWERS = 5;

export function emptyMalls(stats: BatchStats): Mall[] {
  const malls = Object.keys(stats.answered ?? {}) as Mall[];
  return malls.filter((m) => {
    const answered = stats.answered?.[m] ?? 0;
    const empty = stats.emptyAnswers?.[m] ?? 0;
    return answered >= EMPTY_MIN_ANSWERS && empty / answered >= EMPTY_RATIO_LIMIT;
  });
}

export function decideStatus(stats: BatchStats): RunStatus {
  if (emptyMalls(stats).length > 0) return "failed";
  if (stats.fetches === 0) return stats.products === 0 ? "succeeded" : "failed";
  return stats.fetchErrors.length / stats.fetches >= FAILURE_RATIO_LIMIT ? "failed" : "succeeded";
}

function summarizeErrors(stats: BatchStats): string {
  const empty = emptyMalls(stats);
  if (empty.length > 0) {
    return `件数が0の応答が多すぎます（${empty.join("、")}）。API の仕様が変わった可能性があります`;
  }
  const head = stats.fetchErrors
    .slice(0, 5)
    .map((e) => `${e.jan} ${e.mall}: ${e.message}`)
    .join(" / ");
  return `取得の失敗 ${stats.fetchErrors.length}/${stats.fetches}件。${head}`;
}

const key = (mall: Mall, itemCode: string) => `${mall}:${itemCode}`;
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
