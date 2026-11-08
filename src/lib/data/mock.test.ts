import { describe, expect, it } from "vitest";
import { matchesPet } from "./mock";

describe("matchesPet", () => {
  it("犬・猫は、both（両方）も含めて振り分ける", () => {
    expect(matchesPet("dog", "dog")).toBe(true);
    expect(matchesPet("both", "dog")).toBe(true);
    expect(matchesPet("both", "cat")).toBe(true);
    expect(matchesPet("cat", "dog")).toBe(false);
  });
  it("小動物は、小動物の商品だけを出す（犬・猫には出さない）", () => {
    expect(matchesPet("small", "small")).toBe(true);
    expect(matchesPet("small", "dog")).toBe(false);
    expect(matchesPet("both", "small")).toBe(false);
  });
});
