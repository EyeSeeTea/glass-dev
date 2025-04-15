import _ from "lodash";
import { Maybe } from "../../../types/utils";
import { Id } from "../Base";
import { Struct } from "../generic/Struct";
import { ValidationError, ValidationErrorKey } from "./ValidationError";
import { YesNoOptions } from "./YesNoOptions";
import { YesNoUnknownNAOptions } from "./YesNoUnknownNAOptions";
import { YesNoUnknownOptions } from "./YesNoUnknownOptions";
import { Either } from "../generic/Either";

export interface GeneralAMCQuestionnaireAttributes {
    id: Id;
    orgUnitId: Id;
    period: string;
    status: "ACTIVE" | "COMPLETED" | "CANCELLED";
    created?: Date;
    lastUpdated?: Date;
    isSameAsLastYear: YesNoUnknownNAOptions;
    shortageInPublicSector: YesNoUnknownOptions;
    detailOnShortageInPublicSector: Maybe<string>;
    shortageInPrivateSector: YesNoUnknownOptions;
    detailOnShortageInPrivateSector: Maybe<string>;
    generalComments: Maybe<string>;
    antibacterials: YesNoOptions;
    antifungals: YesNoOptions;
    antivirals: YesNoOptions;
    antituberculosis: YesNoOptions;
    antimalaria: YesNoOptions;
}

export class GeneralAMCQuestionnaire extends Struct<GeneralAMCQuestionnaireAttributes>() {
    static validateAndCreate(
        data: GeneralAMCQuestionnaireAttributes
    ): Either<ValidationError[], GeneralAMCQuestionnaire> {
        const errors = this.validate(data);
        if (errors.length > 0) {
            return Either.error(errors);
        }
        return Either.success(new GeneralAMCQuestionnaire(data));
    }

    static validate(data: GeneralAMCQuestionnaireAttributes): ValidationError[] {
        return _.compact([
            data.shortageInPublicSector === "YES" && !data.detailOnShortageInPublicSector?.trim()
                ? {
                      property: "detailOnShortageInPublicSector",
                      value: data.detailOnShortageInPublicSector,
                      errors: [ValidationErrorKey.FIELD_IS_REQUIRED],
                  }
                : null,

            data.shortageInPrivateSector === "YES" && !data.detailOnShortageInPrivateSector?.trim()
                ? {
                      property: "detailOnShortageInPrivateSector",
                      value: data.detailOnShortageInPrivateSector,
                      errors: [ValidationErrorKey.FIELD_IS_REQUIRED],
                  }
                : null,
        ]);
    }
}
