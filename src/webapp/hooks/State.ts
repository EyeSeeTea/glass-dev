export interface LoadingState {
    kind: "loading";
}

export interface LoadedState<T> {
    kind: "loaded";
    data: T;
}

export interface ErrorState {
    kind: "error";
    message: string;
}

export type GlassState<T> = LoadingState | LoadedState<T> | ErrorState;
