import { getSafeYesNoValue, YesNoOption } from "../../../domain/entities/amc-questionnaires/YesNoOption";
import { Future, FutureData } from "../../../domain/entities/Future";
import { YesNoOptionsRepository } from "../../../domain/repositories/amc-questionnaires/YesNoOptionsRepository";
import { D2Api, MetadataPick } from "../../../types/d2-api";
import { apiToFuture } from "../../../utils/futures";
import { assertOrError } from "../utils/AssertOrError";

const optionSetCode = "IDtB1Hk2LAO";

export class YesNoOptionsD2Repository implements YesNoOptionsRepository {
    constructor(private api: D2Api) {}

    get(): FutureData<YesNoOption[]> {
        return apiToFuture(
            this.api.metadata.get({
                optionSets: { fields: optionSetsFields, filter: { id: { eq: optionSetCode } } },
            })
        )
            .flatMap(response => assertOrError(response.optionSets[0], "Yes No OptionSet"))
            .flatMap(optionSet => {
                return this.mapD2OptionSetToOptions(optionSet);
            });
    }

    private mapD2OptionSetToOptions(optionSet: D2OptionSet): FutureData<YesNoOption[]> {
        const options = optionSet.options.reduce((acc: YesNoOption[], option): YesNoOption[] => {
            const safeValue = getSafeYesNoValue(option.code);
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
