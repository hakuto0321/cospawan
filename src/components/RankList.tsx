import Link from "next/link";
import type { Deal } from "@/lib/deals";
import { yen } from "@/lib/format";

/** ランキング風の一覧。mode で何の数字を見せるかを決める */
export function RankList({ deals, mode }: { deals: Deal[]; mode: "drop" | "reviews" }) {
  return (
    <ol className="rank-list">
      {deals.map((d, i) => (
        <li key={d.product.id} className="card rank-item">
          <span className="rank-no price-inline">{i + 1}</span>
          <Link href={`/products/${d.product.jan}`} className="rank-name">
            {d.product.name}
          </Link>
          <span className="rank-side">
            <span className="price rank-yen">{yen(d.best.effectivePrice)}</span>
            <span className="sub small">
              {mode === "drop" && d.drop !== null
                ? `前日より${yen(d.drop)}安い`
                : `口コミ ${(d.reviewCount ?? 0).toLocaleString("ja-JP")}件`}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
