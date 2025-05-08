import {
    YesNoUnknownOption,
    getSafeYesNoUnknownValue,
} from "../../../domain/entities/amc-questionnaires/YesNoUnknownOption";
import { Future, FutureData } from "../../../domain/entities/Future";
import { YesNoUnknownOptionsRepository } from "../../../domain/repositories/amc-questionnaires/YesNoUnknownOptionsRepository";
import { D2Api, MetadataPick } from "../../../types/d2-api";
import { apiToFuture } from "../../../utils/futures";
import { assertOrError } from "../utils/AssertOrError";

const optionSetCode = "AnhivZSAKsu";

export class YesNoUnknownOptionsD2Repository implements YesNoUnknownOptionsRepository {
    constructor(private api: D2Api) {}

    get(): FutureData<YesNoUnknownOption[]> {
        return apiToFuture(
            this.api.metadata.get({
                optionSets: { fields: optionSetsFields, filter: { id: { eq: optionSetCode } } },
            })
        )
            .flatMap(response => assertOrError(response.optionSets[0], "Yes-No-Unknown OptionSet"))
            .flatMap(optionSet => {
                return this.mapD2OptionSetToOptions(optionSet);
            });
    }

    private mapD2OptionSetToOptions(optionSet: D2OptionSet): FutureData<YesNoUnknownOption[]> {
        const options = optionSet.options.reduce((acc: YesNoUnknownOption[], option): YesNoUnknownOption[] => {
            const safeValue = getSafeYesNoUnknownValue(option.code);
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
