import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "登録できませんでした",
  robots: { index: false },
};

type Props = { searchParams: Promise<{ reason?: string; p?: string }> };

export default async function WaitlistErrorPage({ searchParams }: Props) {
  const { reason, p } = await searchParams;
  const jan = p && /^[0-9]{8}$|^[0-9]{13}$/.test(p) ? p : null;
  const message =
    reason === "email"
      ? "メールアドレスの形式を確かめてください（例：you@example.com）。"
      : "うまく保存できませんでした。少し時間をおいて、もう一度お試しください。";
  return (
    <article className="prose">
      <h1>登録できませんでした</h1>
      <p>{message}</p>
      <p>
        {jan ? <Link href={`/products/${jan}`}>商品ページに戻る</Link> : <Link href="/">トップに戻る</Link>}
      </p>
    </article>
  );
}
