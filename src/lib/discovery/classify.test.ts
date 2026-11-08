import { describe, expect, it } from "vitest";
import { classifyName, cleanName, parseSize } from "./classify";

describe("parseSize", () => {
  it("kg は g に直す。全角も読める", () => {
    expect(parseSize("ドッグフード 2ｋｇ")).toEqual({ size: "2kg", amount: 2000, unit: "g" });
  });
  it("×で袋数をかける", () => {
    expect(parseSize("ペットシーツ 100枚×2袋")).toEqual({ size: "100枚×2袋", amount: 200, unit: "枚" });
  });
  it("L は L のまま", () => {
    expect(parseSize("猫砂 4L")).toEqual({ size: "4L", amount: 4, unit: "L" });
  });
  it("量が書かれていなければ null", () => {
    expect(parseSize("ペットシーツ")).toEqual({ size: null, amount: null, unit: null });
  });
});

describe("classifyName", () => {
  it("犬用フードはドッグ、カテゴリはフード", () => {
    expect(classifyName("ドッグフード 成犬用 2kg")).toEqual({
      categorySlug: "pet-food",
      petType: "dog",
      size: "2kg",
      amount: 2000,
      unit: "g",
    });
  });
  it("猫砂は猫、カテゴリは猫砂", () => {
    expect(classifyName("システム用 猫砂 4L")?.categorySlug).toBe("pet-litter");
    expect(classifyName("猫砂 4L")?.petType).toBe("cat");
  });
  it("犬と猫の両方が書いてあれば both", () => {
    expect(classifyName("犬猫用 おやつ 100g")?.petType).toBe("both");
  });
  it("シーツは動物の名前がなくても both", () => {
    expect(classifyName("ペットシーツ レギュラー 100枚")).toMatchObject({ categorySlug: "pet-sheet", petType: "both" });
  });
  it("除外語（試供品など）は null", () => {
    expect(classifyName("ドッグフード 試供品 50g")).toBeNull();
  });
  it("人間用のシーツや食器は対象外", () => {
    expect(classifyName("防水シーツ おねしょシーツ シングル 2枚セット")).toBeNull();
    expect(classifyName("Yahoo!1位受賞 犬 早食い防止 食器 皿 S M")).toBeNull();
  });
  it("ブランド名だけのフードも、年齢の言葉があればフードにする", () => {
    expect(classifyName("ロイヤルカナン 柴犬 成犬用 3kg")).toMatchObject({ categorySlug: "pet-food", petType: "dog" });
  });
  it("ペットのカテゴリが判定できなければ null", () => {
    expect(classifyName("ペット用 ベッド 大型")).toBeNull();
    expect(classifyName("犬用 リード 2m")).toBeNull();
  });
});

describe("cleanName", () => {
  it("角括弧・送料などの飾りを外す", () => {
    expect(cleanName("【正規品】ドッグフード（選べるプレゼント付き） 2kg 送料無料")).toBe("ドッグフード 2kg");
  });
});

describe("小動物", () => {
  it("うさぎ用の牧草は、小動物のフードとして読める", () => {
    expect(classifyName("うさぎ用 牧草 チモシー 1kg")).toEqual({
      categorySlug: "pet-food",
      petType: "small",
      size: "1kg",
      amount: 1000,
      unit: "g",
    });
  });
  it("犬や猫の名前があれば、小動物にはしない", () => {
    expect(classifyName("猫用 フード 2kg")?.petType).toBe("cat");
  });
});
