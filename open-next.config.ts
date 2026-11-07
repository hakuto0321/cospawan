import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import doShardedTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";

// バッチのあとに revalidatePath で全ページを作り直すため、
// 作ったページは R2 に、作り直しの記録は Durable Object に置く。
// 時間で作り直す ISR は使わないので、キュー（queue）はいらない
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: doShardedTagCache({ baseShardSize: 12 }),
});
