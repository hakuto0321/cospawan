"use client";

// この端末に保存した条件（犬種・年齢・サイズ）と「気になる商品」。サーバーには送らない
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Pet } from "@/lib/data";
import { yen } from "@/lib/format";
import {
  AGE_LABEL,
  type Age,
  CAT_BREEDS,
  DOG_BREEDS,
  type Breed,
  DOG_SIZE_LABEL,
  type DogSize,
  EMPTY_PROFILE,
  forDogSize,
  forProfile,
  parseProfiles,
  parseWatch,
  PROFILE_KEY,
  type PetProfile,
  type Profiles,
  WATCH_KEY,
} from "@/lib/personal";

export type PickItem = {
  jan: string;
  name: string;
  price: number;
  sizes: DogSize[];
  breeds: string[];
  ages: Age[];
};

function readLocal<T>(key: string, parse: (raw: string | null) => T, fallback: T): T {
  try {
    return parse(window.localStorage.getItem(key));
  } catch {
    return fallback;
  }
}

const AGE_OPTIONS: (Age | null)[] = [null, "young", "adult", "senior"];
const AGE_SHORT: Record<Age, string> = { young: "子ども", adult: "おとな", senior: "シニア" };

export function MyPicks({ pet, items }: { pet: Pet; items: PickItem[] }) {
  const [watch, setWatch] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Profiles>({ dog: { ...EMPTY_PROFILE }, cat: { ...EMPTY_PROFILE } });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setWatch(readLocal(WATCH_KEY, parseWatch, []));
    setProfiles(readLocal(PROFILE_KEY, parseProfiles, { dog: { ...EMPTY_PROFILE }, cat: { ...EMPTY_PROFILE } }));
    setReady(true);
  }, []);

  if (!ready || pet === "small") return null;

  const breeds: Breed[] = pet === "dog" ? DOG_BREEDS : CAT_BREEDS;
  const profile: PetProfile = profiles[pet];

  function update(next: Partial<PetProfile>) {
    const merged: Profiles = { ...profiles, [pet]: { ...profile, ...next } };
    setProfiles(merged);
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
    } catch {
      // 保存できなくても、今の画面では選べる
    }
  }

  const watched = watch.map((jan) => items.find((i) => i.jan === jan)).filter((i): i is PickItem => Boolean(i));
  const base = pet === "dog" && profile.size ? forDogSize(items, profile.size) : items;
  const hasProfile = Boolean(profile.breed || profile.age || profile.size);
  const fitting = hasProfile ? forProfile(base, profile).filter((i) => !watch.includes(i.jan)).slice(0, 5) : [];
  const petName = pet === "dog" ? "犬" : "猫";

  return (
    <div className="stack">
      <details className="card more">
        <summary>うちの子の条件で探す（任意）</summary>
        <div className="stack">
      <section className="stack">
        <h2>うちの子の条件</h2>
        <p className="sub small">任意です。この端末だけに保存します。名前から判定した目安で、合うものを前に出します。</p>

        <label className="field">
          <span className="sub small">{petName}種</span>
          <select value={profile.breed ?? ""} onChange={(e) => update({ breed: e.target.value || null })}>
            <option value="">指定しない</option>
            {breeds.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </label>

        <div className="stack">
          <span className="sub small">年齢</span>
          <div className="seg" role="group" aria-label="年齢">
            {AGE_OPTIONS.map((a) => (
              <button key={a ?? "none"} type="button" aria-pressed={profile.age === a} onClick={() => update({ age: a })}>
                {a ? AGE_SHORT[a] : "指定なし"}
              </button>
            ))}
          </div>
          {profile.age && <p className="sub small">{AGE_LABEL[profile.age]}</p>}
        </div>

        {pet === "dog" && (
          <div className="stack">
            <span className="sub small">大きさ</span>
            <div className="seg" role="group" aria-label="犬のサイズ">
              {(["small", "medium", "large"] as const).map((s) => (
                <button key={s} type="button" aria-pressed={profile.size === s} onClick={() => update({ size: profile.size === s ? null : s })}>
                  {DOG_SIZE_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {fitting.length > 0 && (
        <section className="stack">
          <h2>{petName}の条件に合いそうなもの</h2>
          <ul className="my-list">
            {fitting.map((i) => (
              <li key={i.jan} className="card rank-item">
                <Link href={`/products/${i.jan}`} className="rank-name">
                  {i.name}
                </Link>
                <span className="price rank-yen">{yen(i.price)}</span>
              </li>
            ))}
          </ul>
          <p className="sub small">名前から判定した目安です。商品の説明も確かめてください。</p>
        </section>
      )}
        </div>
      </details>

      {watched.length > 0 && (
        <section className="stack">
          <h2>あなたの気になる商品</h2>
          <ul className="my-list">
            {watched.map((i) => (
              <li key={i.jan} className="card rank-item">
                <Link href={`/products/${i.jan}`} className="rank-name">
                  {i.name}
                </Link>
                <span className="price rank-yen">{yen(i.price)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}
