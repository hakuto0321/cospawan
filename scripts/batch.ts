// 定期バッチの実行コマンド
//   npm run batch -- --fake                       仮データで最後まで動かす（何も保存しない）
//   npm run batch -- --fake --change 2000000000015:rakuten:0.4
//                                                 その商品の楽天の価格を 40% にして、保留を確かめる
//   npm run batch                                  本番の流れ（C1 で Supabase につないでから使える）
// 失敗したとき（取得の失敗が多いときを含む）は終了コード 1 で終わる（GitHub Actions が知らせる）
import { createFakeFetchers, createFetchersFromEnv } from "@/lib/batch/fetchers";
import { createMemoryBatchRepo } from "@/lib/batch/memoryRepo";
import { runBatch } from "@/lib/batch/run";
import type { StoredOffer } from "@/lib/batch/types";
import { mockDataSource } from "@/lib/data/mock";
import type { Mall } from "@/lib/pricing";

try {
  process.loadEnvFile(".env.local");
} catch {
  // GitHub Actions では Secrets から環境変数で渡る
}

const args = process.argv.slice(2);
const log = (m: string) => console.log(`[${new Date().toISOString()}] ${m}`);

function parseChanges(): Record<string, Partial<Record<Mall, number>>> {
  const out: Record<string, Partial<Record<Mall, number>>> = {};
  args.forEach((a, i) => {
    if (a !== "--change") return;
    const [jan, mall, ratio] = (args[i + 1] ?? "").split(":");
    if (!jan || (mall !== "rakuten" && mall !== "yahoo") || !(Number(ratio) > 0)) {
      console.error(`--change の形が正しくありません: ${args[i + 1]}（例 2000000000015:rakuten:0.4）`);
      process.exit(1);
    }
    out[jan] = { ...out[jan], [mall]: Number(ratio) };
  });
  return out;
}

async function fakeRun() {
  const items = await mockDataSource.getAllProducts();
  // いまの仮データを「前回の結果」として持たせる
  const initial: Record<number, StoredOffer[]> = {};
  for (const i of items) {
    initial[i.product.id] = i.offers.map((o) => ({
      ...o,
      referencePrice: o.holdReason === null ? o.price : null,
      fetchedAt: i.fetchedAt,
    }));
  }
  const repo = createMemoryBatchRepo(
    items.map((i) => ({ id: i.product.id, jan: i.product.jan })),
    initial,
  );
  return runBatch({ repo, fetchers: createFakeFetchers(parseChanges()), log });
}

async function realRun(): Promise<never> {
  // C1 で Supabase の保存先を作ったら、createRevalidator（サイトの作り直し）とあわせてここでつなぐ
  const { missing } = createFetchersFromEnv(process.env);
  if (missing.length > 0) {
    console.error(`キーが足りません: ${missing.join(", ")}`);
    process.exit(1);
  }
  console.error("保存先（Supabase）がまだつながっていません。C1 のあとで使えます。いまは --fake で試してください。");
  process.exit(1);
}

async function main() {
  const { status, stats } = args.includes("--fake") ? await fakeRun() : await realRun();

  console.log("\n==== 結果 ====");
  console.log(`状態: ${status === "succeeded" ? "成功" : "失敗"}`);
  console.log(`商品 ${stats.products}件 / 取得 ${stats.fetches}回（失敗 ${stats.fetchErrors.length}回）`);
  console.log(`保存した価格 ${stats.offersSaved}件 / 除外 ${stats.skipped}件 / 履歴 ${stats.historyRows}行`);
  console.log(`ページの作り直し: ${stats.revalidated ? "した" : "していない"}`);
  if (stats.held.length > 0) {
    console.log(`\n保留（公開していない）${stats.held.length}件 ― 確かめてください`);
    for (const h of stats.held) console.log(`  ${h.jan} ${h.mall} ${h.shopName} ${h.price}円: ${h.reason}`);
  }
  for (const e of stats.fetchErrors) console.log(`  取得の失敗 ${e.jan} ${e.mall}: ${e.message}`);

  process.exit(status === "succeeded" ? 0 : 1);
}

main().catch((e) => {
  console.error("バッチが止まりました", e);
  process.exit(1);
});
