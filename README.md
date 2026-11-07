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

`.env.local` はコミットされません。キーなどはここに入れます。

- **Supabase のキーが空のとき**：プログラムの中の仮データで画面が出ます。送客クリックと事前登録はサーバーのメモリに保存し、止めると消えます
- **Supabase のキーを入れたとき**：開発用の DB から読み書きします（入れ方は下の「データベース（Supabase）」）
- キーを入れたまま仮データにしたいときは、`DATA_SOURCE=mock` を入れます

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
| 送客リンク | 商品ページの「〇〇で見る」やショップ名 | 新しいタブでショップ（仮データでは example.com）が開く |
| 事前登録 | 商品ページの「値下げのお知らせを受け取る」 | 登録すると「登録しました」のページになる。形式の違うメールは「登録できませんでした」 |
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

いまの画面の商品名・ショップ・価格は、すべて架空です。仮データのときは、画面上部に「開発中：…仮のデータです」と出ます。開発用の DB のときは、商品名に【仮】と付いています。

DB につないでいるときは、送客クリックと事前登録が DB に残ります。Supabase の画面の Table Editor で、`usage_events` と `waitlist` の表を開くと確かめられます。

### 4. 本番に近い形で確かめる

`npm run dev` は開発用なので、本番より遅く、動きも少し違います。本番と同じ作り方で確かめるときは、次のようにします。

**先に `npm run dev` を止めてください。** 動かしたまま `npm run build` を実行すると、作業用のフォルダ（`.next`）が上書きされ、開発サーバーがエラーになります。そうなったときは、両方を止めて `rm -rf .next` を実行してから立ち上げ直します。

```bash
npm run build
```

```bash
npm start
```

同じく http://localhost:3000 で開きます。

### 5. Cloudflare と同じしくみで確かめる

本番は Cloudflare Workers で動きます（OpenNext を使用）。手元の Cloudflare 互換環境で、本番に一番近い形で確かめられます。Cloudflare のアカウントは要りません。

はじめの1回だけ、手元用の設定ファイルを作ります。

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars` の `REVALIDATE_SECRET` には、適当な長い文字列を入れます。`npm run dev` を止めてから、次を実行します。

```bash
npm run preview
```

http://localhost:8787 で開きます。ビルドに1〜2分かかります。

- バッチ後の「ページの作り直し」も、ここで確かめられます（合言葉は `.dev.vars` の値）。

```bash
curl -X POST -H "x-revalidate-secret: 合言葉" http://localhost:8787/api/revalidate
```

- ログに `DOShardedTagCache ... no such Durable Object class` という赤い警告が出ることがあります。これは、補助のために一時的に立ち上がる Worker が出すもので、問題ありません（本体の Worker にはこの部品が含まれています）。
- `.env.local` の Supabase のキーは、ビルドのときに読み込まれます。

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

## 楽天・Yahoo! の価格を試しに取る

`.env.local` に楽天（`RAKUTEN_APPLICATION_ID`・`RAKUTEN_ACCESS_KEY`）と Yahoo!（`YAHOO_CLIENT_ID`）のキーを入れて、JANコードを1つ指定します。DB には保存しません。

```bash
npm run try:fetch -- 4902000000000
```

ショップごとに、価格・送料・ポイント・実質価格が表示されます。★がいちばん安いショップです。載せなかった商品は、「（除外）」と理由が出ます。

- **楽天**：楽天のAPIは JAN で探せないため、JAN をキーワードにして探します。そのうえで、商品名・キャッチコピー・説明文に JAN が書いてある商品だけを採用します。
- **Yahoo!**：JAN で探し、応答の JAN が一致する商品だけを採用します。1秒に1回までの制限があります。
- どちらも、送料の金額がわからないショップ（楽天の「送料別」、Yahoo!の「設定なし」「条件付き送料無料」）は、実質価格を出しません。

---

## 定期バッチを試す

1日3回動かすバッチ（取得 → 保留の判定 → 保存 → 価格履歴 → ページの作り直し）を、仮データで最後まで動かせます。何も保存しません。

```bash
npm run batch -- --fake
```

**開発用の DB に保存して試す**ときは、`--fake-malls` を付けます。楽天・Yahoo!の代わりに仮の価格を使い、DB の `offers_latest`・`price_history`・`batch_runs` に書き込みます。モールのキーがなくても使えます。GitHub Actions（本番）では使えないようにしてあります。

```bash
npm run batch -- --fake-malls
```

保留の動きを確かめるときは、特定の商品・モールの価格を変えて動かします（例：楽天の価格を40%にする）。`--fake` でも `--fake-malls` でも使えます。

```bash
npm run batch -- --fake --change 2000000000015:rakuten:0.4
```

結果に「保留（公開していない）」として、そのショップが出れば正しく動いています。

- 保留は「最後に公開した価格」と比べます。保留した価格を基準にしないので、異常な価格が次の回に公開されてしまうことはありません。
- 取得に失敗したモールは、前回の価格を残します。失敗が2割以上なら「失敗」で終わり、GitHub Actions がオーナーに知らせます（C6）。
- 本番の流れ（`npm run batch`）は、楽天・Yahoo!のキーと Supabase のキーがそろうと使えます。ページの作り直しは、`NEXT_PUBLIC_SITE_URL` と `REVALIDATE_SECRET` があるときだけ行います。

### 定期実行とお知らせ（GitHub Actions）

| ワークフロー | いつ | すること |
| --- | --- | --- |
| 価格の自動更新（`.github/workflows/batch.yml`） | 毎日 7:10・12:10・20:10（日本時間。混雑で遅れることあり） | バッチを実行。失敗したら Issue を立てて知らせ、次に成功したら閉じる |
| 価格の鮮度の見張り（`.github/workflows/freshness.yml`） | 3時間ごと | サイトの `/api/health` を確かめる。最終更新が12時間以上前か、サイトに届かなければ Issue で知らせ、戻ったら閉じる |

Issue が立つと、GitHub からオーナーにメールが届きます。どちらも、リポジトリの Settings → Secrets and variables → Actions で設定するまでは、定時実行では動きません（Actions の画面から手動で実行することはできます）。

- **Variables**：`BATCH_ENABLED` = `true`、`FRESHNESS_CHECK_ENABLED` = `true`、`NEXT_PUBLIC_SITE_URL` = 本番のURL
- **Secrets**：`RAKUTEN_APPLICATION_ID`、`RAKUTEN_ACCESS_KEY`、`RAKUTEN_AFFILIATE_ID`、`YAHOO_CLIENT_ID`、`VALUECOMMERCE_ID`、`REVALIDATE_SECRET`、`NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_SECRET_KEY`

このリポジトリは公開されているので、Issue と Actions の実行記録は誰でも読めます。秘密の値は GitHub が実行記録の中で伏せてくれますが、Issue にはログを貼らないようにしています。

手元で鮮度を確かめるときは、http://localhost:3000/api/health を開きます。12時間以上前なら HTTP 503 になります。

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
