import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data";
import { evaluateFreshness } from "@/lib/health";

// 見張り用：いま利用者に見えている価格の最終更新を返す。
// 古すぎる（12時間以上）ときは 503 にするので、外からの監視で気づける
export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getDataSource().getAllProducts();
  const freshness = evaluateFreshness(
    items.map((i) => i.fetchedAt),
    new Date(),
  );
  return NextResponse.json(
    { ...freshness, products: items.length },
    { status: freshness.stale ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
