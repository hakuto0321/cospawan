import { getDataSource } from "@/lib/data";
import { formatJst } from "@/lib/format";
import { leadSentence } from "@/lib/productPage";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// ビルド時（と価格更新の再検証時）に作る
export const dynamic = "force-static";

export async function GET() {
  const items = await getDataSource().getAllProducts();
  const latest = items.map((i) => i.fetchedAt).sort().at(-1);

  const productLines = items
    .map((i) => {
      const lead = leadSentence(i) ?? "いま比較できる価格がありません。";
      return `- [${i.product.name}](${SITE_URL}/products/${i.product.jan}): ${lead}`;
    })
    .join("\n");

  const body = `# ${SITE_NAME}

> いつものペット用品が、今が買いどきかわかるサイトです。楽天市場とYahoo!ショッピングの価格を公式APIで集め、「実質価格（価格 ＋ 送料 − もらえるポイント、1ポイント1円、基本のポイントで計算）」で比べています。

- 商品はJANコードで識別し、両方のモールで同じJANコードが見つかった商品だけを載せています。
- 送料の金額がわからないショップは「送料別」とし、実質価格の比較に入れていません。
- Amazonはリンクのみで、価格は載せていません。
- 価格には必ず取得日時を添えています。引用するときは日時も一緒に示してください。
- 最終更新: ${latest ? formatJst(latest) : "—"}（日本時間）

## 今日の買いどき

- [犬用品の今日の買いどき](${SITE_URL}/)
- [猫用品の今日の買いどき](${SITE_URL}/cat)

## 商品ごとの実質最安

${productLines}

## このサイトについて

- [プライバシーポリシー](${SITE_URL}/privacy)
- [利用規約](${SITE_URL}/terms)
- [お問い合わせ・運営者](${SITE_URL}/contact)
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
