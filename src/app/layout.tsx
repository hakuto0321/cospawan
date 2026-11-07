import type { Metadata } from "next";
import Link from "next/link";
import { Zen_Maru_Gothic } from "next/font/google";
import { SITE_URL } from "@/lib/site";
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
    default: "ポチどき｜いつものペット用品、今が買いどき？",
    template: "%s｜ポチどき",
  },
  description:
    "楽天市場とYahoo!ショッピングの価格を1日3回集めて、送料とポイントを含めた実質価格で買いどきをお知らせします。",
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
              ポチどき
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
              <Link href="/contact">お問い合わせ</Link>
            </nav>
            <p>
              当サイトはアフィリエイト広告を利用しています。価格は取得日時時点のもので、変わることがあります。
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
