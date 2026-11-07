import { NextResponse, type NextRequest } from "next/server";
import { getDataSource } from "@/lib/data";
import { getEventStore } from "@/lib/store";
import { isSameOrigin, parseWaitlistForm } from "@/lib/waitlist";

export const dynamic = "force-dynamic";

// JavaScript なしでも動く普通のフォーム送信を受け、結果のページへ移動させる（303）
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return redirect(request, "/waitlist/error?reason=email");
  }

  const parsed = parseWaitlistForm(form);
  const janParam = (jan: string | null) => (jan ? `&p=${jan}` : "");

  if (!parsed.ok) {
    // ロボットには成功したように見せる（何が弾かれたかを教えない）
    if (parsed.reason === "bot") return redirect(request, "/waitlist/done");
    const jan = String(form.get("jan") ?? "");
    return redirect(request, `/waitlist/error?reason=email${/^[0-9]+$/.test(jan) ? `&p=${jan}` : ""}`);
  }

  const { email, jan } = parsed.value;
  const item = jan ? await getDataSource().getProduct(jan) : null;
  const productId = item?.product.id ?? null;

  try {
    const store = getEventStore();
    const result = await store.addWaitlist({ email, productId });
    if (result === "created") {
      await store.recordUsageEvent({ type: "waitlist_signup", productId });
    }
  } catch (e) {
    console.error("waitlist の保存に失敗", e);
    return redirect(request, `/waitlist/error?reason=server${janParam(item ? jan : null)}`);
  }

  // 二重登録でも「登録しました」と同じ表示にする（登録済みかどうかを他人に知られないため）
  return redirect(request, `/waitlist/done${item ? `?p=${jan}` : ""}`);
}

function redirect(request: NextRequest, path: string) {
  const res = NextResponse.redirect(new URL(path, request.url), 303);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
