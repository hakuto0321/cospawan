import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "登録しました",
  robots: { index: false },
};

type Props = { searchParams: Promise<{ p?: string }> };

export default async function WaitlistDonePage({ searchParams }: Props) {
  const { p } = await searchParams;
  const jan = p && /^[0-9]{8}$|^[0-9]{13}$/.test(p) ? p : null;
  return (
    <article className="prose">
      <h1>登録しました</h1>
      <p>ありがとうございます。値下げのお知らせが始まったら、登録したメールアドレスにご連絡します。</p>
      <p className="sub small">登録の削除は、お問い合わせ先までご連絡ください。</p>
      <p>
        {jan ? <Link href={`/products/${jan}`}>商品ページに戻る</Link> : <Link href="/">トップに戻る</Link>}
      </p>
    </article>
  );
}
