import { Id } from "../Base";
import { Either } from "../Either";
import { Struct } from "../generic/Struct";
import { AMClassAMCQuestionnaire } from "./AMClassAMCQuestionnaire";
import { AntimicrobialClassValue, AntimicrobialClassValues } from "./AntimicrobialClassOption";
import { GeneralAMCQuestionnaire } from "./GeneralAMCQuestionnaire";
import { ValidationErrorKey } from "./ValidationError";
import { YesNoValues } from "./YesNoOption";

export type AMCQuestionnaireAttrs = {
    id: Id;
    orgUnitId: Id;
    period: string;
    generalQuestionnaire: GeneralAMCQuestionnaire;
    amClassQuestionnaires: AMClassAMCQuestionnaire[];
};

const amClassOptionToGeneralMap: Record<AntimicrobialClassValue, keyof GeneralAMCQuestionnaire> = {
    [AntimicrobialClassValues.Antibacterials]: "antibacterials",
    [AntimicrobialClassValues.Antifungals]: "antifungals",
    [AntimicrobialClassValues.Antivirals]: "antivirals",
    [AntimicrobialClassValues.Antituberculosis]: "antituberculosis",
    [AntimicrobialClassValues.Antimalaria]: "antimalaria",
};

export class AMCQuestionnaire extends Struct<AMCQuestionnaireAttrs>() {
    public validate(): ValidationErrorKey[] {
        const validationErrors: ValidationErrorKey[] = [];
        if (!this.validateAMClassQuestionnairesHasOptionChecked()) {
            validationErrors.push(ValidationErrorKey.CANNOT_CREATE_AM_CLASS_QUESTIONNAIRE_NOT_CHECKED);
        }
        if (!this.validateAMClassQuestionnairesNotRepeated()) {
            validationErrors.push(ValidationErrorKey.CANNOT_CREATE_DUPLICATE_AM_CLASS_QUESTIONNAIRE);
        }
        // TODO: validate each indiviual questionnaire here?
        // TODO: return ValidationError instead?
        return validationErrors;
    }

    public addAMClassQuestionnaire(
        amClassQuestionnaire: AMClassAMCQuestionnaire
    ): Either<ValidationErrorKey[], AMCQuestionnaireAttrs> {
        const newAMCQuestionnaire = this._update({
            amClassQuestionnaires: [...this.amClassQuestionnaires, amClassQuestionnaire],
        });
        const validationErrors = newAMCQuestionnaire.validate();
        if (validationErrors.length > 0) {
            return Either.error(validationErrors);
        }
        return Either.success(newAMCQuestionnaire);
    }

    // Each amClass questionnaire must be unique for its antimicrobial class
    private validateAMClassQuestionnairesNotRepeated(): boolean {
        const amClassQuestionnaires = this.amClassQuestionnaires.map(
            amClassQuestionnaire => amClassQuestionnaire.antimicrobialClass
        );
        const uniqueAMClassQuestionnaires = new Set(amClassQuestionnaires);
        return amClassQuestionnaires.length === uniqueAMClassQuestionnaires.size;
    }

    // In the general form, the amClass must be checked in order to allow the creation of the corersponding amClass questionnaire
    private validateAMClassQuestionnairesHasOptionChecked(): boolean {
        return this.amClassQuestionnaires.every(amClassQuestionnaire => {
            const amClassOption = amClassOptionToGeneralMap[amClassQuestionnaire.antimicrobialClass];
            return this.generalQuestionnaire[amClassOption] === YesNoValues.YES;
        });
    }
}
