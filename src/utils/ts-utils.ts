export type Maybe<T> = T | undefined;

export type Expand<T> = {} & { [P in keyof T]: T[P] };

export type GetValue<T> = T[keyof T];

export type UnionFromValues<T extends ReadonlyArray<unknown>> = T[number];

/* recordOf: Build a record with free typed keys and fixed value type:

    // const values: Record<"key1" | "key2", {value: string}>
    const values = recordOf<{value: string}>()({
        key1: {value: "1"},
        key2: {value: "2"},
    })
*/
export function recordOf<T>() {
    return function <Obj>(obj: Record<keyof Obj, T>) {
        return obj;
    };
}

export function assert<T>(value: T | undefined): T {
    if (value === undefined) throw new Error("Assert error");
    return value;
}

export function notNil<T>(x: T | undefined | null): x is T {
    return x !== undefined && x !== null;
}

export type OptionalKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T];

type ObjWithOptionalKeys<Obj, T> = {
    [K in keyof Obj]: Obj[K] & Pick<T, OptionalKeys<T>>;
};

export function withOptionalProperties<T>() {
    return function <Obj>(obj: Obj): ObjWithOptionalKeys<Obj, T> {
        return obj as ObjWithOptionalKeys<Obj, T>;
    };
}

export function groupedPairsBy<Obj, Key>(objs: Obj[], mapper: (obj: Obj) => Key): Array<[Key, Obj[]]> {
    const result = new Map<Key, Obj[]>();

    objs.forEach(obj => {
        const key = mapper(obj);
        const objs = result.get(key);

        if (objs) {
            objs.push(obj);
        } else {
            result.set(key, [obj]);
        }
    });

    return Array.from(result);
}

export function isElementOfUnion<Union extends string>(value: string, values: readonly Union[]): value is Union {
    return (values as readonly string[]).includes(value);
}

export function getKeys<K extends string>(obj: Record<K, unknown>): K[] {
    return Object.keys(obj) as K[];
}

export type GetRecordId<T extends Record<any, { id: unknown }>> = GetValue<T>["id"];

export function fromPairs<Key extends string, Value>(pairs: Array<[Key, Value]>): Record<Key, Value> {
    const empty = {} as Record<Key, Value>;
    return pairs.reduce((acc, [key, value]) => ({ ...acc, [key]: value }), empty);
}

export type FromPromise<T> = T extends Promise<infer U> ? U : T;

export type ReplaceReturnType<T extends (...a: any) => any, TNewReturn> = (...a: Parameters<T>) => TNewReturn;

export function assertUnreachable(value: never, message = `No such case in exhaustive switch: ${value}`) {
    throw new Error(message);
}

export type RecursivePartial<T> = {
    [P in keyof T]?: T[P] extends (infer U)[]
        ? RecursivePartial<U>[]
        : T[P] extends object
        ? RecursivePartial<T[P]>
        : T[P];
};

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Returns a new array with the item replaced by the replacement item if they have the same id.
 */
export function replaceById<T extends { id: unknown }>(array: T[], replacement: T): T[] {
    return array.map(item => (item.id === replacement.id ? replacement : item));
}
