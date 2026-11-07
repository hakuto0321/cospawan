// .env.local の SUPABASE_DB_URL（開発用DB）に、まだ流していないマイグレーションを流す
// 使い方:
//   npm run db:push            テーブルの変更だけ
//   npm run db:push -- --seed  仮データ（supabase/seed.sql）も入れる（開発用DBだけ）
//   npm run db:push -- --dry   流すものを表示するだけ
import { spawnSync } from "node:child_process";

try {
  process.loadEnvFile(".env.local");
} catch {
  console.error(".env.local が見つかりません。.env.example をコピーして作ってください。");
  process.exit(1);
}

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error(".env.local の SUPABASE_DB_URL が空です。");
  process.exit(1);
}

const args = process.argv.slice(2);
let host = "(不明)";
try {
  const u = new URL(url);
  host = `${u.hostname}（ユーザー ${decodeURIComponent(u.username)}）`;
} catch {
  console.error("SUPABASE_DB_URL の形式が正しくありません。");
  process.exit(1);
}
console.log(`接続先: ${host}`);

const cliArgs = ["supabase", "db", "push", `--remote=${url}`, "--yes"];
if (args.includes("--seed")) cliArgs.push("--include-seed");
if (args.includes("--dry")) cliArgs.push("--dry-run");

const r = spawnSync("npx", cliArgs, { stdio: "inherit" });
process.exit(r.status ?? 1);
