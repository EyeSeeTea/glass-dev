import { Future, FutureData } from "../../../domain/entities/Future";

export function assertOrError<T>(obj: T, name: string): FutureData<NonNullable<T>> {
    if (!obj) return Future.error(`${name} not found`);
    else return Future.success(obj as NonNullable<T>);
}
