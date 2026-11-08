import Link from "next/link";
import { getDataSource, type Pet, type SaleEvent } from "@/lib/data";
import { buildDeals } from "@/lib/deals";
import { daysUntilJst, formatJst, MALL_LABEL } from "@/lib/format";
import { PAUSED_MESSAGE, pricesPaused } from "@/lib/pause";
import { dropRanking, pickups, popularRanking } from "@/lib/ranking";
import { DealCard } from "./DealCard";
import { FeaturedDeal } from "./FeaturedDeal";
import { RankList } from "./RankList";

const PET_LABEL: Record<Pet, string> = { dog: "犬", cat: "猫" };
const PET_HREF: Record<Pet, string> = { dog: "/", cat: "/cat" };

function PetToggle({ current }: { current: Pet }) {
  return (
    <nav className="seg" aria-label="ペットの種類">
      {(["dog", "cat"] as const).map((pet) => (
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
        期間中はポイントが上乗せされることがあります。表示している実質価格は基本のポイントで計算しています。
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
  const drops = dropRanking(items, 5);
  const popular = popularRanking(items, 5);
  const restDeals = deals.filter((d) => d.product.id !== top?.product.id && !picks.some((p) => p.deal.product.id === d.product.id));

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

          {event && <EventBanner event={event} now={now} />}

          {picks.length > 0 && (
            <section className="stack">
              <h2>ピックアップ</h2>
              {picks.map((p) => (
                <DealCard key={p.deal.product.id} deal={p.deal} />
              ))}
            </section>
          )}

          {/* 3. ほかは、開いたときだけ見せる */}
          {(drops.length > 0 || popular.length > 0 || restDeals.length > 0) && (
            <details className="more card">
              <summary>もっと見る</summary>
              <div className="stack">
                {drops.length > 0 && (
                  <section className="stack">
                    <h3>今日のおトク順</h3>
                    <RankList deals={drops} mode="drop" />
                  </section>
                )}
                {popular.length > 0 && (
                  <section className="stack">
                    <h3>口コミの多い順</h3>
                    <p className="sub small">Yahoo!ショッピングの口コミ数の多い順です。売れた数ではありません。</p>
                    <RankList deals={popular} mode="reviews" />
                  </section>
                )}
                {restDeals.length > 0 && (
                  <section className="stack">
                    <h3>ほかの商品</h3>
                    {restDeals.map((d) => (
                      <DealCard key={d.product.id} deal={d} />
                    ))}
                  </section>
                )}
              </div>
            </details>
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
