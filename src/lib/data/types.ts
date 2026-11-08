import type { Mall, PricedOffer } from "@/lib/pricing";

/** 犬・猫・小動物（犬と猫以外。うさぎ・ハムスター・小鳥など） */
export type Pet = "dog" | "cat" | "small";
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
  amazonUrl: string | null;
  /** Yahoo!ショッピングの口コミ数。取れていなければ null。売れた数ではない */
  reviewCount: number | null;
  /** 商品画像のURL。取れていなければ null。表示するときは、ショップのページへのリンクとセットにする */
  imageUrl?: string | null;
  /** 名前と説明文から自動で決めたタグ（対象の犬種・猫種、大きさ、年齢）。無ければ空 */
  breeds?: string[];
  sizes?: ("small" | "medium" | "large")[];
  ages?: ("young" | "adult" | "senior")[];
};

export type ProductWithOffers = {
  product: Product;
  /** 全ショップの最新価格（保留中・送料別も含む） */
  offers: PricedOffer[];
  /** 約24時間前の実質最安（全モール）。記録がなければ null */
  previousMinEffectivePrice: number | null;
  /** 最新の取得日時（ISO 8601） */
  fetchedAt: string;
  /** モールごとの最後の取得日時（保留・古いものも含む。見張り用）。仮データでは無いこともある */
  mallFetchedAt?: Partial<Record<Mall, string>>;
};

export type SaleEvent = {
  mall: Mall;
  name: string;
  startsAt: string;
  endsAt: string;
  bonusRate: number | null;
};

/** 画面が使うデータの取り出し口。仮データ（mock.ts）と Supabase（supabase.ts）の2つがある */
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
