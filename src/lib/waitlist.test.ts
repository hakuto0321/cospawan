import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/waitlist/route";
import { memoryStore } from "@/lib/store/memory";
import { isSameOrigin, parseWaitlistForm } from "./waitlist";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

async function post(fields: Record<string, string>, origin: string | null = "http://localhost:3000") {
  const headers: Record<string, string> = {};
  if (origin) headers.origin = origin;
  const req = new NextRequest("http://localhost:3000/api/waitlist", { method: "POST", body: form(fields), headers });
  return POST(req);
}

beforeEach(() => memoryStore.reset());

describe("parseWaitlistForm", () => {
  it("メールを小文字にそろえ、JAN を確かめる", () => {
    expect(parseWaitlistForm(form({ email: " Foo@Example.com ", jan: "2000000000015" }))).toEqual({
      ok: true,
      value: { email: "foo@example.com", jan: "2000000000015" },
    });
    expect(parseWaitlistForm(form({ email: "a@example.com", jan: "abc" }))).toEqual({
      ok: true,
      value: { email: "a@example.com", jan: null },
    });
  });
  it("不正なメール・隠し欄が埋まっているものは弾く", () => {
    expect(parseWaitlistForm(form({ email: "not-an-email" }))).toEqual({ ok: false, reason: "email" });
    expect(parseWaitlistForm(form({ email: `${"a".repeat(250)}@example.com` }))).toEqual({ ok: false, reason: "email" });
    expect(parseWaitlistForm(form({ email: "a@example.com", website: "http://spam" }))).toEqual({ ok: false, reason: "bot" });
  });
});

describe("isSameOrigin", () => {
  it("ほかのサイトからの送信は弾く", () => {
    const req = (origin?: string) =>
      new Request("http://localhost:3000/api/waitlist", { method: "POST", headers: origin ? { origin } : {} });
    expect(isSameOrigin(req("http://localhost:3000"))).toBe(true);
    expect(isSameOrigin(req())).toBe(true);
    expect(isSameOrigin(req("https://evil.example.com"))).toBe(false);
  });
});

describe("POST /api/waitlist", () => {
  it("保存して完了ページへ 303 で移動する", async () => {
    const res = await post({ email: "a@example.com", jan: "2000000000015" });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/waitlist/done?p=2000000000015");
    expect(memoryStore.waitlist).toMatchObject([{ email: "a@example.com", productId: 1 }]);
    expect(memoryStore.usageEvents).toMatchObject([{ type: "waitlist_signup", productId: 1 }]);
  });
  it("二重登録は保存しないが、同じ完了ページを見せる", async () => {
    await post({ email: "a@example.com", jan: "2000000000015" });
    const res = await post({ email: "A@example.com", jan: "2000000000015" });
    expect(res.headers.get("location")).toBe("http://localhost:3000/waitlist/done?p=2000000000015");
    expect(memoryStore.waitlist).toHaveLength(1);
    expect(memoryStore.usageEvents).toHaveLength(1);
  });
  it("不正なメールはエラーページへ", async () => {
    const res = await post({ email: "bad", jan: "2000000000015" });
    expect(res.headers.get("location")).toBe("http://localhost:3000/waitlist/error?reason=email&p=2000000000015");
    expect(memoryStore.waitlist).toHaveLength(0);
  });
  it("ロボットは保存せず、完了したように見せる", async () => {
    const res = await post({ email: "a@example.com", website: "x" });
    expect(res.headers.get("location")).toBe("http://localhost:3000/waitlist/done");
    expect(memoryStore.waitlist).toHaveLength(0);
  });
  it("ほかのサイトからの送信は 403", async () => {
    const res = await post({ email: "a@example.com" }, "https://evil.example.com");
    expect(res.status).toBe(403);
    expect(memoryStore.waitlist).toHaveLength(0);
  });
});
