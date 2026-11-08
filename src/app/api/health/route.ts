import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data";
import { evaluateFreshness, evaluateMallFreshness } from "@/lib/health";

// 見張り用：いま利用者に見えている価格の最終更新を返す。
// 古すぎる（12時間以上）ときは 503 にするので、外からの監視で気づける。
// モールごとの最終更新も返す（片方だけ止まっているときに分かるように）
export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getDataSource().getAllProducts();
  const now = new Date();
  const freshness = evaluateFreshness(
    items.map((i) => i.fetchedAt),
    now,
  );
  const mallRows = items.flatMap((i) =>
    Object.entries(i.mallFetchedAt ?? {}).map(([mall, fetchedAt]) => ({ mall, fetchedAt: fetchedAt as string })),
  );
  const malls = evaluateMallFreshness(mallRows, now);
  const anyMallStale = Object.values(malls).some((m) => m.stale);
  return NextResponse.json(
    { ...freshness, products: items.length, malls, mallStale: anyMallStale },
    { status: freshness.stale ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
