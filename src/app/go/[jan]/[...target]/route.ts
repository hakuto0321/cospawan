import { NextResponse, type NextRequest } from "next/server";
import { getDataSource } from "@/lib/data";
import { isBot, resolveOutbound } from "@/lib/outbound";
import { getEventStore } from "@/lib/store";

// クリックのたびに動かす（キャッシュしない）
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ jan: string; target: string[] }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { jan, target } = await params;
  const decoded = target.map(safeDecode);
  const item = await getDataSource().getProduct(jan);
  const dest = item ? resolveOutbound(item, decoded) : null;

  // 行き先がわからなければ、商品ページ（なければトップ）に戻す
  if (!item || !dest) {
    const back = item ? `/products/${jan}` : "/";
    return withHeaders(NextResponse.redirect(new URL(back, request.url), 302));
  }

  if (!isBot(request.headers.get("user-agent"))) {
    try {
      await getEventStore().recordUsageEvent({ type: "click_out", productId: item.product.id, mall: dest.mall });
    } catch (e) {
      // 記録に失敗しても、ユーザーはショップへ送る
      console.error("click_out の記録に失敗", e);
    }
  }

  return withHeaders(NextResponse.redirect(dest.url, 302));
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function withHeaders(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}
