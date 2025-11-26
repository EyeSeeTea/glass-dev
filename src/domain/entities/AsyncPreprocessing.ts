import { Id } from "./Ref";

export type AsyncPreprocessingStatus = "PENDING" | "PREPROCESSING";

export type AsyncPreprocessing = {
    uploadId: Id;
    attempts: number;
    status: AsyncPreprocessingStatus;
    createdAt: string;
    lastUpdatedAt?: string;
    errorMessage?: string;
};

export const DEFAULT_MAX_ATTEMPS_FOR_ASYNC_PREPROCESSING = 3;

export const INITIAL_ASYNC_PREPROCESSING_STATE: AsyncPreprocessing = {
    uploadId: "",
    attempts: 0,
    status: "PENDING",
    createdAt: new Date().toISOString(),
};
