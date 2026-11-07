import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDataSource } from "@/lib/data";
import { formatJst, MALL_LABEL, yen } from "@/lib/format";
import { amazonHref, offerHref, OUTBOUND_REL } from "@/lib/outbound";
import { cheapestOffer } from "@/lib/pricing";
import {
  buildFaq,
  daysOfUse,
  leadSentence,
  PET_TYPE_LABEL,
  productJsonLd,
  shippingLabel,
  shopRows,
  unitPriceText,
} from "@/lib/productPage";
import { SITE_URL } from "@/lib/site";

type Props = { params: Promise<{ jan: string }> };

export async function generateStaticParams() {
  const jans = await getDataSource().listProductJans();
  return jans.map((jan) => ({ jan }));
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

  const { product, offers, previousMinEffectivePrice, fetchedAt } = item;
  const best = cheapestOffer(offers);
  const rows = shopRows(offers);
  const faq = buildFaq(item);
  const lead = leadSentence(item);
  const unitPrice = best ? unitPriceText(best.effectivePrice, product.amount, product.unit) : null;
  const days = daysOfUse(product.amount, product.defaultPerDay);
  const drop =
    best && previousMinEffectivePrice != null && previousMinEffectivePrice > best.effectivePrice
      ? previousMinEffectivePrice - best.effectivePrice
      : null;
  const jsonLd = productJsonLd(item, rows, faq, `${SITE_URL}/products/${jan}`);
  const petLabel = product.petType ? `${PET_TYPE_LABEL[product.petType]}・` : "";

  return (
    <article className="stack-lg">
      <script
        type="application/ld+json"
        // JSON の中の "<" を逃がして、script タグを閉じられないようにする
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      {data.isMock && <p className="mock-notice">開発中：商品名・ショップ・価格はすべて仮のデータです。</p>}

      <header className="stack">
        <p className="sub small breadcrumb">
          <Link href={product.petType === "cat" ? "/cat" : "/"}>今日の買いどき</Link> ›{" "}
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
          {days !== null && <span className="chip chip-neutral price-inline">1つで約{days}日分</span>}
        </div>
      </header>

      {best && (
        <div className="stack">
          <a className="button button-wide" href={offerHref(best)} rel={OUTBOUND_REL} target="_blank">
            {MALL_LABEL[best.mall]}の{best.shopName}で見る
          </a>
          {product.amazonUrl && (
            <a
              className="button button-ghost button-wide"
              href={amazonHref(product.amazonUrl)}
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
                      <a href={offerHref(o)} rel={OUTBOUND_REL} target="_blank">
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
            実質 ＝ 価格 ＋ 送料 − もらえるポイント（1ポイント1円、基本のポイントで計算）。{formatJst(fetchedAt)}
            に取得。「送料別」のショップは送料がわからないため、実質価格を出していません。
            {product.amazonUrl && "Amazonの価格は表示していません。"}
          </p>
        </section>
      )}

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
