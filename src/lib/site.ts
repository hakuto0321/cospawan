/** サイトのURL（末尾の / なし）。本番では環境変数で指定する */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
