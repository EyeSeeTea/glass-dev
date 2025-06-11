import { GetValue } from "../../../utils/ts-utils";

export type OptionValue<T> = GetValue<T>;

export type OptionType<T extends string> = { code: T; name: string };

export class Option<T extends string> {
    protected values: Record<string, T>;

    constructor(values: Record<string, T>) {
        this.values = values;
    }

    getSafeValue(value: unknown): T | undefined {
        return Object.values(this.values).includes(value as T) ? (value as T) : undefined;
    }

    getNameByCode(options: OptionType<T>[], code: T): string {
        const option = options.find(option => option.code === code);
        return option?.name ?? code;
    }
}

type BooleanOptionConfig<T> = {
    toBoolean: (value: T) => boolean;
    fromBoolean: (value: boolean) => T;
};

export class BooleanOption<T extends string> extends Option<T> {
    private options: BooleanOptionConfig<T>;

    constructor(values: Record<string, T>, options: BooleanOptionConfig<T>) {
        super(values);
        this.options = options;
    }

    getBooleanFromValue(value: T): boolean {
        return this.options.toBoolean(value);
    }

    getValueFromBoolean(value: boolean): T {
        return this.options.fromBoolean(value);
    }
}
