export type GlassGeneralInfo = {
    countryLevel: number;
    enrolmentProgram: string;
    regionLevel: number;
    maxAttemptsForAsyncDeletions: number;
    maxAttemptsForAsyncUploads: number;
    maxAttemptsForAsyncPreprocessing: number;
    fileSizeLimit: number;
};

export const DEFAULT_FILE_SIZE_LIMIT_MB = 50;
