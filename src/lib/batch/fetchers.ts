// バッチで使う取得部品
import { mockDataSource } from "@/lib/data/mock";
import { createRateLimiter } from "@/lib/malls/http";
import { fetchRakutenOffers, type RakutenConfig } from "@/lib/malls/rakuten";
import { fetchYahooOffers, YAHOO_MIN_INTERVAL_MS, type YahooConfig } from "@/lib/malls/yahoo";
import type { Mall, Offer } from "@/lib/pricing";
import type { MallFetcher } from "./types";

/** 楽天は数値の制限が公表されていないので、Yahoo! と同じく1秒に1回にする */
const RAKUTEN_MIN_INTERVAL_MS = 1_100;

export function createRakutenFetcher(cfg: RakutenConfig): MallFetcher {
  const schedule = createRateLimiter(RAKUTEN_MIN_INTERVAL_MS);
  return { mall: "rakuten", fetch: (jan) => schedule(() => fetchRakutenOffers(jan, cfg)) };
}

export function createYahooFetcher(cfg: YahooConfig): MallFetcher {
  const schedule = createRateLimiter(YAHOO_MIN_INTERVAL_MS);
  return { mall: "yahoo", fetch: (jan) => schedule(() => fetchYahooOffers(jan, cfg)) };
}

/** 環境変数から、本物の API につなぐ取得部品を作る。足りないキーを返す */
export function createFetchersFromEnv(env: NodeJS.ProcessEnv): { fetchers: MallFetcher[]; missing: string[] } {
  const missing: string[] = [];
  const siteUrl = env.RAKUTEN_SITE_URL || env.NEXT_PUBLIC_SITE_URL;
  if (!env.RAKUTEN_APPLICATION_ID) missing.push("RAKUTEN_APPLICATION_ID");
  if (!env.RAKUTEN_ACCESS_KEY) missing.push("RAKUTEN_ACCESS_KEY");
  if (!siteUrl) missing.push("RAKUTEN_SITE_URL（または NEXT_PUBLIC_SITE_URL）");
  if (!env.YAHOO_CLIENT_ID) missing.push("YAHOO_CLIENT_ID");
  if (missing.length > 0) return { fetchers: [], missing };

  return {
    missing,
    fetchers: [
      createRakutenFetcher({
        applicationId: env.RAKUTEN_APPLICATION_ID!,
        accessKey: env.RAKUTEN_ACCESS_KEY!,
        affiliateId: env.RAKUTEN_AFFILIATE_ID || undefined,
        siteUrl: siteUrl!,
      }),
      createYahooFetcher({ clientId: env.YAHOO_CLIENT_ID!, valueCommerceId: env.VALUECOMMERCE_ID || undefined }),
    ],
  };
}

/**
 * 仮データを返す取得部品（試し用）。changeFor で、特定のショップの価格を変えられる
 * 例: { "2000000000015": { rakuten: 0.4 } } → その商品の楽天の価格を 40% にする（保留の確認用）
 */
export function createFakeFetchers(changeFor: Record<string, Partial<Record<Mall, number>>> = {}): MallFetcher[] {
  const make = (mall: Mall): MallFetcher => ({
    mall,
    async fetch(jan) {
      const item = await mockDataSource.getProduct(jan);
      const ratio = changeFor[jan]?.[mall] ?? 1;
      const offers: Offer[] = (item?.offers ?? [])
        .filter((o) => o.mall === mall)
        .map((o): Offer => {
          const price = Math.round(o.price * ratio);
          return {
            mall: o.mall,
            itemCode: o.itemCode,
            shopName: o.shopName,
            price,
            shipping: o.shipping,
            shippingStatus: o.shippingStatus,
            pointRate: o.pointRate,
            points: Math.floor((o.points * price) / o.price),
            url: o.url,
          };
        });
      return { offers, skipped: [], total: offers.length };
    },
  });
  return [make("rakuten"), make("yahoo")];
}
