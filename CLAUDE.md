# ポチどき（pochidoki）

いつものペット用品、今買うべきかがわかるサービス（説明文は仮。確定したら差し替える）。
サービス名は「ポチどき」で確定。旧仮称の「PetStock」は使わない（海外に同名の大手ペット用品チェーンがあるため）。
楽天市場とYahoo!ショッピングの価格を1日3回自動で集め、送料とポイントを含めた「実質価格」で買い時と残りの量を知らせる。
収益はアフィリエイト（楽天・Yahoo!・Amazon）。個人の副業として運営する。

計画書（最新）: https://claude.ai/artifact/H8YzM5yTrJ5WzBrNHKMtmg
画面のプロトタイプ: https://claude.ai/artifact/RDUvWxihLJytfXmQ9xptg9

## 今のゴール：土日版を 11月8日（日）に公開する

含めるもの
- トップ「今日の買い時」（犬・猫の切り替え、入力なしで見られる）
- 商品ページ 約50件（実質価格、ショップ比較、送客リンク、Q&A）
- 送客リンク：楽天・Yahoo!・Amazon（Amazonはリンクのみ、価格は表示しない）
- 送客クリックの記録（自サイト経由でリダイレクト）
- 通知の事前登録フォーム（メールアドレスと商品を保存するだけ）
- 1日3回（7時・12時・20時台 JST）の価格の自動更新
- 全ページ共通の広告表記「広告を含みます」、プライバシーポリシー、利用規約、問い合わせ先

含めないもの（1週目版以降）
- ログイン、通知メールの送信、「今買う？待つ？」の判定、価格推移グラフ
- 「30日平均との差」は、価格履歴が7日分たまるまで表示しない

間に合わないときは、商品数と画面の飾りを削る。価格の正確さ、広告表記、送客の記録は削らない。

## 技術構成（変更しない）

- Next.js（App Router）+ TypeScript
- Supabase（Postgres）。開発用と本番用でプロジェクトを分ける
- Cloudflare（サイトの配信）
- GitHub Actions（定期バッチ）
- Resend（メール。1週目版から）

## データの考え方

- 商品はJANコードで識別する。楽天とYahoo!の両方でJANが一致する商品だけを掲載する
- データ構造は「ペット専用」にしない。カテゴリの一つとしてペットを持つ（将来ほかの消耗品に広げるため）
- 実質価格 = 価格 + 送料 − もらえるポイント（1ポイント1円）。土日版は「基本のポイントで計算」と明記する
- 送料の金額がわからないショップ（楽天の「送料別」など）は「送料別」と表示し、実質価格は出さず、最安の比較にも入れない
- 楽天の商品検索APIはJANで検索できず応答にもJANがないため、JANをキーワードに検索し、商品名・キャッチコピー・説明文にJANが書いてある商品だけを採用する（JANを確かめられないショップは載せない）
- Yahoo!のポイントは、APIが返すストアポイントだけを数える（控えめに計算する）
- 価格履歴には、取得1回ごとに「モールごとの実質最安と上位数件」だけを残す。全ショップの最新価格は別テーブルで上書きする
- Amazonの価格は保存しない（規約上の制限）。Amazonはリンクのみ

主なテーブル（案）
- categories / products（jan, name, pet_type: dog|cat|both, category_id, size, unit, default_per_day, is_high_ticket, status）
- offers_latest（product_id, mall, shop_name, price, shipping, point_rate, effective_price, url, fetched_at）
- price_history（product_id, mall, effective_price_min, top_offers jsonb, fetched_at）
- events（mall, name, starts_at, ends_at, bonus_rate）※当面は手入力
- waitlist（email, product_id, created_at）
- usage_events（type, product_id, mall, query, created_at）※個人情報は入れない

## 定期バッチ（GitHub Actions）の流れ

1. 楽天とYahoo!のAPIから全商品の価格・送料・ポイントを取る
2. 前回から50%以上変わった価格など、おかしな値は公開せず保留にする
3. 実質最安などを計算して保存する
4. 商品ページと「今日の買い時」を作り直す（再ビルドまたは再検証）
5. （1週目版から）条件を満たしたユーザーに通知を送る
6. 失敗したとき、最終更新が12時間以上前のときは、オーナーに通知する

## API の注意

- 楽天：2026年の新仕様。アプリIDに加えてアクセスキーが必要。リクエストに登録済みサイトのURL（Referer）を付ける
- Yahoo!：商品検索 v3。JANコードで検索できる。1秒1回程度の制限を守る。データ表示時は「Web Services by Yahoo! JAPAN」のクレジットを出す
- どのモールも画面のスクレイピングはしない。公式APIだけを使う
- 価格には必ず取得日時を表示する

## 作業のルール

- APIキーなどの秘密情報はコードに書かない。ローカルは .env.local、GitHub Actions は Secrets、Cloudflare は環境変数に入れる。.env 系ファイルはコミットしない
- 小さく作って動かして確かめてから次へ進む。動いたらこまめにコミットする
- 本番のデータベースやサイトに影響する変更は、実行前にオーナーに確認する
- 画面の文言は日本語。デザインは「B やさしく温かい」案に従う（https://claude.ai/artifact/1K87kiCgk2QmarB71FTpVz の B の列）
  - 書体：Zen Maru Gothic（500/700/900）。価格の数字は tabular-nums
  - 色：背景 #FFF6EF、カード #FFFFFF、文字 #3B2F2A、補助の文字 #7A6A62、アクセント #F08A4B、ボタン #B5541F（白文字）、おトク表示 #3F7A57（背景 #E4F2E8）、残り少ない表示 #8E3F14（背景 #FFE7D6）
  - 角丸：カード20〜24px、ボタンとチップは999px
  - 言葉づかい：話しかける口調（「今が買いどき？」「あと19日分」「おトク」）
- ページはサーバー側でHTMLを生成し、JavaScriptなしでも内容が読めるようにする（AEO対策）
- 商品ページの冒頭は「実質最安は〇円（モール・ショップ、日時時点）」の一文で始める。構造化データ（Product / AggregateOffer）を画面表示と一致させて埋め込む
- robots.txt でAIのクローラーを許可し、llms.txt を置く
