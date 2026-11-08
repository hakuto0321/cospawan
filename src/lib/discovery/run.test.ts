import { describe, expect, it } from "vitest";
import { runDiscovery, type DiscoveryRepo, type DraftInsert } from "./run";

const hit = (jan: string, name: string, review: number) => ({ janCode: jan, name, seller: { name: "店" }, review: { count: review } });

function fakeRepo(existing: string[] = []) {
  const inserted: DraftInsert[] = [];
  const repo: DiscoveryRepo = {
    existingJans: async () => new Set(existing),
    categoryIds: async () => new Map([["pet-food", 11], ["pet-litter", 12], ["pet-sheet", 13]]),
    insertDrafts: async (rows) => {
      inserted.push(...rows);
    },
  };
  return { repo, inserted };
}

const allOk = async () => ({ rakutenOffers: 2, yahooOffers: 1 });

describe("runDiscovery", () => {
  it("口コミの多い順に、両モールで見つかったものを下書きにする", async () => {
    const { repo, inserted } = fakeRepo();
    const report = await runDiscovery(
      { queries: ["猫砂"], limit: 10, write: true },
      {
        search: async () => ({ hits: [hit("4902000000001", "猫砂 4L", 5), hit("4902000000002", "猫砂 6L", 50)] }),
        verify: allOk,
        repo,
      },
    );
    expect(report.accepted.map((a) => a.jan)).toEqual(["4902000000002", "4902000000001"]);
    expect(inserted).toHaveLength(2);
    expect(inserted[0]).toMatchObject({ jan: "4902000000002", category_id: 12, pet_type: "cat", amount: 6, unit: "L", status: "draft" });
    expect(report.written).toBe(2);
  });

  it("登録済みの JAN、分類できないもの、片方のモールにないものは見送る", async () => {
    const { repo, inserted } = fakeRepo(["4902000000009"]);
    const report = await runDiscovery(
      { queries: ["q"], limit: 10, write: true },
      {
        search: async () => ({
          hits: [
            hit("4902000000009", "猫砂 4L", 100),
            hit("4902000000008", "ペット用 ベッド", 90),
            hit("4902000000007", "猫砂 4L", 80),
          ],
        }),
        verify: async (jan) => (jan === "4902000000007" ? { rakutenOffers: 0, yahooOffers: 1 } : { rakutenOffers: 1, yahooOffers: 1 }),
        repo,
      },
    );
    expect(report.accepted).toHaveLength(0);
    expect(report.rejected.map((r) => r.reason)).toEqual([
      "登録済み",
      "ペットのカテゴリ・種類が名前から判定できない、または除外語を含む",
      "楽天で同じJANの商品が見つからない",
    ]);
    expect(inserted).toHaveLength(0);
  });

  it("確認だけのときは DB に書かない", async () => {
    const { repo, inserted } = fakeRepo();
    const report = await runDiscovery(
      { queries: ["q"], limit: 10, write: false },
      { search: async () => ({ hits: [hit("4902000000001", "猫砂 4L", 5)] }), verify: allOk, repo },
    );
    expect(report.accepted).toHaveLength(1);
    expect(inserted).toHaveLength(0);
    expect(report.written).toBe(0);
  });

  it("上限を超えたら止める。確認中のエラーは見送りにして続ける", async () => {
    const report = await runDiscovery(
      { queries: ["q"], limit: 1, write: false },
      {
        search: async () => ({
          hits: [hit("4902000000001", "猫砂 4L", 9), hit("4902000000002", "猫砂 4L", 8), hit("4902000000003", "猫砂 4L", 7)],
        }),
        verify: async (jan) => {
          if (jan === "4902000000001") throw new Error("Forbidden");
          return allOk();
        },
        repo: null,
      },
    );
    expect(report.rejected[0].reason).toBe("価格の確認でエラー：Forbidden");
    expect(report.accepted.map((a) => a.jan)).toEqual(["4902000000002"]);
  });
});
