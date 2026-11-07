import type { Metadata } from "next";
import { ContactEmail } from "@/components/ContactLine";
import { OPERATOR_NAME, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "お問い合わせ・運営者",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <article className="prose">
      <h1>お問い合わせ・運営者</h1>
      <p>
        価格のまちがい、載せてほしい商品、登録したメールアドレスの削除などは、下のメールアドレスまでお気軽にどうぞ。個人で運営しているため、お返事に数日かかることがあります。
      </p>

      <h2>運営者の情報</h2>
      <dl>
        <dt>サイト名</dt>
        <dd>{SITE_NAME}</dd>
        <dt>運営者</dt>
        <dd>{OPERATOR_NAME ?? "（準備中）"}</dd>
        <dt>メール</dt>
        <dd>
          <ContactEmail />
        </dd>
      </dl>

      <h2>価格のまちがいを見つけたら</h2>
      <p>
        商品名と、まちがっている内容（どのショップの、どの価格か）を教えてください。確認して直します。価格は1日3回取り直しているので、時間がたつと直っていることもあります。
      </p>
    </article>
  );
}
