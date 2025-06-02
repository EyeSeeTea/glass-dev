import _ from "lodash";
import { Maybe } from "../../../types/utils";
import { Struct } from "../generic/Struct";
import { ValidationError, ValidationErrorKey } from "./ValidationError";
import { Either } from "../generic/Either";
import { AntimicrobialClassOption, AntimicrobialClassValue } from "./AntimicrobialClassOption";
import { Proportion50to100Value } from "./Proportion50to100Option";
import { Id } from "../Base";
import { getDisabledStratas, StrataValue } from "./StrataOption";

export type AMClassAMCQuestionnaireResponsesAttributes = {
    antimicrobialClass: AntimicrobialClassValue;
    stratas: StrataValue[];
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
        const strataError = this.validateStratas(attributes.stratas)
            ? null
            : {
                  property: "stratas",
                  value: attributes.stratas,
                  errors: [ValidationErrorKey.INVALID_STRATA_VALUES],
              };
        return _.compact([strataError]);
    }

    static validateStratas(stratas: StrataValue[]): boolean {
        const invalidStratas = getDisabledStratas(stratas);
        return !invalidStratas.some(invalidStrata => stratas.includes(invalidStrata));
    }

    public getTitle({ antimicrobialClassOptions }: { antimicrobialClassOptions: AntimicrobialClassOption[] }): string {
        const amClassName =
            antimicrobialClassOptions.find(option => option.code === this.antimicrobialClass)?.name ||
            this.antimicrobialClass;
        return amClassName;
    }
}
