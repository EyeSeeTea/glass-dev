import _ from "lodash";
import { Maybe } from "../../../types/utils";
import { Struct } from "../generic/Struct";
import { ValidationError, ValidationErrorKey } from "./ValidationError";
import { Either } from "../generic/Either";
import { AntimicrobialClassValue } from "./AntimicrobialClassOption";
import { HealthSectorValue, HealthSectorValues } from "./HealthSectorOption";
import { HealthLevelValue, HealthLevelValues } from "./HealthLevelOption";
import { Proportion50to100Value } from "./Proportion50to100Option";

export type AMClassAMCQuestionnaireResponsesAttributes = {
    antimicrobialClass: AntimicrobialClassValue;
    healthSector: HealthSectorValue;
    healthLevel: HealthLevelValue;
    estVolumeTotalHealthLevel: Maybe<Proportion50to100Value>;
    estVolumeHospitalHealthLevel: Maybe<Proportion50to100Value>;
    estVolumeCommunityHealthLevel: Maybe<Proportion50to100Value>;
};

export type AMClassAMCQuestionId = keyof AMClassAMCQuestionnaireResponsesAttributes;

export type AMClassAMCQuestionnaireAttributes = AMClassAMCQuestionnaireResponsesAttributes;

export class AMClassAMCQuestionnaire extends Struct<AMClassAMCQuestionnaireAttributes>() {
    static validateAndCreate(
        attributes: AMClassAMCQuestionnaireAttributes
    ): Either<ValidationError[], AMClassAMCQuestionnaire> {
        const errors = this.validate(attributes);
        if (errors.length > 0) {
            return Either.error(errors);
        }
        return Either.success(new AMClassAMCQuestionnaire(attributes));
    }

    static validate(attributes: AMClassAMCQuestionnaireAttributes): ValidationError[] {
        const isPublicOrPrivate =
            attributes.healthSector === HealthSectorValues.Public ||
            attributes.healthSector === HealthSectorValues.Private;
        return _.compact([
            isPublicOrPrivate &&
            attributes.healthLevel === HealthLevelValues.Total &&
            !attributes.estVolumeTotalHealthLevel?.trim()
                ? {
                      property: "estVolumeTotalHealthLevel",
                      value: attributes.estVolumeTotalHealthLevel,
                      errors: [ValidationErrorKey.FIELD_IS_REQUIRED],
                  }
                : null,

            isPublicOrPrivate &&
            (attributes.healthLevel === HealthLevelValues.Hospital ||
                attributes.healthLevel === HealthLevelValues.HospitalAndCommunity) &&
            !attributes.estVolumeHospitalHealthLevel?.trim()
                ? {
                      property: "estVolumeHospitalHealthLevel",
                      value: attributes.estVolumeHospitalHealthLevel,
                      errors: [ValidationErrorKey.FIELD_IS_REQUIRED],
                  }
                : null,

            isPublicOrPrivate &&
            (attributes.healthLevel === HealthLevelValues.Community ||
                attributes.healthLevel === HealthLevelValues.HospitalAndCommunity) &&
            !attributes.estVolumeCommunityHealthLevel?.trim()
                ? {
                      property: "estVolumeCommunityHealthLevel",
                      value: attributes.estVolumeCommunityHealthLevel,
                      errors: [ValidationErrorKey.FIELD_IS_REQUIRED],
                  }
                : null,
        ]);
    }
}
