import _ from "lodash";
import { Maybe } from "../../../types/utils";
import { Id } from "../Base";
import { Struct } from "../generic/Struct";
import { ValidationError, ValidationErrorKey } from "./ValidationError";
import { YesNoValue } from "./YesNoOption";
import { YesNoUnknownNAValue } from "./YesNoUnknownNAOption";
import { YesNoUnknownValue } from "./YesNoUnknownOption";
import { Either } from "../generic/Either";

export interface GeneralAMCQuestionnaireAttributes {
    id: Id;
    orgUnitId: Id;
    period: string;
    status: "ACTIVE" | "COMPLETED" | "CANCELLED";
    created?: Date;
    lastUpdated?: Date;
    isSameAsLastYear: YesNoUnknownNAValue;
    shortageInPublicSector: YesNoUnknownValue;
    detailOnShortageInPublicSector: Maybe<string>;
    shortageInPrivateSector: YesNoUnknownValue;
    detailOnShortageInPrivateSector: Maybe<string>;
    generalComments: Maybe<string>;
    antibacterials: YesNoValue;
    antifungals: YesNoValue;
    antivirals: YesNoValue;
    antituberculosis: YesNoValue;
    antimalaria: YesNoValue;
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
