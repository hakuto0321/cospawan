// 「今日いちばんの買いどき」の大きいカード。押す場所は「ショップで見る」の1つだけ（商品名は商品ページへのリンク）
import Link from "next/link";
import type { Deal } from "@/lib/deals";
import { formatJst, MALL_LABEL, yen } from "@/lib/format";
import { offerHref, OUTBOUND_REL } from "@/lib/outbound";

export function FeaturedDeal({ deal }: { deal: Deal }) {
  const { product, best, drop, fetchedAt } = deal;
  // 前日の実質最安 = いまの実質最安 + 下がった額
  const before = drop !== null ? best.effectivePrice + drop : null;

  return (
    <article className="featured">
      <div className="featured-head">
        {product.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="featured-thumb" src={product.imageUrl} alt="" width={88} height={88} />
        )}
        <div className="featured-text">
          <span className="sub small">{product.categoryName}</span>
          <Link href={`/products/${product.jan}`} className="featured-name">
            {product.name}
          </Link>
        </div>
      </div>

      <div className="featured-price">
        <span className="price featured-yen">{yen(best.effectivePrice)}</span>
        {before !== null && drop !== null && (
          <span className="featured-before">
            前日 <s>{yen(before)}</s>（{yen(drop)}安い）
          </span>
        )}
      </div>

      <p className="sub small">
        {MALL_LABEL[best.mall]}・{best.shopName}　{formatJst(fetchedAt)} 時点
      </p>

      <a className="button button-wide" href={offerHref(product.jan, best)} rel={OUTBOUND_REL} target="_blank">
        ショップで見る
      </a>
    </article>
  );
}
