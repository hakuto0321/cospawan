import Link from "next/link";
import { getDataSource, type Pet, type SaleEvent } from "@/lib/data";
import { buildDeals } from "@/lib/deals";
import { daysUntilJst, formatJst, MALL_LABEL } from "@/lib/format";
import { PAUSED_MESSAGE, pricesPaused } from "@/lib/pause";
import { pickups } from "@/lib/ranking";
import { DealCard } from "./DealCard";
import { FeaturedDeal } from "./FeaturedDeal";
import { MyPicks, type PickItem } from "./MyPicks";

const PET_LABEL: Record<Pet, string> = { dog: "犬", cat: "猫", small: "小動物" };
const PET_HREF: Record<Pet, string> = { dog: "/", cat: "/cat", small: "/small" };

function PetToggle({ current }: { current: Pet }) {
  return (
    <nav className="seg" aria-label="ペットの種類">
      {(["dog", "cat", "small"] as const).map((pet) => (
        <Link key={pet} href={PET_HREF[pet]} aria-current={pet === current ? "page" : undefined}>
          {PET_LABEL[pet]}
        </Link>
      ))}
    </nav>
  );
}

function EventBanner({ event, now }: { event: SaleEvent; now: Date }) {
  const started = new Date(event.startsAt) <= now;
  const days = daysUntilJst(event.startsAt, now);
  const mall = MALL_LABEL[event.mall];
  return (
    <aside className="event-banner">
      <strong>
        {started
          ? `${mall}の${event.name}、開催中です`
          : days <= 0
            ? `${mall}の${event.name}は今日から`
            : `${mall}の${event.name}まで、あと${days}日`}
      </strong>
      <span className="sub">
        {started ? `${formatJst(event.endsAt)}まで。` : `${formatJst(event.startsAt)}から。`}
        期間中はポイントが増えることがあります。
      </span>
    </aside>
  );
}

export async function TopPage({ pet }: { pet: Pet }) {
  if (pricesPaused()) {
    return (
      <div className="stack-lg">
        <div className="row-between">
          <PetToggle current={pet} />
        </div>
        <h1 className="top-title">いつものペット用品、今が買いどき？</h1>
        <p className="card">{PAUSED_MESSAGE}</p>
      </div>
    );
  }

  const data = getDataSource();
  const now = new Date();
  const [items, events] = await Promise.all([data.getProductsForPet(pet), data.getUpcomingEvents(now)]);
  const deals = buildDeals(items);
  const [top] = deals;
  const updatedAt = items.map((i) => i.fetchedAt).sort().at(-1);
  const event = events[0];
  const picks = pickups(items, top?.product.id ?? null, 3);
  // この端末の「気になる」「犬のサイズ」に使う（サーバーには送らない）
  const pickItems: PickItem[] = deals.map((d) => ({
    jan: d.product.jan,
    name: d.product.name,
    price: d.best.effectivePrice,
    sizes: d.product.sizes ?? [],
    breeds: d.product.breeds ?? [],
    ages: d.product.ages ?? [],
  }));

  return (
    <div className="stack-lg">
      {/* 1. 押す前に決めること（犬か猫か）を一番上に */}
      <div className="row-between">
        <PetToggle current={pet} />
        {updatedAt && <span className="sub small">{formatJst(updatedAt)} 更新</span>}
      </div>

      {data.isMock && <p className="mock-notice">開発中：商品名・ショップ・価格はすべて仮のデータです。</p>}

      {/* 2. 見出しは1行。答えは、そのすぐ下 */}
      <h1 className="top-title">いつものペット用品、今が買いどき？</h1>

      {top ? (
        <>
          <section className="stack">
            <p className="sub small">今日いちばんの買いどき</p>
            <FeaturedDeal deal={top} />
          </section>

          <MyPicks pet={pet} items={pickItems} />

          {event && <EventBanner event={event} now={now} />}

          {picks.length > 0 && (
            <section className="stack">
              <h2>ピックアップ</h2>
              {picks.map((p) => (
                <DealCard key={p.deal.product.id} deal={p.deal} />
              ))}
            </section>
          )}

        </>
      ) : (
        <p className="card">いま表示できる{PET_LABEL[pet]}用の商品がありません。少し時間をおいて見てください。</p>
      )}

      <p className="sub small">
        実質価格 ＝ 価格 ＋ 送料 − もらえるポイント（1ポイント1円、基本のポイントで計算）。送料がわからないショップは比べていません。
      </p>
    </div>
  );
}
