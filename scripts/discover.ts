// 売れ筋の商品を探して、下書きとして登録する
//   npm run discover                    確認だけ（DB には書かない。最大20件を表示）
//   npm run discover -- --write         下書きとして Supabase に登録する（公開されない）
//   npm run discover -- --limit 10      今回の上限を変える
// 登録後の商品は status = draft。オーナーが名前・量・1日の使う量を確かめてから active にする
import { createRateLimiter, getJson } from "@/lib/malls/http";
import { fetchRakutenOffers, type RakutenConfig } from "@/lib/malls/rakuten";
import { fetchYahooOffers, YAHOO_MIN_INTERVAL_MS, type YahooConfig } from "@/lib/malls/yahoo";
import { buildYahooSearchRequest, DISCOVERY_QUERIES } from "@/lib/discovery/candidates";
import { createDiscoveryRepo } from "@/lib/discovery/supabaseRepo";
import { runDiscovery, type DiscoveryDeps } from "@/lib/discovery/run";
import { getAdminClient } from "@/lib/supabase/client";

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local がなくても、環境変数があれば動く
}

const args = process.argv.slice(2);
const write = args.includes("--write");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 20;
if (!Number.isInteger(limit) || limit < 1) {
  console.error("--limit には1以上の整数を指定してください");
  process.exit(1);
}

const env = process.env;
const missing: string[] = [];
if (!env.YAHOO_CLIENT_ID) missing.push("YAHOO_CLIENT_ID");
if (!env.RAKUTEN_APPLICATION_ID) missing.push("RAKUTEN_APPLICATION_ID");
if (!env.RAKUTEN_ACCESS_KEY) missing.push("RAKUTEN_ACCESS_KEY");
const siteUrl = env.RAKUTEN_SITE_URL || env.NEXT_PUBLIC_SITE_URL;
if (!siteUrl) missing.push("RAKUTEN_SITE_URL（または NEXT_PUBLIC_SITE_URL）");
if (write && !env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
if (write && !env.SUPABASE_SECRET_KEY) missing.push("SUPABASE_SECRET_KEY");
if (missing.length > 0) {
  console.error(`足りない設定があります：${missing.join("、")}`);
  process.exit(1);
}

const rakutenCfg: RakutenConfig = {
  applicationId: env.RAKUTEN_APPLICATION_ID!,
  accessKey: env.RAKUTEN_ACCESS_KEY!,
  affiliateId: env.RAKUTEN_AFFILIATE_ID || undefined,
  siteUrl: siteUrl!,
};
const yahooCfg: YahooConfig = { clientId: env.YAHOO_CLIENT_ID!, valueCommerceId: env.VALUECOMMERCE_ID || undefined };

// モールには 1秒に1回までの制限があるので、呼び出しの間隔をあける
const yahooLimit = createRateLimiter(YAHOO_MIN_INTERVAL_MS);
const rakutenLimit = createRateLimiter(1_100); // 楽天も 1秒に1回まで（batch と同じ間隔）

const deps: DiscoveryDeps = {
  search: (query) =>
    yahooLimit(() => getJson(buildYahooSearchRequest(query, yahooCfg.clientId))),
  verify: async (jan) => {
    const [r, y] = await Promise.all([
      rakutenLimit(() => fetchRakutenOffers(jan, rakutenCfg)),
      yahooLimit(() => fetchYahooOffers(jan, yahooCfg)),
    ]);
    return { rakutenOffers: r.offers.length, yahooOffers: y.offers.length };
  },
  repo: write ? createDiscoveryRepo(getAdminClient()) : null,
};

async function main() {
  console.log(`${write ? "書き込みあり" : "確認だけ（DBには書きません）"}／上限 ${limit} 件／キーワード ${DISCOVERY_QUERIES.length} 個`);
  const report = await runDiscovery({ queries: DISCOVERY_QUERIES, limit, write }, deps);

  console.log(`\n検索 ${report.searched} 回、候補 ${report.found} 件（JAN ごとにまとめた数）`);
  console.log(`\n登録候補（下書き）：${report.accepted.length} 件`);
  for (const a of report.accepted) {
    const c = a.classified;
    console.log(`  ${a.jan} | ${a.name} | ${c.categorySlug} | ${c.petType} | ${c.size ?? "量：不明"} | 口コミ ${a.reviewCount}`);
  }
  console.log(`\n見送り：${report.rejected.length} 件`);
  for (const r of report.rejected.slice(0, 40)) console.log(`  ${r.jan} | ${r.name} | ${r.reason}`);
  if (write) console.log(`\n下書きとして登録：${report.written} 件（公開には、オーナーが active にする必要があります）`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
