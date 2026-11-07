#!/usr/bin/env bash
# オーナーへのお知らせを GitHub の Issue で行う（Issue が立つとメールが届く）
#   alert.sh open  "<種類>" "<本文>"   … 開いているお知らせがあれば追記、なければ新しく立てる
#   alert.sh close "<種類>" "<本文>"   … 開いているお知らせを、本文を添えて閉じる
# 必要な環境変数: GH_TOKEN, GITHUB_REPOSITORY
set -euo pipefail

action="$1"
kind="$2"   # 例: batch-failed / prices-stale
body="$3"
label="alert:${kind}"

gh label create "$label" --color B5541F --description "ポチどきの自動お知らせ" --force >/dev/null

number="$(gh issue list --label "$label" --state open --limit 1 --json number --jq '.[0].number // empty')"

case "$action" in
  open)
    if [ -n "$number" ]; then
      gh issue comment "$number" --body "$body"
    else
      case "$kind" in
        batch-failed) title="【ポチどき】価格の自動更新が失敗しました" ;;
        prices-stale) title="【ポチどき】価格が12時間以上更新されていません" ;;
        *) title="【ポチどき】お知らせ: ${kind}" ;;
      esac
      gh issue create --title "$title" --label "$label" --body "$body"
    fi
    ;;
  close)
    if [ -n "$number" ]; then
      gh issue close "$number" --comment "$body"
    fi
    ;;
  *)
    echo "使い方: alert.sh open|close <種類> <本文>" >&2
    exit 1
    ;;
esac
