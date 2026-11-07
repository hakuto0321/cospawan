import Link from "next/link";
import type { Deal } from "@/lib/deals";
import { MALL_LABEL, yen } from "@/lib/format";

export function DealCard({ deal, featured = false }: { deal: Deal; featured?: boolean }) {
  const { product, best, drop, otherMall } = deal;
  const gap = otherMall ? otherMall.effectivePrice - best.effectivePrice : 0;

  return (
    <Link href={`/products/${product.jan}`} className={`deal${featured ? " deal-featured" : ""}`}>
      <div className="deal-main">
        <span className="deal-category sub">{product.categoryName}</span>
        <span className="deal-name">{product.name}</span>
      </div>
      <div className="deal-price">
        <span className="price deal-yen">{yen(best.effectivePrice)}</span>
        <span className="sub deal-where">
          実質・{MALL_LABEL[best.mall]}
        </span>
      </div>
      <div className="deal-why">
        {drop !== null ? (
          <>
            <span className="chip chip-deal">おトク</span>
            <span className="price-inline">前日より{yen(drop)}安くなりました</span>
          </>
        ) : gap > 0 && otherMall ? (
          <span className="sub price-inline">
            {MALL_LABEL[otherMall.mall]}より{yen(gap)}安い
          </span>
        ) : null}
      </div>
    </Link>
  );
}
