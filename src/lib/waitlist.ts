// 通知の事前登録：フォームの値を確かめる

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_EMAIL_LENGTH = 254;

export type WaitlistInput = { email: string; jan: string | null };

export type WaitlistParse =
  | { ok: true; value: WaitlistInput }
  | { ok: false; reason: "email" | "bot" };

/**
 * フォームの値を確かめる。
 * website はロボット避けの隠し欄。人には見えないので、入っていたらロボットとみなす
 */
export function parseWaitlistForm(form: FormData): WaitlistParse {
  if (String(form.get("website") ?? "") !== "") return { ok: false, reason: "bot" };

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) return { ok: false, reason: "email" };

  const janRaw = String(form.get("jan") ?? "").trim();
  const jan = /^[0-9]{8}$|^[0-9]{13}$/.test(janRaw) ? janRaw : null;

  return { ok: true, value: { email, jan } };
}

/** 同じサイトから送られたフォームか（ほかのサイトからの勝手な送信を弾く） */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  // Origin を付けない古いブラウザは通す（ほかの対策：隠し欄、Cloudflare の制限）
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}
