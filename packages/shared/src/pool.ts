/** Map with at most `limit` tasks in flight; results keep input order. */
export const mapPool = async <T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> => {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
};

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Retry `fn` with exponential backoff while `shouldRetry(err)` (default: 429 and 5xx). */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  { attempts = 4, baseMs = 800, shouldRetry = (e: unknown) => e instanceof HttpError && (e.status === 429 || e.status >= 500) } = {},
): Promise<T> => {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i === attempts - 1 || !shouldRetry(e)) break;
      await sleep(baseMs * 2 ** i + Math.random() * 200);
    }
  }
  throw lastErr;
};
