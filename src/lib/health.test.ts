import { describe, expect, it } from "vitest";
import { evaluateFreshness } from "./health";

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
