import { describe, expect, it } from "vitest";
import { ageTags, breedTags, dogSizeTags, DOG_BREEDS, forDogSize, forProfile, parseDogSize, parseWatch, toggleWatch, type DogSize } from "./personal";

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

describe("犬種・猫種・年齢", () => {
  it("名前から犬種を読む（別名も読む）", () => {
    expect(breedTags("ロイヤルカナン チワワ用 成犬用 1.5kg", DOG_BREEDS)).toEqual(["chihuahua"]);
    expect(breedTags("トイプードル 専用 2kg", DOG_BREEDS)).toEqual(["poodle"]);
    expect(breedTags("ドッグフード 2kg", DOG_BREEDS)).toEqual([]);
  });
  it("名前から年齢を読む", () => {
    expect(ageTags("ロイヤルカナン 子犬用 2kg")).toEqual(["young"]);
    expect(ageTags("ニュートロ 成犬用 3kg")).toEqual(["adult"]);
    expect(ageTags("シニア犬用 1kg")).toEqual(["senior"]);
  });
  it("犬種が決まったら、その犬種の商品だけ。年齢は前に出す", () => {
    const items = [
      { id: 1, breeds: ["chihuahua"], ages: ["adult" as const] },
      { id: 2, breeds: ["chihuahua"], ages: ["young" as const] },
      { id: 3, breeds: ["poodle"], ages: ["young" as const] },
      { id: 4, breeds: [] as string[], ages: ["young" as const] },
    ];
    expect(forProfile(items, { breed: "chihuahua", age: "young" }).map((i) => i.id)).toEqual([2, 1]);
  });
});
