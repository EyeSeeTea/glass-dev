import _ from "lodash";
import { Maybe } from "../../../types/utils";
import { Id } from "../Base";
import { Struct } from "../generic/Struct";
import { ValidationError, ValidationErrorKey } from "./ValidationError";
import { YesNoValue } from "./YesNoOption";
import { YesNoUnknownNAValue } from "./YesNoUnknownNAOption";
import { YesNoUnknownValue } from "./YesNoUnknownOption";
import { Either } from "../generic/Either";

export type GeneralAMCQuestionnaireBaseAttributes = {
    id: Id;
    orgUnitId: Id;
    period: string;
    status: "ACTIVE" | "COMPLETED" | "CANCELLED";
    created?: Date;
    lastUpdated?: Date;
};

export type GeneralAMCQuestionnaireAMClassAttributes = {
    antibiotics: YesNoValue;
    antifungals: YesNoValue;
    antivirals: YesNoValue;
    antituberculosis: YesNoValue;
    antimalaria: YesNoValue;
};

export type GeneralAMCQuestionnaireResponsesAttributes = {
    isSameAsLastYear: YesNoUnknownNAValue;
    detailOnSameAsLast: Maybe<string>;
    shortageInPublicSector: YesNoUnknownValue;
    detailOnShortageInPublicSector: Maybe<string>;
    shortageInPrivateSector: YesNoUnknownValue;
    detailOnShortageInPrivateSector: Maybe<string>;
    generalComments: Maybe<string>;
} & GeneralAMCQuestionnaireAMClassAttributes;

export type GeneralAMCQuestionId = keyof GeneralAMCQuestionnaireResponsesAttributes;

export type GeneralAMCQuestionnaireAttributes = GeneralAMCQuestionnaireBaseAttributes &
    GeneralAMCQuestionnaireResponsesAttributes;

export class GeneralAMCQuestionnaire extends Struct<GeneralAMCQuestionnaireAttributes>() {
    static validateAndCreate(
        attributes: GeneralAMCQuestionnaireAttributes
    ): Either<ValidationError[], GeneralAMCQuestionnaire> {
        const errors = this.validate(attributes);
        if (errors.length > 0) {
            return Either.error(errors);
        }
        return Either.success(new GeneralAMCQuestionnaire(attributes));
    }

    static validate(attributes: GeneralAMCQuestionnaireAttributes): ValidationError[] {
        return _.compact([
            attributes.isSameAsLastYear === "NO" && !attributes.detailOnSameAsLast?.trim()
                ? {
                      property: "detailOnSameAsLast",
                      value: attributes.detailOnSameAsLast,
                      errors: [ValidationErrorKey.FIELD_IS_REQUIRED],
                  }
                : null,

            attributes.shortageInPublicSector === "YES" && !attributes.detailOnShortageInPublicSector?.trim()
                ? {
                      property: "detailOnShortageInPublicSector",
                      value: attributes.detailOnShortageInPublicSector,
                      errors: [ValidationErrorKey.FIELD_IS_REQUIRED],
                  }
                : null,

            attributes.shortageInPrivateSector === "YES" && !attributes.detailOnShortageInPrivateSector?.trim()
                ? {
                      property: "detailOnShortageInPrivateSector",
                      value: attributes.detailOnShortageInPrivateSector,
                      errors: [ValidationErrorKey.FIELD_IS_REQUIRED],
                  }
                : null,
        ]);
    }
}
