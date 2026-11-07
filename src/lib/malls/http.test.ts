import { describe, expect, it, vi } from "vitest";
import { createRateLimiter, getJson, MallApiError } from "./http";

const noWait = async () => {};

describe("createRateLimiter", () => {
  it("前回から決めた間隔をあけて順に実行する", async () => {
    let t = 0;
    const waits: number[] = [];
    const schedule = createRateLimiter(1100, () => t, async (ms) => {
      waits.push(ms);
      t += ms;
    });
    const order: number[] = [];
    await Promise.all([1, 2, 3].map((n) => schedule(async () => order.push(n))));
    expect(order).toEqual([1, 2, 3]);
    expect(waits).toEqual([1100, 1100]);
  });
});

describe("getJson", () => {
  it("429 はやり直し、成功したら JSON を返す", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 429 }))
      .mockResolvedValueOnce(new Response('{"ok":1}', { status: 200 }));
    await expect(getJson("https://x.example", { fetchImpl, wait: noWait })).resolves.toEqual({ ok: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("400 系はやり直さずに失敗する", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{"error":"x"}', { status: 403 }));
    await expect(getJson("https://x.example", { fetchImpl, wait: noWait })).rejects.toBeInstanceOf(MallApiError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("やり直しても 5xx なら失敗する", async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => new Response("down", { status: 503 }));
    await expect(getJson("https://x.example", { fetchImpl, wait: noWait, retries: 2 })).rejects.toThrow("HTTP 503");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
