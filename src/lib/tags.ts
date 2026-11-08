// 商品ごとの「犬種・大きさ・年齢」を、名前と説明文から自動で決める（手作業はしない）
// 名前に書いてあれば、それを使う（確かさ：高）。名前になければ、説明文から、1つだけ書いてあるときに使う。
// 説明文に複数の犬種が並ぶときは、犬種では絞らない（検索用の言葉が混ざっているため）
import { ageTags, type Age, breedTags, CAT_BREEDS, DOG_BREEDS, dogSizeTags, type DogSize } from "@/lib/personal";

export type ProductTags = {
  breeds: string[];
  sizes: DogSize[];
  ages: Age[];
};

export const EMPTY_TAGS: ProductTags = { breeds: [], sizes: [], ages: [] };

type Pet = "dog" | "cat" | "both" | "small";

/** 体重の目安（例：「体重10〜25kg」）から大きさを決める。一般的な区切り：小型〜10kg、中型10〜25kg、大型25kg〜 */
export function sizeFromWeight(text: string): DogSize[] {
  const n = text.normalize("NFKC");
  const m = /体重[^0-9]{0,6}(\d+(?:\.\d+)?)\s*(?:〜|~|-|ー|から)\s*(\d+(?:\.\d+)?)\s*kg/.exec(n);
  if (!m) return [];
  const lo = Number(m[1]);
  const hi = Number(m[2]);
  const sizes: DogSize[] = [];
  if (lo < 10) sizes.push("small");
  if (hi >= 10 && lo < 25) sizes.push("medium");
  if (hi > 25) sizes.push("large");
  return sizes;
}

export function inferTags(input: { name: string; description?: string | null; pet: Pet }): ProductTags {
  const { name, pet } = input;
  const description = input.description ?? "";
  if (pet === "small") return { ...EMPTY_TAGS };
  const breedList = pet === "dog" ? DOG_BREEDS : pet === "cat" ? CAT_BREEDS : null;

  // 犬種：名前が優先。名前になく、説明文に1つだけ書いてあれば使う
  let breeds: string[] = [];
  if (breedList) {
    breeds = breedTags(name, breedList);
    if (breeds.length === 0 && description) {
      const fromDesc = breedTags(description, breedList);
      if (fromDesc.length === 1) breeds = fromDesc;
    }
  }

  // 大きさ：名前→説明文→体重の目安の順（犬のみ）
  let sizes: DogSize[] = [];
  if (pet === "dog") {
    sizes = dogSizeTags(name);
    if (sizes.length === 0 && description) sizes = dogSizeTags(description);
    if (sizes.length === 0) sizes = sizeFromWeight(`${name} ${description}`);
  }

  // 年齢：名前→説明文（1種類だけのとき）
  let ages = ageTags(name);
  if (ages.length === 0 && description) {
    const fromDesc = ageTags(description);
    if (fromDesc.length === 1) ages = fromDesc;
  }

  return { breeds, sizes, ages };
}
