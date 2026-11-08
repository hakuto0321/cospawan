import { describe, expect, it } from "vitest";
import { buildYahooSearchRequest, parseYahooSearch, uniqueByJan, type Candidate } from "./candidates";

describe("buildYahooSearchRequest", () => {
  it("口コミ数の多い順に、在庫ありで検索する", () => {
    const url = buildYahooSearchRequest("猫砂", "CID");
    expect(url).toContain("appid=CID");
    expect(url).toContain("sort=-review_count");
    expect(url).toContain("in_stock=true");
    expect(url).toContain("query=%E7%8C%AB%E7%A0%82");
  });
});

describe("parseYahooSearch", () => {
  it("JAN がある商品だけを候補にする", () => {
    const json = {
      hits: [
        { name: "A", janCode: "4902000000000", seller: { name: "店A" }, review: { count: 10 } },
        { name: "B", janCode: "", review: { count: 5 } },
        { name: "C", janCode: "123", review: { count: 5 } },
        { janCode: "4902000000001" },
      ],
    };
    expect(parseYahooSearch(json, "猫砂")).toEqual([
      { jan: "4902000000000", rawName: "A", shopName: "店A", reviewCount: 10, query: "猫砂" },
    ]);
  });
  it("Yahoo! のエラーは例外にする", () => {
    expect(() => parseYahooSearch({ Error: { Message: "x" } }, "q")).toThrow("Yahoo!APIのエラー");
  });
});

describe("uniqueByJan", () => {
  it("同じ JAN は口コミ数の多いほうにまとめ、多い順に並べる", () => {
    const c = (jan: string, reviewCount: number): Candidate => ({ jan, rawName: "x", shopName: "", reviewCount, query: "q" });
    const out = uniqueByJan([c("1", 3), c("2", 9), c("1", 7)]);
    expect(out.map((x) => [x.jan, x.reviewCount])).toEqual([
      ["2", 9],
      ["1", 7],
    ]);
  });
});
