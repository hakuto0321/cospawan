// サイトのマーク（丸いバッジ＋吹き出しの尾に「¥」）。タブのアイコン（src/app/icon.svg）と同じ形にする
export function LogoMark() {
  return (
    <svg className="logo-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle cx="32" cy="30" r="26" fill="#F08A4B" />
      <path d="M42 50 L54 62 L40 55 Z" fill="#F08A4B" />
      <text
        x="32"
        y="41"
        textAnchor="middle"
        fontFamily="Zen Maru Gothic, Hiragino Sans, sans-serif"
        fontSize="32"
        fontWeight="900"
        fill="#FFFFFF"
      >
        ¥
      </text>
    </svg>
  );
}
