import Link from "next/link";
import { getDataSource, type Pet, type SaleEvent } from "@/lib/data";
import { buildDeals } from "@/lib/deals";
import { daysUntilJst, formatJst, MALL_LABEL } from "@/lib/format";
import { DealCard } from "./DealCard";

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
  const data = getDataSource();
  const now = new Date();
  const [items, events] = await Promise.all([data.getProductsForPet(pet), data.getUpcomingEvents(now)]);
  const deals = buildDeals(items);
  const [top, ...rest] = deals;
  const updatedAt = items.map((i) => i.fetchedAt).sort().at(-1);
  const event = events[0];

  return (
    <div className="stack-lg">
      <section className="hero">
        <h1>
          いつものペット用品、
          <br />
          今が買いどき？
        </h1>
        <p className="sub">
          楽天市場とYahoo!ショッピングの価格を1日3回チェック。送料とポイントを含めた「実質価格」で比べています。
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
        実質価格 ＝ 価格 ＋ 送料 − もらえるポイント（1ポイント1円、基本のポイントで計算）。送料がわからないショップは比較に入れていません。
      </p>
    </div>
  );
}
