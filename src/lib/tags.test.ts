import { describe, expect, it } from "vitest";
import { inferTags, sizeFromWeight } from "./tags";

describe("sizeFromWeight", () => {
  it("体重の範囲から大きさを決める", () => {
    expect(sizeFromWeight("体重10〜25kg向け")).toEqual(["medium"]);
    expect(sizeFromWeight("体重 25〜40kg")).toEqual(["large"]);
    expect(sizeFromWeight("体重3〜8kg")).toEqual(["small"]);
  });
  it("体重の書き方がなければ空", () => {
    expect(sizeFromWeight("チキン味 3kg")).toEqual([]);
  });
});

describe("inferTags", () => {
  it("名前に犬種があれば、それを使う", () => {
    expect(inferTags({ name: "ロイヤルカナン チワワ用 成犬用 1.5kg", description: null, pet: "dog" }).breeds).toEqual(["chihuahua"]);
  });
  it("名前になく、説明文に犬種が1つだけなら使う", () => {
    const t = inferTags({ name: "ロイヤルカナン 成犬用 3kg", description: "ロイヤルカナン　チワワ　成犬用　3kg", pet: "dog" });
    expect(t.breeds).toEqual(["chihuahua"]);
  });
  it("説明文に犬種が複数あれば、犬種では絞らない", () => {
    const t = inferTags({ name: "ドッグフード 成犬用 3kg", description: "チワワ トイプードル 柴犬 ポメラニアン", pet: "dog" });
    expect(t.breeds).toEqual([]);
  });
  it("大きさは名前→説明文→体重の順。年齢は名前→説明文（1種類だけ）", () => {
    const t = inferTags({ name: "フード 成犬用", description: "体重10〜25kgの中型犬に", pet: "dog" });
    expect(t.sizes).toEqual(["medium"]);
    expect(t.ages).toEqual(["adult"]);
  });
  it("小動物は、犬種・大きさ・年齢を付けない", () => {
    expect(inferTags({ name: "うさぎ用 牧草 チモシー", description: null, pet: "small" })).toEqual({ breeds: [], sizes: [], ages: [] });
  });
});
