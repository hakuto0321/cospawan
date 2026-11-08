import type { Offer } from "@/lib/pricing";

/** 載せなかった商品と、その理由（あとで確かめるため） */
export type Skipped = { itemCode: string; shopName: string; reason: string };

export type MallResult = {
  offers: Offer[];
  skipped: Skipped[];
  /** API が返した件数 */
  total: number;
  /** 同じ JAN の口コミ数（Yahoo! のみ。取れなければ null） */
  reviewCount?: number | null;
  /** 商品画像のURL（Yahoo! のみ。取れなければ null） */
  imageUrl?: string | null;
  /** 同じ JAN の説明文（Yahoo! のみ。タグを決めるのに使う） */
  description?: string | null;
};
