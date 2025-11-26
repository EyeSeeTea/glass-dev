export type FileValidatedResult<T extends ValidationResultTypes = ValidationResultWithSpecimens> = {
    status: "validated";
} & T;

export type ValidationResult = {
    isValid: boolean;
    rows: number;
};

export type ValidationResultWithSpecimens = ValidationResult & {
    specimens: string[];
};

type ValidationResultTypes = ValidationResult | ValidationResultWithSpecimens;

export type NeedsPreprocessingResult = {
    status: "needsPreprocessing";
};

export type FileValidationResult<T extends ValidationResultTypes = ValidationResultWithSpecimens> =
    | FileValidatedResult<T>
    | NeedsPreprocessingResult;
