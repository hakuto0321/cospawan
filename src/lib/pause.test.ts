import { describe, expect, it } from "vitest";
import { pricesPaused } from "./pause";

describe("pricesPaused", () => {
  it("未設定なら止めない", () => {
    expect(pricesPaused({})).toBe(false);
  });
  it("1 か true なら止める（大文字・空白も許す）", () => {
    expect(pricesPaused({ PRICES_PAUSED: "1" })).toBe(true);
    expect(pricesPaused({ PRICES_PAUSED: " TRUE " })).toBe(true);
  });
  it("それ以外の値では止めない", () => {
    expect(pricesPaused({ PRICES_PAUSED: "0" })).toBe(false);
    expect(pricesPaused({ PRICES_PAUSED: "yes" })).toBe(false);
  });
});
