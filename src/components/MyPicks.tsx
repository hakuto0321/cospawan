"use client";

// この端末に保存した「気になる商品」と、犬のサイズに合う商品。サーバーには送らない
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Pet } from "@/lib/data";
import { yen } from "@/lib/format";
import {
  DOG_SIZE_LABEL,
  forDogSize,
  type DogSize,
  parseDogSize,
  parseWatch,
  SIZE_KEY,
  WATCH_KEY,
} from "@/lib/personal";

export type PickItem = {
  jan: string;
  name: string;
  price: number;
  sizes: DogSize[];
};

function readLocal<T>(key: string, parse: (raw: string | null) => T, fallback: T): T {
  try {
    return parse(window.localStorage.getItem(key));
  } catch {
    return fallback;
  }
}

export function MyPicks({ pet, items }: { pet: Pet; items: PickItem[] }) {
  const [watch, setWatch] = useState<string[]>([]);
  const [size, setSize] = useState<DogSize | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setWatch(readLocal(WATCH_KEY, parseWatch, []));
    setSize(readLocal(SIZE_KEY, parseDogSize, null));
    setReady(true);
  }, []);

  function chooseSize(next: DogSize | null) {
    setSize(next);
    try {
      if (next) window.localStorage.setItem(SIZE_KEY, next);
      else window.localStorage.removeItem(SIZE_KEY);
    } catch {
      // 保存できなくても、今の画面では選べる
    }
  }

  const watched = watch.map((jan) => items.find((i) => i.jan === jan)).filter((i): i is PickItem => Boolean(i));
  const fitting = pet === "dog" && size ? forDogSize(items, size).filter((i) => !watch.includes(i.jan)).slice(0, 5) : [];

  if (!ready) return null;

  return (
    <div className="stack">
      {pet === "dog" && (
        <section className="card stack">
          <h2>うちの子のサイズ</h2>
          <p className="sub small">選ぶと、合うサイズの商品を出します。この端末だけに保存します（任意）。</p>
          <div className="seg" role="group" aria-label="犬のサイズ">
            {(["small", "medium", "large"] as const).map((s) => (
              <button key={s} type="button" aria-pressed={size === s} className={size === s ? "on" : undefined} onClick={() => chooseSize(size === s ? null : s)}>
                {DOG_SIZE_LABEL[s]}
              </button>
            ))}
          </div>
        </section>
      )}

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

      {fitting.length > 0 && size && (
        <section className="stack">
          <h2>{DOG_SIZE_LABEL[size]}に合いそうなもの</h2>
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
  );
}
