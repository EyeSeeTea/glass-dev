/* Map sequentially over T[] with an asynchronous function and return array of mapped values */
export async function promiseMap<T, S>(
    inputValues: T[],
    mapper: (value: T, index: number) => Promise<S>
): Promise<S[]> {
    const output: S[] = [];
    let index = 0;

    for (const value of inputValues) {
        const res = await mapper(value, index++);
        output.push(res);
    }

    return output;
}

/**
 * Map over T[] with an asynchronous function, running up to `concurrency` mappers at once.
 * Results preserve input order regardless of completion order. `concurrency <= 1` (or a
 * single-item input) delegates to promiseMap, so callers can toggle back to fully sequential
 * behaviour with one config value. The first rejection is thrown after in-flight workers settle;
 * no further items are started once a failure is observed.
 */
export async function promiseMapConcurrent<T, S>(
    inputValues: T[],
    mapper: (value: T, index: number) => Promise<S>,
    concurrency: number
): Promise<S[]> {
    if (concurrency <= 1 || inputValues.length <= 1) {
        return promiseMap(inputValues, mapper);
    }

    const output: S[] = new Array(inputValues.length);
    let nextIndex = 0;
    let hasError = false;
    let firstError: unknown;

    async function worker(): Promise<void> {
        while (!hasError) {
            const index = nextIndex++;
            if (index >= inputValues.length) return;

            try {
                output[index] = await mapper(inputValues[index] as T, index);
            } catch (error) {
                if (!hasError) {
                    hasError = true;
                    firstError = error;
                }
                return;
            }
        }
    }

    const workerCount = Math.min(concurrency, inputValues.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    if (hasError) throw firstError;
    return output;
}

export interface RetryAsyncOptions {
    attempts?: number;
    baseDelayMs?: number;
    /**
     * Return false to stop retrying and rethrow immediately. Defaults to `isRetryableError`, which
     * skips deterministic HTTP failures. Pass `() => true` for the old retry-everything behaviour.
     */
    shouldRetry?: (error: unknown) => boolean;
}

/** HTTP status codes that a retry cannot change: the request itself is the problem, not the moment. */
const NON_RETRYABLE_STATUS_CODES = new Set([400, 401, 403, 404, 405, 409, 410, 422]);

function extractStatusCode(error: unknown): number | undefined {
    if (typeof error !== "object" || error === null) return undefined;
    // Axios-shaped (`error.response.status`, used by d2-api) or a plain `status`/`statusCode`.
    const candidate = error as { response?: { status?: unknown }; status?: unknown; statusCode?: unknown };
    const raw = candidate.response?.status ?? candidate.status ?? candidate.statusCode;
    return typeof raw === "number" ? raw : undefined;
}

/**
 * True unless the error is a deterministic client-side HTTP failure. A 404 or a malformed 400 will
 * fail identically on every attempt, so retrying only burns the backoff delays before reporting the
 * same outcome. 429 and 5xx are deliberately treated as retryable. Errors with no recognisable
 * status (network resets, timeouts, socket hang-ups) are retryable — those are the transient cases
 * this whole mechanism exists for.
 */
export function isRetryableError(error: unknown): boolean {
    const status = extractStatusCode(error);
    return status === undefined || !NON_RETRYABLE_STATUS_CODES.has(status);
}

/**
 * Retries `operation` with exponential backoff (baseDelayMs, 2x, 4x, ...) plus full jitter. No auth
 * or session-refresh logic — purely a transient-failure retry (e.g. a single flaky/proxy-blocked
 * page request). Throws the last error once all attempts are exhausted, or immediately if
 * `shouldRetry` rejects it.
 *
 * The jitter is not cosmetic: callers run this under `promiseMapConcurrent`, so N workers typically
 * trip the same rate limit within milliseconds of each other. With a fixed backoff they would all
 * sleep for the same interval and retry in lockstep, reproducing the burst that caused the throttle
 * (and pushing a proxy from throttling towards blocking). Randomising each delay across the whole
 * [0, backoff] window spreads the retries out instead.
 */
export async function retryAsync<T>(
    operation: () => Promise<T>,
    { attempts = 3, baseDelayMs = 2000, shouldRetry = isRetryableError }: RetryAsyncOptions = {}
): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt === attempts || !shouldRetry(error)) break;
            const backoff = baseDelayMs * Math.pow(2, attempt - 1);
            const delay = Math.random() * backoff;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}
