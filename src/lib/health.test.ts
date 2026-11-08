import { describe, expect, it } from "vitest";
import { evaluateFreshness, evaluateMallFreshness } from "./health";

const now = new Date("2026-11-08T12:00:00+09:00");

describe("evaluateFreshness", () => {
  it("いちばん新しい取得日時から何時間たったかを返す", () => {
    expect(evaluateFreshness(["2026-11-08T07:05:00+09:00", "2026-11-08T07:00:00+09:00"], now)).toEqual({
      lastUpdatedAt: "2026-11-07T22:05:00.000Z",
      ageHours: 4.9,
      stale: false,
    });
  });
  it("12時間以上たっていたら止まっているとみなす", () => {
    expect(evaluateFreshness(["2026-11-07T23:59:00+09:00"], now).stale).toBe(true);
    expect(evaluateFreshness(["2026-11-08T00:01:00+09:00"], now).stale).toBe(false);
  });
  it("価格が1件もなければ止まっているとみなす", () => {
    expect(evaluateFreshness([], now)).toEqual({ lastUpdatedAt: null, ageHours: null, stale: true });
    expect(evaluateFreshness(["壊れた日時"], now).stale).toBe(true);
  });
});

describe("evaluateMallFreshness", () => {
  it("モールごとに、最後の取得から見て古いかを分ける", () => {
    const now = new Date("2026-11-08T12:00:00+09:00");
    const out = evaluateMallFreshness(
      [
        { mall: "rakuten", fetchedAt: "2026-11-08T11:00:00+09:00" },
        { mall: "yahoo", fetchedAt: "2026-11-07T06:00:00+09:00" },
        { mall: "yahoo", fetchedAt: "2026-11-07T08:00:00+09:00" },
      ],
      now,
    );
    expect(out.rakuten.stale).toBe(false);
    expect(out.yahoo.stale).toBe(true); // 一番新しい取得（前日 8:00）でも 12時間以上前
    expect(out.yahoo.lastUpdatedAt).toBe(new Date("2026-11-07T08:00:00+09:00").toISOString());
  });
});
