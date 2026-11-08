import type { Metadata } from "next";
import Link from "next/link";
import { Zen_Maru_Gothic } from "next/font/google";
import { LogoMark } from "@/components/LogoMark";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const zenMaru = Zen_Maru_Gothic({
  weight: ["500", "700", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-zen-maru",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME}｜いつものペット用品、今が買いどき？`,
    template: `%s｜${SITE_NAME}`,
  },
  description:
    "楽天市場とYahoo!ショッピングの価格を、送料とポイントを込みで比べて、買いどきをお知らせします。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={zenMaru.variable}>
      <body>
        <header className="site-header">
          <div className="container">
            <Link href="/" className="site-logo">
              <LogoMark />
              {SITE_NAME}
            </Link>
            <span className="ad-notice">広告を含みます</span>
          </div>
        </header>
        <main className="site-main">
          <div className="container">{children}</div>
        </main>
        <footer className="site-footer">
          <div className="container">
            <nav>
              <Link href="/privacy">プライバシーポリシー</Link>
              <Link href="/terms">利用規約</Link>
              <Link href="/contact">お問い合わせ・運営者</Link>
            </nav>
            <p>
              当サイトはアフィリエイト広告を利用しています。表示している価格・送料・ポイントは取得した時点のもので、実際の価格とちがうことがあります。購入の前に、必ずショップのページで確かめてください。
            </p>
            <p>
              <a href="https://developer.yahoo.co.jp/sitemap/">Web Services by Yahoo! JAPAN</a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
