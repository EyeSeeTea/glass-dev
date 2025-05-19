import _ from "lodash";
import { Maybe } from "../../../types/utils";
import { Struct } from "../generic/Struct";
import { ValidationError, ValidationErrorKey } from "./ValidationError";
import { Either } from "../generic/Either";
import { AntimicrobialClassOption, AntimicrobialClassValue } from "./AntimicrobialClassOption";
import { HealthSectorValue, HealthSectorValues } from "./HealthSectorOption";
import { HealthLevelValue, HealthLevelValues } from "./HealthLevelOption";
import { Proportion50to100Value } from "./Proportion50to100Option";
import { Id } from "../Base";

export type AMClassAMCQuestionnaireResponsesAttributes = {
    antimicrobialClass: AntimicrobialClassValue;
    healthSector: HealthSectorValue;
    healthLevel: HealthLevelValue;
    estVolumeTotalHealthLevel: Maybe<Proportion50to100Value>;
    estVolumeHospitalHealthLevel: Maybe<Proportion50to100Value>;
    estVolumeCommunityHealthLevel: Maybe<Proportion50to100Value>;
};

export type AMClassAMCQuestionId = keyof AMClassAMCQuestionnaireResponsesAttributes;

export type AMClassAMCQuestionnaireBaseAttributes = {
    id: Id;
};

export type AMClassAMCQuestionnaireAttributes = AMClassAMCQuestionnaireBaseAttributes &
    AMClassAMCQuestionnaireResponsesAttributes;

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
        const requiredConditions = this.requiredFieldsCustomConditions(attributes);
        return _.compact(
            _.map(requiredConditions, (isRequired, key) => {
                if (isRequired && !attributes[key as keyof AMClassAMCQuestionnaireResponsesAttributes]) {
                    return {
                        property: key,
                        value: attributes[key as keyof AMClassAMCQuestionnaireAttributes],
                        errors: [ValidationErrorKey.FIELD_IS_REQUIRED],
                    };
                }
                return null;
            })
        );
    }

    static requiredFieldsCustomConditions(
        attributes: Partial<AMClassAMCQuestionnaireAttributes>
    ): Partial<Record<keyof AMClassAMCQuestionnaireAttributes, boolean>> {
        const isPublicOrPrivate =
            attributes.healthSector === HealthSectorValues.Public ||
            attributes.healthSector === HealthSectorValues.Private;
        return {
            estVolumeTotalHealthLevel: isPublicOrPrivate && attributes.healthLevel === HealthLevelValues.Total,
            estVolumeHospitalHealthLevel:
                isPublicOrPrivate &&
                (attributes.healthLevel === HealthLevelValues.Hospital ||
                    attributes.healthLevel === HealthLevelValues.HospitalAndCommunity),
            estVolumeCommunityHealthLevel:
                isPublicOrPrivate &&
                (attributes.healthLevel === HealthLevelValues.Community ||
                    attributes.healthLevel === HealthLevelValues.HospitalAndCommunity),
        };
    }

    public getTitle({ antimicrobialClassOptions }: { antimicrobialClassOptions: AntimicrobialClassOption[] }): string {
        const amClassName =
            antimicrobialClassOptions.find(option => option.code === this.antimicrobialClass)?.name ||
            this.antimicrobialClass;
        return amClassName;
    }
}
