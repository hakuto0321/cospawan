import type { Mall, PricedOffer } from "@/lib/pricing";

export type Pet = "dog" | "cat";
export type PetType = Pet | "both";

export type Product = {
  id: number;
  jan: string;
  name: string;
  petType: PetType | null;
  categoryName: string;
  size: string | null;
  unit: string | null;
  amount: number | null;
  defaultPerDay: number | null;
  amazonUrl: string | null;
};

export type ProductWithOffers = {
  product: Product;
  /** 全ショップの最新価格（保留中・送料別も含む） */
  offers: PricedOffer[];
  /** 約24時間前の実質最安（全モール）。記録がなければ null */
  previousMinEffectivePrice: number | null;
  /** 最新の取得日時（ISO 8601） */
  fetchedAt: string;
};

export type SaleEvent = {
  mall: Mall;
  name: string;
  startsAt: string;
  endsAt: string;
  bonusRate: number | null;
};

/** 画面が使うデータの取り出し口。C1 で Supabase 版に差し替える */
export interface DataSource {
  /** 仮データのときは true（画面に注意書きを出す） */
  readonly isMock: boolean;
  getProductsForPet(pet: Pet): Promise<ProductWithOffers[]>;
  /** 掲載中の商品1件。見つからなければ null */
  getProduct(jan: string): Promise<ProductWithOffers | null>;
  /** 掲載中の全商品（sitemap や llms.txt 用） */
  getAllProducts(): Promise<ProductWithOffers[]>;
  /** 開催中か、これから始まるセール（開始が早い順） */
  getUpcomingEvents(now: Date): Promise<SaleEvent[]>;
}
