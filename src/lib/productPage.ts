// 商品ページの中身を作る（画面と構造化データで同じ値を使うため、ここで一度だけ計算する）
import { cheapestOffer, rankOffers, type Mall, type PricedOffer } from "@/lib/pricing";
import type { PetType, ProductWithOffers } from "@/lib/data/types";
import { formatJst, MALL_LABEL, yen } from "@/lib/format";

export const PET_TYPE_LABEL: Record<PetType, string> = { dog: "犬", cat: "猫", both: "犬・猫" };

/** 表に出すショップ。保留中は出さない。比較できるものを実質の安い順、その後ろに送料別を価格の安い順 */
export function shopRows(offers: PricedOffer[]): PricedOffer[] {
  const comparable = rankOffers(offers);
  const shippingUnknown = offers
    .filter((o) => o.holdReason === null && o.effectivePrice === null)
    .sort((a, b) => a.price - b.price);
  return [...comparable, ...shippingUnknown];
}

export function shippingLabel(o: Pick<PricedOffer, "shippingStatus" | "shipping">): string {
  switch (o.shippingStatus) {
    case "free":
      return "無料";
    case "included":
      return "込み";
    case "paid":
      return o.shipping === null ? "送料別" : yen(o.shipping);
    case "unknown":
      return "送料別";
  }
}

/** 冒頭の一文。比較できる価格がなければ null */
export function leadSentence(item: ProductWithOffers): string | null {
  const best = cheapestOffer(item.offers);
  if (!best) return null;
  return `実質最安は${yen(best.effectivePrice)}（${MALL_LABEL[best.mall]}・${best.shopName}、${formatJst(item.fetchedAt)}時点）。`;
}

/** 1kg あたり・1枚あたりなど。計算できなければ null */
export function unitPriceText(effectivePrice: number, amount: number | null, unit: string | null): string | null {
  if (!amount || !unit) return null;
  if (unit === "g") return `1kgあたり約${yen(effectivePrice / (amount / 1000))}`;
  const per = effectivePrice / amount;
  const perText = per < 100 ? `${(Math.round(per * 10) / 10).toLocaleString("ja-JP")}円` : yen(per);
  return `1${unit}あたり約${perText}`;
}

/** 1個で何日分か。計算できなければ null */
export function daysOfUse(amount: number | null, perDay: number | null): number | null {
  if (!amount || !perDay) return null;
  return Math.floor(amount / perDay);
}

/** モールごとの実質最安 */
export function mallMins(offers: PricedOffer[]): Record<Mall, number | null> {
  const min = (mall: Mall) => rankOffers(offers.filter((o) => o.mall === mall))[0]?.effectivePrice ?? null;
  return { rakuten: min("rakuten"), yahoo: min("yahoo") };
}

export type Faq = { q: string; a: string };

export function buildFaq(item: ProductWithOffers): Faq[] {
  const { product, offers } = item;
  const faq: Faq[] = [];
  const mins = mallMins(offers);
  const best = cheapestOffer(offers);

  if (mins.rakuten !== null && mins.yahoo !== null) {
    const a =
      mins.rakuten === mins.yahoo
        ? `今は同じで、どちらも実質${yen(mins.rakuten)}です。`
        : mins.rakuten < mins.yahoo
          ? `今は楽天市場のほうが安く、実質${yen(mins.rakuten)}です（Yahoo!ショッピングは${yen(mins.yahoo)}）。`
          : `今はYahoo!ショッピングのほうが安く、実質${yen(mins.yahoo)}です（楽天市場は${yen(mins.rakuten)}）。`;
    faq.push({ q: "楽天市場とYahoo!ショッピング、どちらが安い？", a: `${a}${formatJst(item.fetchedAt)}時点の価格です。` });
  }

  if (best) {
    const unit = unitPriceText(best.effectivePrice, product.amount, product.unit);
    if (unit) {
      const q = product.unit === "g" ? "1kgあたりいくら？" : `1${product.unit}あたりいくら？`;
      faq.push({ q, a: `実質最安で買うと、${unit}です。` });
    }
  }

  const days = daysOfUse(product.amount, product.defaultPerDay);
  if (days !== null) {
    faq.push({
      q: "1つで何日くらいもつ？",
      a: `1日${product.defaultPerDay}${product.unit}使うとして、約${days}日分です。使う量によって変わります。`,
    });
  }

  faq.push({
    q: "価格はいつ更新される？",
    a: "楽天市場とYahoo!ショッピングの価格を、毎日7時・12時・20時ごろの1日3回取り直しています。",
  });

  return faq;
}

/** 構造化データ（Product / AggregateOffer / FAQPage）。表に出しているショップと同じ値を使う */
export function productJsonLd(item: ProductWithOffers, rows: PricedOffer[], faq: Faq[], pageUrl: string) {
  const prices = rows.map((o) => o.price);
  const product = {
    "@type": "Product",
    name: item.product.name,
    ...(item.product.jan.length === 13 ? { gtin13: item.product.jan } : { gtin8: item.product.jan }),
    url: pageUrl,
    ...(rows.length > 0 && {
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "JPY",
        lowPrice: Math.min(...prices),
        highPrice: Math.max(...prices),
        offerCount: rows.length,
      },
    }),
  };
  const faqPage = {
    "@type": "FAQPage",
    mainEntity: faq.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
  return { "@context": "https://schema.org", "@graph": [product, faqPage] };
}

/** 商品ページに出す値を一度にまとめたもの（ページは、これを並べるだけにする） */
export function productViewModel(item: ProductWithOffers) {
  const { product, offers, previousMinEffectivePrice } = item;
  const best = cheapestOffer(offers);
  return {
    best,
    rows: shopRows(offers),
    faq: buildFaq(item),
    lead: leadSentence(item),
    unitPrice: best ? unitPriceText(best.effectivePrice, product.amount, product.unit) : null,
    days: daysOfUse(product.amount, product.defaultPerDay),
    // 前回の最安より安くなったときだけ、その差額を出す
    drop:
      best && previousMinEffectivePrice != null && previousMinEffectivePrice > best.effectivePrice
        ? previousMinEffectivePrice - best.effectivePrice
        : null,
    petLabel: product.petType ? `${PET_TYPE_LABEL[product.petType]}・` : "",
  };
}
