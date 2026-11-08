import { describe, expect, it } from "vitest";
import { categoryOptions, filterByCategory, pickCategory } from "./category";

const items = [
  { product: { categoryName: "フード" } },
  { product: { categoryName: "猫砂" } },
  { product: { categoryName: "フード" } },
  { product: { categoryName: "" } },
];

describe("カテゴリ", () => {
  it("一覧は重ならず、空の名前は除く", () => {
    expect(categoryOptions(items)).toEqual(["フード", "猫砂"]);
  });
  it("選んだカテゴリだけに絞る。選ばなければ全部", () => {
    expect(filterByCategory(items, "フード")).toHaveLength(2);
    expect(filterByCategory(items, null)).toHaveLength(4);
  });
  it("一覧にない値（URLの改ざんなど）は無視する", () => {
    expect(pickCategory("おもちゃ", ["フード", "猫砂"])).toBeNull();
    expect(pickCategory(["猫砂"], ["フード", "猫砂"])).toBe("猫砂");
    expect(pickCategory(undefined, ["フード"])).toBeNull();
  });
});
