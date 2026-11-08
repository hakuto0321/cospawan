// 売れ筋の自動登録：探す → 名前で分類 → 楽天・Yahoo!の両方で JAN を確かめる → 下書きで登録
// 登録は必ず status = 'draft' にする。下書きは公開されないので、オーナーが確かめてから active にする
import { parseYahooSearch, uniqueByJan, type Candidate } from "./candidates";
import { cleanName, classifyName, type CategorySlug, type Classified } from "./classify";

export type VerifyResult = { rakutenOffers: number; yahooOffers: number };

export interface DiscoveryRepo {
  existingJans(): Promise<Set<string>>;
  /** カテゴリの slug → id */
  categoryIds(): Promise<Map<string, number>>;
  insertDrafts(rows: DraftInsert[]): Promise<void>;
}

export type DraftInsert = {
  jan: string;
  name: string;
  pet_type: Classified["petType"];
  category_id: number;
  size: string | null;
  unit: string | null;
  amount: number | null;
  status: "draft";
};

export type DiscoveryDeps = {
  /** Yahoo! の検索を1回呼んで、応答の JSON を返す（間隔あけは呼ぶ側） */
  search(query: string): Promise<unknown>;
  /** 楽天・Yahoo! それぞれで、JAN の価格が取れたかを数える */
  verify(jan: string): Promise<VerifyResult>;
  /** null のときは DB に触らない（確認だけのとき） */
  repo: DiscoveryRepo | null;
};

export type DiscoveryOptions = {
  queries: string[];
  /** 今回新しく下書きにする上限 */
  limit: number;
  /** false のときは確認だけ。DB には書かない */
  write: boolean;
};

export type Accepted = { jan: string; name: string; classified: Classified; reviewCount: number; query: string };
export type Rejected = { jan: string; name: string; reason: string };

export type DiscoveryReport = {
  searched: number;
  found: number;
  accepted: Accepted[];
  rejected: Rejected[];
  written: number;
};

export async function runDiscovery(opts: DiscoveryOptions, deps: DiscoveryDeps): Promise<DiscoveryReport> {
  const all: Candidate[] = [];
  for (const q of opts.queries) {
    all.push(...parseYahooSearch(await deps.search(q), q));
  }
  const candidates = uniqueByJan(all);

  const existing = deps.repo ? await deps.repo.existingJans() : new Set<string>();
  const accepted: Accepted[] = [];
  const rejected: Rejected[] = [];

  for (const c of candidates) {
    if (accepted.length >= opts.limit) break;
    const name = cleanName(c.rawName);
    const reject = (reason: string) => rejected.push({ jan: c.jan, name, reason });

    if (existing.has(c.jan)) {
      reject("登録済み");
      continue;
    }
    const classified = classifyName(c.rawName);
    if (!classified) {
      reject("ペットのカテゴリ・種類が名前から判定できない、または除外語を含む");
      continue;
    }

    let v: VerifyResult;
    try {
      v = await deps.verify(c.jan);
    } catch (e) {
      reject(`価格の確認でエラー：${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    if (v.rakutenOffers === 0) {
      reject("楽天で同じJANの商品が見つからない");
      continue;
    }
    if (v.yahooOffers === 0) {
      reject("Yahoo!で同じJANの商品が見つからない");
      continue;
    }

    accepted.push({ jan: c.jan, name, classified, reviewCount: c.reviewCount, query: c.query });
  }

  let written = 0;
  if (opts.write && deps.repo && accepted.length > 0) {
    const ids = await deps.repo.categoryIds();
    const rows: DraftInsert[] = accepted.map((a) => {
      const categoryId = ids.get(a.classified.categorySlug as CategorySlug);
      if (categoryId === undefined) throw new Error(`カテゴリ「${a.classified.categorySlug}」がDBにありません`);
      return {
        jan: a.jan,
        name: a.name,
        pet_type: a.classified.petType,
        category_id: categoryId,
        size: a.classified.size,
        unit: a.classified.unit,
        amount: a.classified.amount,
        status: "draft",
      };
    });
    await deps.repo.insertDrafts(rows);
    written = rows.length;
  }

  return { searched: opts.queries.length, found: candidates.length, accepted, rejected, written };
}
