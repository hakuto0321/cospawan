import type { MallResult } from "@/lib/malls/types";
import type { Mall, PricedOffer, TopOffer } from "@/lib/pricing";

/** 1つのモールから、1つの JAN の価格を取ってくる */
export type MallFetcher = {
  mall: Mall;
  fetch(jan: string): Promise<MallResult>;
};

export type BatchProduct = { id: number; jan: string };

/** offers_latest の1行 */
export type StoredOffer = PricedOffer & {
  /** 最後に公開した価格（保留した回は前の値を引き継ぐ） */
  referencePrice: number | null;
  fetchedAt: string;
};

export type HistoryRow = {
  productId: number;
  mall: Mall;
  effectivePriceMin: number;
  topOffers: TopOffer[];
  fetchedAt: string;
};

export type RunStatus = "succeeded" | "failed";

/** バッチが読み書きする先。メモリ（memoryRepo.ts）と Supabase（supabaseRepo.ts）の2つがある */
export interface BatchRepository {
  listActiveProducts(): Promise<BatchProduct[]>;
  getLatestOffers(productId: number): Promise<StoredOffer[]>;
  /** その商品・そのモールの最新価格を、まるごと入れ替える */
  replaceOffers(productId: number, mall: Mall, offers: StoredOffer[]): Promise<void>;
  /** 口コミ数を商品に保存する（人気順の目安） */
  updateReviewCount(productId: number, count: number): Promise<void>;
  /** 商品画像のURLを保存する */
  updateImageUrl(productId: number, url: string): Promise<void>;
  appendHistory(row: HistoryRow): Promise<void>;
  startRun(): Promise<number>;
  finishRun(runId: number, status: RunStatus, stats: BatchStats, error?: string): Promise<void>;
}

export type HeldItem = { jan: string; mall: Mall; shopName: string; price: number; reason: string };
export type FetchError = { jan: string; mall: Mall; message: string };

export type BatchStats = {
  products: number;
  fetches: number;
  fetchErrors: FetchError[];
  offersSaved: number;
  /** モールが返したが載せなかった件数（JAN 不一致など） */
  skipped: number;
  held: HeldItem[];
  historyRows: number;
  revalidated: boolean;
  /** モールごとに、応答を受け取れた回数（取得の失敗を除く） */
  answered?: Partial<Record<Mall, number>>;
  /** そのうち、件数が0だった回数（API の形が変わったときに増える） */
  emptyAnswers?: Partial<Record<Mall, number>>;
};
