/** サイトの /api/revalidate を呼んで、全ページを作り直してもらう */
export function createRevalidator(siteUrl: string, secret: string, fetchImpl: typeof fetch = fetch) {
  return async () => {
    const res = await fetchImpl(`${siteUrl.replace(/\/$/, "")}/api/revalidate`, {
      method: "POST",
      headers: { "x-revalidate-secret": secret },
    });
    if (!res.ok) throw new Error(`再検証に失敗: HTTP ${res.status}`);
  };
}
