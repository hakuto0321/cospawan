import type { Offer } from "@/lib/pricing";

/** 載せなかった商品と、その理由（あとで確かめるため） */
export type Skipped = { itemCode: string; shopName: string; reason: string };

export type MallResult = {
  offers: Offer[];
  skipped: Skipped[];
  /** API が返した件数 */
  total: number;
};
