import {
    getSafeYesNoUnknownNAValue,
    YesNoUnknownNAOption,
} from "../../../domain/entities/amc-questionnaires/YesNoUnknownNAOption";
import { Future, FutureData } from "../../../domain/entities/Future";
import { YesNoUnknownNAOptionsRepository } from "../../../domain/repositories/amc-questionnaires/YesNoUnknownNAOptionsRepository";
import { D2Api, MetadataPick } from "../../../types/d2-api";
import { apiToFuture } from "../../../utils/futures";
import { assertOrError } from "../utils/AssertOrError";

const optionSetCode = "AiMkLaJG9Oo";

export class YesNoUnknownNAOptionsD2Repository implements YesNoUnknownNAOptionsRepository {
    constructor(private api: D2Api) {}

    get(): FutureData<YesNoUnknownNAOption[]> {
        return apiToFuture(
            this.api.metadata.get({
                optionSets: { fields: optionSetsFields, filter: { id: { eq: optionSetCode } } },
            })
        )
            .flatMap(response => assertOrError(response.optionSets[0], "Yes-No-Unknown-NA OptionSet"))
            .flatMap(optionSet => {
                return this.mapD2OptionSetToOptions(optionSet);
            });
    }

    private mapD2OptionSetToOptions(optionSet: D2OptionSet): FutureData<YesNoUnknownNAOption[]> {
        const options = optionSet.options.reduce((acc: YesNoUnknownNAOption[], option): YesNoUnknownNAOption[] => {
            const safeValue = getSafeYesNoUnknownNAValue(option.code);
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
