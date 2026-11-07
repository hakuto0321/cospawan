import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/go/[jan]/[...target]/route";
import { mockDataSource } from "@/lib/data/mock";
import { memoryStore } from "@/lib/store/memory";
import { amazonHref, isBot, offerHref, resolveOutbound } from "./outbound";

const BROWSER = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1";

async function go(path: string, ua: string | null = BROWSER) {
  const headers = ua ? { "user-agent": ua } : undefined;
  const req = new NextRequest(`http://localhost:3000${path}`, { headers });
  const [, , jan, ...target] = path.split("/");
  return GET(req, { params: Promise.resolve({ jan, target }) });
}

beforeEach(() => memoryStore.reset());

describe("リンクの形", () => {
  it("自サイトの /go/ を通す。商品IDは URL 用に変換する", () => {
    expect(offerHref("2000000000015", { mall: "rakuten", itemCode: "shop:10001" })).toBe(
      "/go/2000000000015/rakuten/shop%3A10001",
    );
    expect(amazonHref("2000000000015")).toBe("/go/2000000000015/amazon");
  });
});

describe("resolveOutbound", () => {
  it("商品データにある行き先だけを返す", async () => {
    const item = (await mockDataSource.getProduct("2000000000015"))!;
    const offer = item.offers[0];
    expect(resolveOutbound(item, [offer.mall, offer.itemCode])).toEqual({ url: offer.url, mall: offer.mall });
    expect(resolveOutbound(item, ["amazon"])?.mall).toBe("amazon");
    expect(resolveOutbound(item, ["rakuten", "存在しない"])).toBeNull();
    expect(resolveOutbound(item, ["https://evil.example.com"])).toBeNull();
  });
});

describe("isBot", () => {
  it("ロボットと UA なしは記録しない", () => {
    expect(isBot(BROWSER)).toBe(false);
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBot("Mozilla/5.0 AppleWebKit (compatible; ClaudeBot/1.0)")).toBe(true);
    expect(isBot(null)).toBe(true);
  });
});

describe("GET /go/...", () => {
  it("ショップへ 302 で送り、クリックを記録する", async () => {
    const item = (await mockDataSource.getProduct("2000000000015"))!;
    const offer = item.offers[1];
    const res = await go(offerHref("2000000000015", offer));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(offer.url);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(memoryStore.usageEvents).toMatchObject([{ type: "click_out", productId: item.product.id, mall: offer.mall }]);
  });
  it("Amazon も記録して送る", async () => {
    const res = await go(amazonHref("2000000000015"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://www.amazon.co.jp/");
    expect(memoryStore.usageEvents[0]).toMatchObject({ type: "click_out", mall: "amazon" });
  });
  it("ロボットは送るが記録しない", async () => {
    const res = await go(amazonHref("2000000000015"), "Googlebot/2.1");
    expect(res.status).toBe(302);
    expect(memoryStore.usageEvents).toHaveLength(0);
  });
  it("行き先がなければ商品ページへ、商品がなければトップへ戻す（記録しない）", async () => {
    const a = await go("/go/2000000000015/rakuten/nope");
    expect(a.headers.get("location")).toBe("http://localhost:3000/products/2000000000015");
    const b = await go("/go/9999999999999/amazon");
    expect(b.headers.get("location")).toBe("http://localhost:3000/");
    expect(memoryStore.usageEvents).toHaveLength(0);
  });
});
