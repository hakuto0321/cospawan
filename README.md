# ポチどき

いつものペット用品、今が買いどきかがわかるサイト。
方針やルールは [CLAUDE.md](CLAUDE.md)、作業の進み具合は [docs/TASKS.md](docs/TASKS.md) を見てください。

---

## 手元で動かして確かめる（テスト環境）

自分のパソコンでサイトを立ち上げ、ブラウザで触って確かめる手順です。

### 1. はじめの1回だけ

必要なもの：Node.js 20 以上（`node -v` で確認）

```bash
npm install
```

```bash
cp .env.example .env.local
```

`.env.local` はコミットされません。キーなどはここに入れます。空のままでも、仮データで画面を確かめられます。

### 2. 立ち上げる

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開きます。ファイルを直すと、画面がすぐに変わります。止めるときは、ターミナルで `Ctrl + C` を押します。

### 3. 見るところ

| ページ | URL | 確かめること |
| --- | --- | --- |
| 今日の買いどき（犬） | http://localhost:3000/ | 並び順、「おトク」の表示、更新日時、セールの予告 |
| 今日の買いどき（猫） | http://localhost:3000/cat | 犬・猫の切り替え |
| 商品ページ | http://localhost:3000/products/2000000000015 | 冒頭の一文、ショップ比較の表、送料別の表示、Q&A |
| プライバシーポリシー | http://localhost:3000/privacy | 文面 |
| 利用規約 | http://localhost:3000/terms | 文面 |
| お問い合わせ・運営者 | http://localhost:3000/contact | 運営者名とメール（未設定なら「準備中」） |
| robots.txt | http://localhost:3000/robots.txt | AIクローラーを許可していること |
| llms.txt | http://localhost:3000/llms.txt | 商品ごとの実質最安の一文 |
| sitemap | http://localhost:3000/sitemap.xml | 全ページが載っていること |

あわせて確かめたいこと：

- **スマホの幅**：ブラウザの開発者ツール（Chrome なら `Cmd + Option + I` → 左上のスマホのアイコン）で、幅を狭くして崩れないか
- **JavaScript なし**：開発者ツールで JavaScript を切っても、内容が読めるか
- **全ページ共通**：ヘッダーの「広告を含みます」、フッターの規約リンクと「Web Services by Yahoo! JAPAN」

いまの画面は**仮データ**です（画面上部に「開発中：…仮のデータです」と出ます）。商品名・ショップ・価格はすべて架空です。

### 4. 本番に近い形で確かめる

`npm run dev` は開発用なので、本番より遅く、動きも少し違います。本番と同じ作り方で確かめるときは、次のようにします。

```bash
npm run build
```

```bash
npm start
```

同じく http://localhost:3000 で開きます。

---

## 自動テスト

```bash
npm test
```

実質価格の計算、保留の判定、買いどきの並べ方、商品ページの中身を確かめます。
型チェックとコードの書き方のチェックは、次のコマンドで行います。

```bash
npx tsc --noEmit
```

```bash
npm run lint
```

---

## データベース（Supabase）

テーブルの定義は `supabase/migrations/`、開発用の仮データは `supabase/seed.sql` にあります。

`.env.local` の `SUPABASE_DB_URL`（**開発用**プロジェクトの接続文字列）に入れたうえで、次を実行します。

```bash
npm run db:push -- --dry
```

```bash
npm run db:push -- --seed
```

1つ目は「何を流すか」の表示だけ、2つ目は実際にテーブルと仮データを入れます。2回目以降に流すのは、新しく足したマイグレーションだけです。

**本番用のDBに対しては、オーナーの確認なしに実行しないこと。** また、`--seed` は本番では使いません。
