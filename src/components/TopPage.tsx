import Link from "next/link";
import { getDataSource, type Pet, type SaleEvent } from "@/lib/data";
import { buildDeals } from "@/lib/deals";
import { dropRanking, pickups, popularRanking } from "@/lib/ranking";
import { PAUSED_MESSAGE, pricesPaused } from "@/lib/pause";
import { daysUntilJst, formatJst, MALL_LABEL } from "@/lib/format";
import { DealCard } from "./DealCard";
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
        期間中はポイントがさらにつくことがあります。ここに出している実質価格は、基本のポイントだけで計算しています。
      </span>
    </aside>
  );
}

export async function TopPage({ pet }: { pet: Pet }) {
  if (pricesPaused()) {
    return (
      <div className="stack-lg">
        <section className="hero">
          <h1>
            いつものペット用品、
            <br />
            今が買いどき？
          </h1>
        </section>
        <div className="row-between">
          <PetToggle current={pet} />
        </div>
        <p className="card">{PAUSED_MESSAGE}</p>
      </div>
    );
  }
  const data = getDataSource();
  const now = new Date();
  const [items, events] = await Promise.all([data.getProductsForPet(pet), data.getUpcomingEvents(now)]);
  const deals = buildDeals(items);
  const [top, ...rest] = deals;
  const updatedAt = items.map((i) => i.fetchedAt).sort().at(-1);
  const event = events[0];
  const picks = pickups(items, top?.product.id ?? null, 3);
  const drops = dropRanking(items, 5);
  const popular = popularRanking(items, 5);

  return (
    <div className="stack-lg">
      <section className="hero">
        <h1>
          いつものペット用品、
          <br />
          今が買いどき？
        </h1>
        <p className="sub">
          楽天市場とYahoo!ショッピングの価格を、送料とポイントを込みで比べています。
        </p>
      </section>

      {data.isMock && <p className="mock-notice">開発中：商品名・ショップ・価格はすべて仮のデータです。</p>}

      <div className="row-between">
        <PetToggle current={pet} />
        {updatedAt && <span className="sub small">{formatJst(updatedAt)} 更新</span>}
      </div>

      {top ? (
        <>
          <section className="stack">
            <h2>今日いちばんの買いどき</h2>
            <DealCard deal={top} featured />
          </section>

          {event && <EventBanner event={event} now={now} />}

          {picks.length > 0 && (
            <section className="stack">
              <h2>ピックアップ</h2>
              <p className="sub small">値下がり中で、口コミの多いものを自動で選んでいます。</p>
              {picks.map((p) => (
                <DealCard key={p.deal.product.id} deal={p.deal} />
              ))}
            </section>
          )}

          {drops.length > 0 && (
            <section className="stack">
              <h2>今日のおトク順</h2>
              <p className="sub small">前日の実質最安より、下がった割合の大きい順です。</p>
              <RankList deals={drops} mode="drop" />
            </section>
          )}

          {popular.length > 0 && (
            <section className="stack">
              <h2>口コミの多い順</h2>
              <p className="sub small">
                Yahoo!ショッピングの口コミ数の多い順です。売れた数ではありません。
              </p>
              <RankList deals={popular} mode="reviews" />
            </section>
          )}

          {rest.length > 0 && (
            <section className="stack">
              <h2>ほかの商品</h2>
              {rest.map((d) => (
                <DealCard key={d.product.id} deal={d} />
              ))}
            </section>
          )}
        </>
      ) : (
        <p className="card">いま表示できる{PET_LABEL[pet]}用の商品がありません。少し時間をおいて見てください。</p>
      )}

      <p className="sub small">
        実質価格は、価格に送料を足して、もらえるポイントを引いた金額です。ポイントは1ポイント1円で、基本のポイントだけで計算しています。表示している価格は実際の価格とちがうことがあるので、購入の前にショップのページで確かめてください。送料がわからないショップは、比べる対象から外しています。
      </p>
    </div>
  );
}
