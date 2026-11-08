// SNS投稿の候補を出す（投稿はオーナーが行う）
//   npm run sns:candidates                 候補を表示し、.local/ に保存する
//   npm run sns:candidates -- --limit 8    候補の数を変える
//   npm run sns:candidates -- --no-record  履歴に残さない（試し出し用）
// 同じ商品は 7日間は候補にしない（.local/social-history.json で覚える）。.local/ は Git に入らない
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { getDataSource } from "@/lib/data";
import { buildDeals } from "@/lib/deals";
import { formatJst } from "@/lib/format";
import { dropRanking, pickups, popularRanking } from "@/lib/ranking";
import { buildCandidates, DEFAULT_LIMIT, recentJansFrom } from "@/lib/social";
import { SITE_URL } from "@/lib/site";

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local がなくても、環境変数があれば動く
}

const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : DEFAULT_LIMIT;
const record = !args.includes("--no-record");
const HISTORY = ".local/social-history.json";

type History = { jan: string; at: string }[];

async function main() {
  const now = new Date();
  const items = await getDataSource().getAllProducts();
  const deals = buildDeals(items);
  const drops = dropRanking(items, 20);
  const picks = pickups(items, null, 20).map((p) => p.deal);
  const popular = popularRanking(items, 20);

  const history: History = existsSync(HISTORY) ? JSON.parse(readFileSync(HISTORY, "utf8")) : [];
  const candidates = buildCandidates({
    drops,
    pickups: picks,
    popular,
    siteUrl: SITE_URL,
    recentJans: recentJansFrom(history, now),
    limit,
  });

  const lines: string[] = [];
  lines.push(`# SNS投稿の候補（${formatJst(now.toISOString())} 作成）`);
  lines.push("");
  lines.push(`候補 ${candidates.length} 件（比べられる商品 ${deals.length} 件のうち）。投稿はご自身で行ってください。`);
  lines.push("");
  candidates.forEach((c, i) => {
    lines.push(`## ${i + 1}. ${c.name}（${c.kind === "drop" ? "値下がり" : c.kind === "pickup" ? "ピックアップ" : "口コミの多い商品"}）`);
    lines.push("");
    lines.push("```");
    lines.push(c.text);
    lines.push("```");
    lines.push("");
  });
  if (candidates.length === 0) lines.push("今日の候補はありません（直近に候補にした商品か、比べられる価格がありません）。");

  const out = lines.join("\n");
  console.log(out);

  const file = `.local/social-candidates-${now.toISOString().slice(0, 10)}.md`;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, out + "\n", "utf8");
  console.log(`\n保存しました：${file}`);

  if (record && candidates.length > 0) {
    const at = now.toISOString();
    writeFileSync(HISTORY, JSON.stringify([...history, ...candidates.map((c) => ({ jan: c.jan, at }))], null, 2), "utf8");
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
