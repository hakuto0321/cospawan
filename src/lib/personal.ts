// この端末だけに保存する「気になる商品」と「犬のサイズ」（サーバーには送らない）
// 名前から、犬のサイズの対象を読む。読めない商品は、どのサイズにも合わせない（外れを出さないため）
export type DogSize = "small" | "medium" | "large";

export const DOG_SIZE_LABEL: Record<DogSize, string> = { small: "小型犬", medium: "中型犬", large: "大型犬" };
export const WATCH_KEY = "cospawan:watch";
export const SIZE_KEY = "cospawan:dogSize";
export const WATCH_MAX = 50;

export function dogSizeTags(rawName: string): DogSize[] {
  const n = rawName.normalize("NFKC");
  if (/全犬種/.test(n)) return ["small", "medium", "large"];
  const tags: DogSize[] = [];
  if (/小型犬|超小型犬|ミニ犬/.test(n)) tags.push("small");
  if (/中型犬/.test(n)) tags.push("medium");
  if (/大型犬/.test(n)) tags.push("large");
  return tags;
}

/** サイズが合う商品だけを、元の順で返す（サイズ未設定なら全部） */
export function forDogSize<T extends { sizes: DogSize[] }>(items: T[], size: DogSize | null): T[] {
  if (!size) return items;
  return items.filter((i) => i.sizes.includes(size));
}

export function parseWatch(raw: string | null): string[] {
  try {
    const v = JSON.parse(raw ?? "[]");
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === "string" && /^[0-9]{8}$|^[0-9]{13}$/.test(x)).slice(0, WATCH_MAX);
  } catch {
    return [];
  }
}

export function parseDogSize(raw: string | null): DogSize | null {
  return raw === "small" || raw === "medium" || raw === "large" ? raw : null;
}

export function toggleWatch(list: string[], jan: string): string[] {
  if (list.includes(jan)) return list.filter((j) => j !== jan);
  return [jan, ...list].slice(0, WATCH_MAX);
}
