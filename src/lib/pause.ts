// 価格の一時停止（障害のときのスイッチ）
// Cloudflare の環境変数 PRICES_PAUSED を "1" か "true" にすると、価格を出さず「更新中」と表示する
// 外部サービスが壊れて古い・誤った価格を出しそうなときに使う。通常は未設定（止めない）
export function pricesPaused(env: Record<string, string | undefined> = process.env): boolean {
  const v = env.PRICES_PAUSED?.trim().toLowerCase();
  return v === "1" || v === "true";
}

export const PAUSED_MESSAGE = "いま価格を更新しています。しばらくしてから、もう一度見てください。ショップのページでは、最新の価格を確かめられます。";
