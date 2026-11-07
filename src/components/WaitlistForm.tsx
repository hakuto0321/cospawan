import Link from "next/link";

/** 通知の事前登録フォーム。JavaScript なしで送れる */
export function WaitlistForm({ jan }: { jan: string }) {
  return (
    <section className="waitlist stack">
      <h2>値下げのお知らせを受け取る</h2>
      <p className="small">
        この商品が安くなったら、メールでお知らせします。いまは登録だけ受け付けていて、お知らせは準備ができしだい始めます。
      </p>
      <form method="post" action="/api/waitlist" className="waitlist-form">
        <input type="hidden" name="jan" value={jan} />
        {/* ロボット避けの隠し欄（人には見えない） */}
        <div className="hp" aria-hidden="true">
          <label>
            ウェブサイト
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <label htmlFor="waitlist-email" className="small">
          メールアドレス
        </label>
        <div className="waitlist-row">
          <input
            id="waitlist-email"
            className="text-input"
            type="email"
            name="email"
            required
            maxLength={254}
            autoComplete="email"
            placeholder="you@example.com"
          />
          <button type="submit" className="button">
            登録する
          </button>
        </div>
        <p className="sub small">
          登録すると<Link href="/privacy">プライバシーポリシー</Link>に同意したものとします。いつでも削除できます。
        </p>
      </form>
    </section>
  );
}
