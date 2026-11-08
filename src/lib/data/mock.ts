// 開発用の仮データ。商品名・ショップ名・価格はすべて架空
import { basePoints, priceOffer, type Mall, type Offer, type ShippingStatus } from "@/lib/pricing";
import type { DataSource, Pet, PetType, Product, ProductWithOffers, SaleEvent } from "./types";

const FETCHED_AT = "2026-11-07T07:05:00+09:00";

type ShopRow = [mall: Mall, shopName: string, price: number, shipping: number | null, status: ShippingStatus, pointRate: number];

type MockItem = {
  product: Omit<Product, "id" | "amazonUrl" | "reviewCount">;
  previousMin: number | null;
  shops: ShopRow[];
};

// 開発用の口コミ数（商品の並び順に対応）
const MOCK_REVIEW_COUNTS = [1240, 880, 410, 230, 760, 95, 540, 120];

const items: MockItem[] = [
  {
    product: { jan: "2000000000015", name: "ナチュラルワン チキン＆玄米 成犬用 3kg", petType: "dog", categoryName: "フード", size: "3kg", unit: "g", amount: 3000 },
    previousMin: 4380,
    shops: [
      ["rakuten", "ペットの森", 4280, 0, "free", 5],
      ["yahoo", "わんにゃん館", 4180, 0, "free", 3],
      ["rakuten", "ドッグラボ", 3980, null, "unknown", 1],
    ],
  },
  {
    product: { jan: "2000000000022", name: "しっかり吸収ペットシーツ レギュラー 100枚", petType: "both", categoryName: "シーツ・トイレ", size: "100枚", unit: "枚", amount: 100 },
    previousMin: 1580,
    shops: [
      ["yahoo", "ペット日和", 1590, 0, "free", 5],
      ["rakuten", "ペットの森", 1650, 0, "free", 2],
      ["rakuten", "まとめ買い本舗", 1480, 390, "paid", 1],
    ],
  },
  {
    product: { jan: "2000000000039", name: "国産ささみジャーキー 400g", petType: "dog", categoryName: "おやつ", size: "400g", unit: "g", amount: 400 },
    previousMin: null,
    shops: [
      ["rakuten", "ドッグラボ", 1280, 0, "free", 1],
      ["yahoo", "わんにゃん館", 1250, 0, "free", 1],
    ],
  },
  {
    product: { jan: "2000000000046", name: "デンタルガム Mサイズ 30本", petType: "dog", categoryName: "ケア用品", size: "30本", unit: "本", amount: 30 },
    previousMin: 1520,
    shops: [
      ["yahoo", "ペット日和", 1480, 0, "free", 4],
      ["rakuten", "ペットの森", 1520, 0, "free", 3],
    ],
  },
  {
    product: { jan: "2000000000053", name: "まんぷくキャット まぐろ味 2kg", petType: "cat", categoryName: "フード", size: "2kg", unit: "g", amount: 2000 },
    previousMin: 2420,
    shops: [
      ["rakuten", "ねこの手", 2380, 0, "free", 4],
      ["yahoo", "わんにゃん館", 2290, 0, "free", 2],
    ],
  },
  {
    product: { jan: "2000000000060", name: "固まる紙の猫砂 7L×6袋", petType: "cat", categoryName: "シーツ・トイレ", size: "7L×6袋", unit: "袋", amount: 6 },
    previousMin: 3300,
    shops: [
      ["rakuten", "ねこの手", 3480, 0, "free", 5],
      ["yahoo", "ペット日和", 3380, 0, "free", 3],
      ["rakuten", "まとめ買い本舗", 3180, 600, "paid", 1],
    ],
  },
  {
    product: { jan: "2000000000077", name: "システムトイレ用シート 1週間用 20枚", petType: "cat", categoryName: "シーツ・トイレ", size: "20枚", unit: "枚", amount: 20 },
    previousMin: 1160,
    shops: [
      ["rakuten", "ねこの手", 1180, 0, "free", 1],
      ["yahoo", "わんにゃん館", 1150, 0, "free", 1],
    ],
  },
  {
    product: { jan: "2000000000084", name: "とろ〜りスティック まぐろ 14g×40本", petType: "cat", categoryName: "おやつ", size: "40本", unit: "本", amount: 40 },
    previousMin: 1600,
    shops: [
      ["yahoo", "ペット日和", 1580, 0, "free", 4],
      ["rakuten", "ねこの手", 1620, 0, "free", 3],
    ],
  },
  {
    product: { jan: "2000000000091", name: "【仮】うさぎ用 牧草 チモシー 1kg", petType: "small", categoryName: "フード", size: "1kg", unit: "g", amount: 1000 },
    previousMin: 1480,
    shops: [
      ["rakuten", "ペットの森", 1380, 0, "free", 2],
      ["yahoo", "ペット日和", 1420, 0, "free", 3],
    ],
  },
];

function toProductWithOffers(item: MockItem, index: number): ProductWithOffers {
  const offers = item.shops.map(([mall, shopName, price, shipping, status, pointRate], i) => {
    const offer: Offer = {
      mall,
      itemCode: `${item.product.jan}-${i}`,
      shopName,
      price,
      shipping,
      shippingStatus: status,
      pointRate,
      points: basePoints(price, pointRate),
      url: "https://example.com/",
    };
    return priceOffer(offer);
  });
  return {
    product: {
      ...item.product,
      id: index + 1,
      amazonUrl: "https://www.amazon.co.jp/",
      reviewCount: MOCK_REVIEW_COUNTS[index] ?? null,
    },
    offers,
    previousMinEffectivePrice: item.previousMin,
    fetchedAt: FETCHED_AT,
  };
}

const all = items.map(toProductWithOffers);

const events: SaleEvent[] = [
  {
    mall: "rakuten",
    name: "お買い物マラソン",
    startsAt: "2026-11-10T20:00:00+09:00",
    endsAt: "2026-11-16T01:59:00+09:00",
    bonusRate: null,
  },
];

export function matchesPet(petType: PetType | null, pet: Pet): boolean {
  // 「both」は犬と猫の両方に出す。小動物は小動物だけ
  if (pet === "small") return petType === "small";
  return petType === pet || petType === "both";
}

export const mockDataSource: DataSource = {
  isMock: true,
  async getProductsForPet(pet) {
    return all.filter((p) => matchesPet(p.product.petType, pet));
  },
  async getProduct(jan) {
    return all.find((p) => p.product.jan === jan) ?? null;
  },
  async getAllProducts() {
    return all;
  },
  async getUpcomingEvents(now) {
    return events
      .filter((e) => new Date(e.endsAt) > now)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  },
};
