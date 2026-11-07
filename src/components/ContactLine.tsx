import { CONTACT_EMAIL } from "@/lib/site";

/** 問い合わせ先のメールアドレス。未設定のあいだは「準備中」 */
export function ContactEmail() {
  if (!CONTACT_EMAIL) return <span>（準備中）</span>;
  return <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
}
