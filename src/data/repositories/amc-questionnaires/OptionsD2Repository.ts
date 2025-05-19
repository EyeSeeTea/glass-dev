import { Option, OptionType } from "../../../domain/entities/amc-questionnaires/Option";
import { Future, FutureData } from "../../../domain/entities/Future";
import { D2Api, MetadataPick } from "../../../types/d2-api";
import { apiToFuture } from "../../../utils/futures";
import { assertOrError } from "../utils/AssertOrError";

export abstract class OptionsD2Repository<T extends string> {
    constructor(private api: D2Api) {}

    protected abstract optionSetCode: string;
    protected abstract optionSetName: string;
    protected abstract options: Option<T>;

    get(): FutureData<OptionType<T>[]> {
        return apiToFuture(
            this.api.metadata.get({
                optionSets: { fields: optionSetsFields, filter: { id: { eq: this.optionSetCode } } },
            })
        )
            .flatMap(response => assertOrError(response.optionSets[0], this.optionSetName))
            .flatMap(optionSet => {
                return this.mapD2OptionSetToOptions(optionSet);
            });
    }

    private mapD2OptionSetToOptions(optionSet: D2OptionSet): FutureData<OptionType<T>[]> {
        const options = optionSet.options.reduce((acc: OptionType<T>[], option): OptionType<T>[] => {
            const safeValue = this.options.getSafeValue(option.code);
            return safeValue
                ? [
                      ...acc,
                      {
                          code: safeValue,
                          name: option.name,
                      },
                  ]
                : acc;
        }, []);
        return Future.success(options);
    }
}

export const optionSetsFields = {
    options: { id: true, name: true, code: true },
} as const;

export type D2OptionSet = MetadataPick<{
    optionSets: { fields: typeof optionSetsFields };
}>["optionSets"][number];
