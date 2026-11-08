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

// ── 犬種・猫種・年齢（商品名から読む。読めないものは、その条件では出さない）──

export type Breed = { id: string; label: string; aliases: string[] };

export const DOG_BREEDS: Breed[] = [
  { id: "chihuahua", label: "チワワ", aliases: ["チワワ"] },
  { id: "poodle", label: "トイプードル", aliases: ["トイプードル", "トイ・プードル", "プードル"] },
  { id: "dachshund", label: "ダックスフンド", aliases: ["ダックス"] },
  { id: "pomeranian", label: "ポメラニアン", aliases: ["ポメラニアン", "ポメ"] },
  { id: "shiba", label: "柴犬", aliases: ["柴犬"] },
  { id: "yorkie", label: "ヨークシャテリア", aliases: ["ヨークシャ", "ヨーキー"] },
  { id: "maltese", label: "マルチーズ", aliases: ["マルチーズ"] },
  { id: "shihtzu", label: "シーズー", aliases: ["シーズー"] },
  { id: "papillon", label: "パピヨン", aliases: ["パピヨン"] },
  { id: "schnauzer", label: "ミニチュアシュナウザー", aliases: ["シュナウザー", "シュナ"] },
  { id: "corgi", label: "コーギー", aliases: ["コーギー"] },
  { id: "frenchbulldog", label: "フレンチブルドッグ", aliases: ["フレンチブルドッグ", "フレブル"] },
  { id: "labrador", label: "ラブラドール", aliases: ["ラブラドール"] },
  { id: "golden", label: "ゴールデンレトリバー", aliases: ["ゴールデンレトリバー"] },
];

export const CAT_BREEDS: Breed[] = [
  { id: "munchkin", label: "マンチカン", aliases: ["マンチカン"] },
  { id: "americanshorthair", label: "アメリカンショートヘア", aliases: ["アメリカンショートヘア", "アメショ"] },
  { id: "scottishfold", label: "スコティッシュフォールド", aliases: ["スコティッシュフォールド", "スコティッシュ"] },
  { id: "norwegian", label: "ノルウェージャン", aliases: ["ノルウェージャン"] },
  { id: "persian", label: "ペルシャ", aliases: ["ペルシャ", "ペルシャ・チンチラ"] },
  { id: "ragdoll", label: "ラグドール", aliases: ["ラグドール"] },
];

export type Age = "young" | "adult" | "senior";
export const AGE_LABEL: Record<Age, string> = { young: "子ども（子犬・子猫）", adult: "成犬・成猫", senior: "シニア" };

const AGE_PATTERNS: Record<Age, RegExp> = {
  young: /子犬|子猫|パピー|キトン|仔犬|仔猫|成長後期|子犬用|子猫用/,
  adult: /成犬|成猫|アダルト/,
  senior: /シニア|高齢|老犬|老猫|7歳|10歳以上/,
};

export function breedTags(rawName: string, breeds: Breed[]): string[] {
  const n = rawName.normalize("NFKC");
  return breeds.filter((b) => b.aliases.some((a) => n.includes(a.normalize("NFKC")))).map((b) => b.id);
}

export function ageTags(rawName: string): Age[] {
  const n = rawName.normalize("NFKC");
  return (Object.keys(AGE_PATTERNS) as Age[]).filter((a) => AGE_PATTERNS[a].test(n));
}

export type Profile = { breed: string | null; age: Age | null };

/**
 * この端末の条件に合う商品を選ぶ。
 * - 犬種・猫種：名前に、その犬種（猫種）が書いてあるものだけ（ほかの犬種用を出さない）
 * - 年齢：合うものを前に出す（年齢が読めないものは、外さずに後ろへ）
 */
export function forProfile<T extends { breeds: string[]; ages: Age[] }>(items: T[], profile: Profile): T[] {
  const picked = profile.breed ? items.filter((i) => i.breeds.includes(profile.breed as string)) : items;
  if (!profile.age) return picked;
  const age = profile.age;
  return [...picked].sort((a, b) => Number(b.ages.includes(age)) - Number(a.ages.includes(age)));
}

// この端末の条件（ペットごとに、犬種・年齢・犬のサイズ）
export const PROFILE_KEY = "cospawan:profile";
export type PetProfile = { breed: string | null; age: Age | null; size: DogSize | null };
export type Profiles = { dog: PetProfile; cat: PetProfile };
export const EMPTY_PROFILE: PetProfile = { breed: null, age: null, size: null };

export function parseProfiles(raw: string | null): Profiles {
  const empty: Profiles = { dog: { ...EMPTY_PROFILE }, cat: { ...EMPTY_PROFILE } };
  try {
    const v = JSON.parse(raw ?? "null") as Partial<Record<"dog" | "cat", Partial<PetProfile>>> | null;
    if (!v || typeof v !== "object") return empty;
    const clean = (p: Partial<PetProfile> | undefined, breeds: Breed[]): PetProfile => ({
      breed: typeof p?.breed === "string" && breeds.some((b) => b.id === p.breed) ? p.breed : null,
      age: p?.age === "young" || p?.age === "adult" || p?.age === "senior" ? p.age : null,
      size: parseDogSize(typeof p?.size === "string" ? p.size : null),
    });
    return { dog: clean(v.dog, DOG_BREEDS), cat: clean(v.cat, CAT_BREEDS) };
  } catch {
    return empty;
  }
}
