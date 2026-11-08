import { describe, expect, it } from "vitest";
import { dogSizeTags, parseDogSize, parseWatch, forDogSize, toggleWatch, type DogSize } from "./personal";

describe("dogSizeTags", () => {
  it("名前から犬のサイズを読む", () => {
    expect(dogSizeTags("ロイヤルカナン 超小型犬〜小型犬用 成犬用")).toEqual(["small"]);
    expect(dogSizeTags("ニュートロ 中型犬〜大型犬用 成犬用")).toEqual(["medium", "large"]);
    expect(dogSizeTags("フード 全犬種用")).toEqual(["small", "medium", "large"]);
  });
  it("読めなければ空（どのサイズにも合わせない）", () => {
    expect(dogSizeTags("ドッグフード 2kg")).toEqual([]);
  });
});

describe("forDogSize", () => {
  const items: { id: number; sizes: DogSize[] }[] = [
    { id: 1, sizes: ["large"] },
    { id: 2, sizes: ["small"] },
    { id: 3, sizes: [] },
  ];
  it("サイズが合うものだけを、元の順で返す", () => {
    expect(forDogSize([...items], "small").map((i) => i.id)).toEqual([2]);
  });
  it("サイズが未設定なら、そのまま", () => {
    expect(forDogSize([...items], null).map((i) => i.id)).toEqual([1, 2, 3]);
  });
});

describe("保存された値の読み取り", () => {
  it("壊れた値や、JAN以外は捨てる", () => {
    expect(parseWatch("not json")).toEqual([]);
    expect(parseWatch(JSON.stringify(["2000000000015", "abc", 5]))).toEqual(["2000000000015"]);
  });
  it("サイズは決まった値だけ", () => {
    expect(parseDogSize("small")).toBe("small");
    expect(parseDogSize("huge")).toBeNull();
  });
  it("気になるは、押すたびに入れる・外す。上限あり", () => {
    expect(toggleWatch([], "2000000000015")).toEqual(["2000000000015"]);
    expect(toggleWatch(["2000000000015"], "2000000000015")).toEqual([]);
  });
});
