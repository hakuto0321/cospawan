"use client";

// 「気になる」ボタン。この端末の中だけに保存する（サーバーには送らない）
import { useEffect, useState } from "react";
import { parseWatch, toggleWatch, WATCH_KEY } from "@/lib/personal";

function readWatch(): string[] {
  try {
    return parseWatch(window.localStorage.getItem(WATCH_KEY));
  } catch {
    return [];
  }
}

export function WatchButton({ jan }: { jan: string }) {
  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setOn(readWatch().includes(jan));
    setReady(true);
  }, [jan]);

  function press() {
    const next = toggleWatch(readWatch(), jan);
    try {
      window.localStorage.setItem(WATCH_KEY, JSON.stringify(next));
    } catch {
      // 保存できない端末（プライベートモードなど）でも、押した見た目だけは変える
    }
    setOn(next.includes(jan));
  }

  return (
    <button type="button" className={`button button-ghost button-wide${on ? " watch-on" : ""}`} onClick={press} disabled={!ready} aria-pressed={on}>
      {on ? "気になるに入れています（もう一度押すと外れます）" : "気になる（この端末に保存）"}
    </button>
  );
}
