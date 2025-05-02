import { GetValue } from "../../../utils/ts-utils";

export type OptionValue<T> = GetValue<T>;

export type OptionType<T extends string> = { code: T; name: string };

type OptionConfig<T> = {
    toBoolean?: (value: T) => boolean;
    fromBoolean?: (value: boolean) => T;
};

export class Option<T extends string> {
    protected values: Record<string, T>;
    protected options?: OptionConfig<T>;

    constructor(values: Record<string, T>, options?: OptionConfig<T>) {
        this.values = values;
        this.options = options;
    }

    getSafeValue(value: unknown): T | undefined {
        return Object.values(this.values).includes(value as T) ? (value as T) : undefined;
    }

    getBooleanFromValue(value: T): boolean {
        if (this.options?.toBoolean) {
            return this.options.toBoolean(value);
        }
        throw new Error("toBoolean is not implemented");
    }

    getValueFromBoolean(value: boolean): T {
        if (this.options?.fromBoolean) {
            return this.options.fromBoolean(value);
        }
        throw new Error("fromBoolean is not implemented");
    }
}
