import { Id } from "../Base";
import { Either } from "../Either";
import { Struct } from "../generic/Struct";
import { AMClassAMCQuestionnaire } from "./AMClassAMCQuestionnaire";
import { GeneralAMCQuestionnaire } from "./GeneralAMCQuestionnaire";
import { ValidationErrorKey } from "./ValidationError";

export type AMCQuestionnaireAttrs = {
    id: Id;
    orgUnitId: Id;
    period: string;
    generalQuestionnaire: GeneralAMCQuestionnaire;
    amClassQuestionnaires: AMClassAMCQuestionnaire[];
};

export class AMCQuestionnaire extends Struct<AMCQuestionnaireAttrs>() {
    public static validate(_data: AMCQuestionnaireAttrs): ValidationErrorKey[] {
        // TODO:
        // check only one amClassQuestionnaire by am class
        // check there is no amClassQuestionnaire if the boolean is false in the general questionnaire
        return [];
    }

    public addAMClassQuestionnaire(
        amClassQuestionnaire: AMClassAMCQuestionnaire
    ): Either<ValidationErrorKey[], AMCQuestionnaireAttrs> {
        const existingAMClassQuestionnaire = this.amClassQuestionnaires.find(
            amQuestionnaire => amQuestionnaire.antimicrobialClass === amClassQuestionnaire.antimicrobialClass
        );

        if (existingAMClassQuestionnaire) {
            return Either.error([ValidationErrorKey.CANNOT_CREATE_DUPLICATE_AM_CLASS_QUESTIONNAIRE]);
        }
        // TODO: check there is no amClassQuestionnaire if the boolean is false in the general questionnaire

        return Either.success(
            this._update({
                amClassQuestionnaires: [...this.amClassQuestionnaires, amClassQuestionnaire],
            })
        );
    }
}
