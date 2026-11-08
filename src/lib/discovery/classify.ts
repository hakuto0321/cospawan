// 商品の名前から、カテゴリ・ペットの種類・量を読み取る（自動登録の下書き用）
// 読めないものは null を返し、登録しない。量が読めなければ null のまま（オーナーが直す）
export type CategorySlug = "pet-food" | "pet-litter" | "pet-sheet";
export type PetType = "dog" | "cat" | "both" | "small";

export type Classified = {
  categorySlug: CategorySlug;
  petType: PetType;
  size: string | null;
  amount: number | null;
  unit: string | null;
};

/** 試供品や小分けなど、残量の計算や比較に向かないもの */
const EXCLUDE_WORDS = [
  "試供品", "サンプル", "お試し", "トライアル", "見本", "ミニパック",
  // フードと同じ名前でも、食器・おもちゃなどは対象外
  "食器", "皿", "ボウル", "給水", "キャリー", "リード", "おもちゃ", "ウェア", "服", "歯磨き", "ベッド", "首輪", "水素水", "レインコート",
];

const CATEGORY_RULES: { slug: CategorySlug; pattern: RegExp }[] = [
  { slug: "pet-litter", pattern: /猫砂|猫用砂|ねこ砂/ },
  // 防水シーツなど人間用のシーツを除くため、「ペット」の付いた言葉だけを見る
  { slug: "pet-sheet", pattern: /ペットシーツ|ペットシート|ペット用シーツ/ },
  // ブランド名だけのフード（「ロイヤルカナン 成犬用」など）も拾えるよう、年齢や味の言葉も見る
  {
    slug: "pet-food",
    pattern: /フード|ごはん|ご飯|おやつ|ジャーキー|缶詰|ちゅ〜る|ちゅーる|成犬|成猫|子犬|子猫|アダルト|パピー|キトン|シニア|チキン|ラム|サーモン|ビーフ|ターキー|牧草|ペレット/,
  },
];

const DOG = /犬|ドッグ|わんちゃん|イヌ/;
const CAT = /猫|キャット|ねこ|ネコ/;
// 犬・猫以外の小動物（うさぎ・ハムスター・小鳥など）
const SMALL = /うさぎ|ウサギ|兎|ハムスター|モルモット|小鳥|インコ|フェレット|チンチラ|デグー|セキセイ|オカメ|文鳥|小動物|ラビット|牧草|チモシー|オーツヘイ/;

// 2kg、100枚、4L、1kg×6袋 など。全角は先に NFKC で半角にしておく
const SIZE = /(\d+(?:\.\d+)?)\s*(kg|g|l|ml|枚|袋|個|本|缶|箱|包|パック)(?:\s*[×x]\s*(\d+)(?:袋|個|本|缶|箱|包|パック)?)?/i;

export function parseSize(name: string): { size: string | null; amount: number | null; unit: string | null } {
  const m = SIZE.exec(name.normalize("NFKC"));
  if (!m) return { size: null, amount: null, unit: null };
  const n = Number(m[1]);
  const times = m[3] ? Number(m[3]) : 1;
  const u = m[2].toLowerCase();
  const base =
    u === "kg" ? { amount: n * 1000, unit: "g" }
    : u === "l" ? { amount: n, unit: "L" }
    : { amount: n, unit: u === "g" || u === "ml" ? u : m[2] };
  return { size: m[0].replace(/\s/g, ""), amount: base.amount * times, unit: base.unit };
}

export function classifyName(rawName: string): Classified | null {
  const name = rawName.normalize("NFKC");
  if (EXCLUDE_WORDS.some((w) => name.includes(w))) return null;

  const rule = CATEGORY_RULES.find((r) => r.pattern.test(name));
  if (!rule) return null;

  const dog = DOG.test(name);
  const cat = CAT.test(name);
  let petType: PetType | null = dog && cat ? "both" : dog ? "dog" : cat ? "cat" : null;
  if (!petType && SMALL.test(name)) petType = "small";
  // シーツは犬にも猫にも使うので、動物の名前がなければ両方にする
  if (!petType && rule.slug === "pet-sheet") petType = "both";
  if (!petType) return null;

  return { categorySlug: rule.slug, petType, ...parseSize(name) };
}

/** 検索結果の名前から、角括弧や送料などの飾りを外す（オーナーが後で直す前提の、読みやすさのための整形） */
export function cleanName(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/\([^)]*\)|\[[^\]]*\]|【[^】]*】|〔[^〕]*〕/g, " ")
    .replace(/送料無料|正規品|あす楽|最安値|ポイント\S*|P\d+倍|★|☆/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}
