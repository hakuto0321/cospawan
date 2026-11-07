import type { Metadata } from "next";
import Link from "next/link";
import { ContactEmail } from "@/components/ContactLine";
import { POLICY_DATE, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <article className="prose">
      <h1>プライバシーポリシー</h1>
      <p className="sub small">{POLICY_DATE} 制定</p>
      <p>
        {SITE_NAME}（以下「当サイト」）は、利用する方の情報を次のとおり扱います。
      </p>

      <h2>1. 集める情報</h2>
      <ul>
        <li>
          <strong>通知の事前登録</strong>：登録フォームに入力されたメールアドレスと、選んだ商品。
        </li>
        <li>
          <strong>ショップへのリンクのクリック</strong>：どの商品の、どのモールへのリンクが、いつ押されたか。お名前やメールアドレスなど、個人を特定できる情報は記録しません。
        </li>
        <li>
          <strong>アクセスの記録</strong>：サイトを配信するサービス（Cloudflare）が、IPアドレス、ブラウザの種類、閲覧したページなどを自動で記録します。
        </li>
        <li>
          <strong>お問い合わせ</strong>：メールでお問い合わせいただいたときの、メールアドレスと内容。
        </li>
      </ul>

      <h2>2. 使いみち</h2>
      <ul>
        <li>値下げなどのお知らせメールを送るため（通知を始めたときに、登録された方へお送りします）</li>
        <li>お問い合わせに返信するため</li>
        <li>どの商品がよく見られているかを把握し、サービスを良くするため</li>
        <li>不正なアクセスを防ぎ、サイトを安全に動かすため</li>
      </ul>

      <h2>3. ほかの人や会社に渡すこと</h2>
      <p>
        法令にもとづく場合を除き、集めた情報を本人の同意なくほかの人や会社に渡すことはありません。
      </p>

      <h2>4. 利用している外部サービス</h2>
      <p>サイトの運営のため、次のサービスに情報の保存や処理を任せています。いずれも海外（主に米国）の事業者です。</p>
      <ul>
        <li>Supabase（データの保存）</li>
        <li>Cloudflare（サイトの配信）</li>
        <li>Resend（メールの送信。お知らせメールを始めてから利用します）</li>
      </ul>

      <h2>5. 広告（アフィリエイト）について</h2>
      <p>
        当サイトは、楽天アフィリエイト、バリューコマース（Yahoo!ショッピング）、Amazonアソシエイト・プログラムのアフィリエイト広告を利用しています。ショップへのリンクを押して商品を買うと、当サイトに紹介料が支払われることがあります。お支払いいただく金額は変わりません。
      </p>
      <p>
        これらのサービスは、紹介の成果を記録するためにCookie（クッキー）を使うことがあります。Cookieはブラウザの設定で無効にできます。
      </p>
      <p>Amazonのアソシエイトとして、{SITE_NAME}は適格販売により収入を得ています。</p>

      <h2>6. アクセス解析</h2>
      <p>現在、Googleアナリティクスなどのアクセス解析ツールは使っていません。使い始めるときは、このページでお知らせします。</p>

      <h2>7. 登録の削除</h2>
      <p>
        事前登録したメールアドレスの削除をご希望の場合は、下の問い合わせ先までご連絡ください。確認のうえ削除します。
      </p>

      <h2>8. このポリシーの変更</h2>
      <p>内容を変えるときは、このページで新しい内容をお知らせします。</p>

      <h2>9. 問い合わせ先</h2>
      <p>
        <ContactEmail />（<Link href="/contact">お問い合わせ</Link>）
      </p>
    </article>
  );
}
