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
}

/**
 * Retries `operation` with exponential backoff (baseDelayMs, 2x, 4x, ...) on failure. No auth or
 * session-refresh logic — purely a transient-failure retry (e.g. a single flaky/proxy-blocked page
 * request). Throws the last error once all attempts are exhausted.
 */
export async function retryAsync<T>(
    operation: () => Promise<T>,
    { attempts = 3, baseDelayMs = 2000 }: RetryAsyncOptions = {}
): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt === attempts) break;
            const delay = baseDelayMs * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}
