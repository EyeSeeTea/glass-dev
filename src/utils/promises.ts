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
