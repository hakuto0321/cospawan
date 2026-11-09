// カテゴリで絞る（プルダウン）。カテゴリの一覧は、そのペットの商品から作る
export type WithCategory = { product: { categoryName: string } };

/** 商品にあるカテゴリの一覧（最初に出てきた順。空の名前は除く） */
export function categoryOptions<T extends WithCategory>(items: T[]): string[] {
  const seen: string[] = [];
  for (const i of items) {
    const c = i.product.categoryName;
    if (c && !seen.includes(c)) seen.push(c);
  }
  return seen;
}

/** 選ばれたカテゴリの商品だけを返す。カテゴリがなければ全部。一覧にない値は無視する */
export function filterByCategory<T extends WithCategory>(items: T[], category: string | null | undefined): T[] {
  if (!category) return items;
  return items.filter((i) => i.product.categoryName === category);
}

/** URLのクエリから、有効なカテゴリだけを取る */
export function pickCategory(raw: string | string[] | undefined, options: string[]): string | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v && options.includes(v) ? v : null;
}
