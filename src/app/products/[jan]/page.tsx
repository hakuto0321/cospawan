import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WaitlistForm } from "@/components/WaitlistForm";
import { getDataSource } from "@/lib/data";
import { formatJst, MALL_LABEL, yen } from "@/lib/format";
import { amazonHref, offerHref, OUTBOUND_REL } from "@/lib/outbound";
import { leadSentence, productJsonLd, productViewModel, shippingLabel } from "@/lib/productPage";
import { SITE_URL } from "@/lib/site";
import { PAUSED_MESSAGE, pricesPaused } from "@/lib/pause";

type Props = { params: Promise<{ jan: string }> };

export async function generateStaticParams() {
  const items = await getDataSource().getAllProducts();
  return items.map((i) => ({ jan: i.product.jan }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { jan } = await params;
  const item = await getDataSource().getProduct(jan);
  if (!item) return {};
  return {
    title: `${item.product.name}の実質最安`,
    description: leadSentence(item) ?? undefined,
    alternates: { canonical: `/products/${jan}` },
  };
}

export default async function ProductPage({ params }: Props) {
  const { jan } = await params;
  const data = getDataSource();
  const item = await data.getProduct(jan);
  if (!item) notFound();

  if (pricesPaused()) {
    return (
      <article className="stack-lg">
        <header className="stack">
          <h1 className="product-title">{item.product.name}</h1>
        </header>
        <p className="card">{PAUSED_MESSAGE}</p>
        <WaitlistForm jan={jan} />
      </article>
    );
  }

  const { product, fetchedAt } = item;
  const { best, rows, faq, lead, unitPrice, drop, petLabel } = productViewModel(item);
  const jsonLd = productJsonLd(item, rows, faq, `${SITE_URL}/products/${jan}`);

  return (
    <article className="stack-lg">
      <script
        type="application/ld+json"
        // JSON の中の "<" を逃がして、script タグを閉じられないようにする
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      {data.isMock && <p className="mock-notice">開発中：商品名・ショップ・価格はすべて仮のデータです。</p>}

      {product.imageUrl && best && (
        <a className="product-image" href={offerHref(jan, best)} rel={OUTBOUND_REL} target="_blank">
          {/* 画像は、ショップのページへのリンクとセットで出す（Yahoo! の規約に合わせる） */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.imageUrl} alt={product.name} width={300} height={300} />
        </a>
      )}

      <header className="stack">
        <p className="sub small breadcrumb">
          <Link href={product.petType === "cat" ? "/cat" : product.petType === "small" ? "/small" : "/"}>今日の買いどき</Link> ›{" "}
          {petLabel}
          {product.categoryName}
        </p>
        <h1 className="product-title">{product.name}</h1>
        <p className="lead price-inline">
          {lead ?? `いま比較できる価格がありません（${formatJst(fetchedAt)}時点）。`}
        </p>
        <div className="chips">
          {drop !== null && <span className="chip chip-deal">おトク 前日より{yen(drop)}安い</span>}
          {unitPrice && <span className="chip chip-neutral price-inline">{unitPrice}</span>}
        </div>
      </header>

      {best && (
        <div className="stack">
          <a className="button button-wide" href={offerHref(jan, best)} rel={OUTBOUND_REL} target="_blank">
            {MALL_LABEL[best.mall]}の{best.shopName}で見る
          </a>
          {product.amazonUrl && (
            <a
              className="button button-ghost button-wide"
              href={amazonHref(jan)}
              rel={OUTBOUND_REL}
              target="_blank"
            >
              Amazonでも見る
            </a>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <section className="card stack">
          <h2>ショップを比べる</h2>
          <div className="table-wrap">
            <table className="shops">
              <thead>
                <tr>
                  <th scope="col">ショップ</th>
                  <th scope="col">価格</th>
                  <th scope="col">送料</th>
                  <th scope="col">ポイント</th>
                  <th scope="col">実質</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o, i) => (
                  <tr key={`${o.mall}-${o.itemCode}`} className={i === 0 && o.effectivePrice !== null ? "top" : undefined}>
                    <td>
                      <a href={offerHref(jan, o)} rel={OUTBOUND_REL} target="_blank">
                        {o.shopName}
                      </a>
                      <span className="mall">{MALL_LABEL[o.mall]}</span>
                    </td>
                    <td data-label="価格">{yen(o.price)}</td>
                    <td data-label="送料">{shippingLabel(o)}</td>
                    <td data-label="ポイント">−{o.points}pt</td>
                    <td className="eff" data-label="実質">{o.effectivePrice === null ? "—" : yen(o.effectivePrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="sub small">
            実質価格は、価格に送料を足して、もらえるポイントを引いた金額です。ポイントは1ポイント1円で、基本のポイントだけで計算しています。
            価格は{formatJst(fetchedAt)}に取得したものです。実際の価格とちがうことがあるので、購入の前にショップのページで確かめてください。送料がわからないショップ（送料別）は、実質価格を出していません。
            {product.amazonUrl && " Amazonの価格は表示していません。"}
          </p>
        </section>
      )}

      <WaitlistForm jan={jan} />

      <section className="card stack">
        <h2>よくある質問</h2>
        <dl className="faq">
          {faq.map(({ q, a }) => (
            <div key={q}>
              <dt>{q}</dt>
              <dd className="price-inline">{a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </article>
  );
}
