// モールの API を呼ぶための共通部品：間隔をあけて呼ぶ・時間切れ・やり直し

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 前回の呼び出しから minIntervalMs 以上あけてから実行する */
export function createRateLimiter(minIntervalMs: number, now = () => Date.now(), wait = sleep) {
  let last = Number.NEGATIVE_INFINITY; // 最初の1回は待たない
  let chain: Promise<unknown> = Promise.resolve();
  return function schedule<T>(task: () => Promise<T>): Promise<T> {
    const run = chain.then(async () => {
      const gap = last + minIntervalMs - now();
      if (gap > 0) await wait(gap);
      last = now();
      return task();
    });
    chain = run.catch(() => undefined);
    return run;
  };
}

export class MallApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly body: string,
  ) {
    super(message);
    this.name = "MallApiError";
  }
}

type GetJsonOptions = {
  headers?: Record<string, string>;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  /** 429 と 5xx のときのやり直し回数 */
  retries?: number;
  wait?: (ms: number) => Promise<void>;
};

/** JSON を取ってくる。429・5xx・通信エラーは少し待ってやり直す */
export async function getJson(url: string, opts: GetJsonOptions = {}): Promise<unknown> {
  const { headers, fetchImpl = fetch, timeoutMs = 15_000, retries = 2, wait = sleep } = opts;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await wait(2_000 * 2 ** (attempt - 1));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { headers, signal: controller.signal });
      const text = await res.text();
      if (res.ok) {
        try {
          return JSON.parse(text);
        } catch {
          throw new MallApiError("JSON として読めない応答", res.status, text.slice(0, 500));
        }
      }
      const err = new MallApiError(`HTTP ${res.status}`, res.status, text.slice(0, 500));
      if (res.status === 429 || res.status >= 500) {
        lastError = err;
        continue;
      }
      throw err;
    } catch (e) {
      if (e instanceof MallApiError) throw e;
      lastError = e; // 通信エラー・時間切れ
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
