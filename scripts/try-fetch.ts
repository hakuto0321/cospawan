// 楽天とYahoo!から、1つのJANの価格を試しに取ってくる（DBには保存しない）
// 使い方: npm run try:fetch -- 4902000000000
import { fetchRakutenOffers, type RakutenConfig } from "@/lib/malls/rakuten";
import { fetchYahooOffers, type YahooConfig } from "@/lib/malls/yahoo";
import type { MallResult } from "@/lib/malls/types";
import { priceOffer, rankOffers } from "@/lib/pricing";

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local がなくても、環境変数があれば動く
}

const jan = process.argv[2];
if (!jan || !/^[0-9]{8}$|^[0-9]{13}$/.test(jan)) {
  console.error("JANコード（8桁か13桁）を指定してください。例: npm run try:fetch -- 4902000000000");
  process.exit(1);
}

const env = process.env;
const siteUrl = env.RAKUTEN_SITE_URL || env.NEXT_PUBLIC_SITE_URL || "";

function show(title: string, r: MallResult) {
  console.log(`\n=== ${title}：APIの件数 ${r.total} / 採用 ${r.offers.length} / 除外 ${r.skipped.length}`);
  const priced = r.offers.map((o) => priceOffer(o));
  const ranked = rankOffers(priced);
  for (const o of priced) {
    const eff = o.effectivePrice === null ? "送料別" : `${o.effectivePrice}円`;
    const mark = ranked[0] === o ? "★" : " ";
    console.log(`${mark} ${o.shopName} | 価格 ${o.price}円 | 送料 ${o.shippingStatus} | ${o.points}pt | 実質 ${eff}`);
  }
  for (const s of r.skipped) console.log(`  （除外）${s.shopName} ${s.itemCode}: ${s.reason}`);
}

async function main() {
  if (env.RAKUTEN_APPLICATION_ID && env.RAKUTEN_ACCESS_KEY && siteUrl) {
    const cfg: RakutenConfig = {
      applicationId: env.RAKUTEN_APPLICATION_ID,
      accessKey: env.RAKUTEN_ACCESS_KEY,
      affiliateId: env.RAKUTEN_AFFILIATE_ID || undefined,
      siteUrl,
    };
    try {
      show("楽天市場", await fetchRakutenOffers(jan, cfg));
    } catch (e) {
      console.error("\n楽天市場：取得に失敗", e);
    }
  } else {
    console.log("\n楽天市場：RAKUTEN_APPLICATION_ID / RAKUTEN_ACCESS_KEY / サイトURL が未設定のため飛ばします");
  }

  if (env.YAHOO_CLIENT_ID) {
    const cfg: YahooConfig = { clientId: env.YAHOO_CLIENT_ID, valueCommerceId: env.VALUECOMMERCE_ID || undefined };
    try {
      show("Yahoo!ショッピング", await fetchYahooOffers(jan, cfg));
    } catch (e) {
      console.error("\nYahoo!ショッピング：取得に失敗", e);
    }
  } else {
    console.log("\nYahoo!ショッピング：YAHOO_CLIENT_ID が未設定のため飛ばします");
  }
}

main();
