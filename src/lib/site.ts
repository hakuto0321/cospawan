/** サイトのURL（末尾の / なし）。本番では環境変数で指定する */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const SITE_NAME = "ポチどき";

/** 運営者名。未設定なら null（画面には「準備中」と出す） */
export const OPERATOR_NAME = process.env.NEXT_PUBLIC_OPERATOR_NAME || null;

/** 問い合わせ先のメールアドレス。未設定なら null（画面には「準備中」と出す） */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || null;

/** プライバシーポリシーと利用規約の制定日（公開日に合わせて変える） */
export const POLICY_DATE = "2026年11月8日";
