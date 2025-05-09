import { Id } from "../Base";
import { Either } from "../Either";
import { Struct } from "../generic/Struct";
import { AMClassAMCQuestionnaire } from "./AMClassAMCQuestionnaire";
import {
    AntimicrobialClassOption,
    AntimicrobialClassValue,
    AntimicrobialClassValues,
} from "./AntimicrobialClassOption";
import { GeneralAMCQuestionnaire, GeneralAMCQuestionnaireAMClassAttributes } from "./GeneralAMCQuestionnaire";
import { ValidationErrorKey } from "./ValidationError";
import { YesNoValues } from "./YesNoOption";

export type AMCQuestionnaireAttrs = {
    id: Id;
    orgUnitId: Id;
    period: string;
    generalQuestionnaire: GeneralAMCQuestionnaire;
    amClassQuestionnaires: AMClassAMCQuestionnaire[];
};

const amClassOptionToGeneralMap: Record<AntimicrobialClassValue, keyof GeneralAMCQuestionnaireAMClassAttributes> = {
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

    // If the amClassQuestionnaire has an id, it will be updated, otherwise it will be added
    public addOrUpdateAMClassQuestionnaire(
        amClassQuestionnaire: AMClassAMCQuestionnaire
    ): Either<ValidationErrorKey[], AMCQuestionnaireAttrs> {
        const updatedAMClassQuestionnaireList = amClassQuestionnaire.id
            ? this.amClassQuestionnaires.map(questionnaire => {
                  if (questionnaire.id === amClassQuestionnaire.id) {
                      return amClassQuestionnaire;
                  }
                  return questionnaire;
              })
            : [...this.amClassQuestionnaires, amClassQuestionnaire];
        const newAMCQuestionnaire = this._update({
            amClassQuestionnaires: updatedAMClassQuestionnaireList,
        });
        const validationErrors = newAMCQuestionnaire.validate();
        if (validationErrors.length > 0) {
            return Either.error(validationErrors);
        }
        return Either.success(newAMCQuestionnaire);
    }

    // returns true if the property in the general questionnaire has a amClassQuestionnaire for that class and is checked
    public hasAMClassForm(property: keyof GeneralAMCQuestionnaireAMClassAttributes): boolean {
        if (this.amClassQuestionnaires.length === 0) {
            return false;
        }
        const amClassOptionValue = Object.entries(amClassOptionToGeneralMap).find(
            ([, value]) => value === property
        )?.[0];
        if (!amClassOptionValue) {
            return false;
        }
        return this.amClassQuestionnaires.some(
            amClassQuestionnaire =>
                amClassQuestionnaire.antimicrobialClass === amClassOptionValue &&
                this.generalQuestionnaire[property] === YesNoValues.YES
        );
    }

    // filters the options based on the general questionnaire checked options and availability
    public getAvailableAMClassOptions(allOptions: AntimicrobialClassOption[]): AntimicrobialClassOption[] {
        const amClassOptions = allOptions
            .filter(option => {
                const isOptionInGeneral =
                    this.generalQuestionnaire[amClassOptionToGeneralMap[option.code]] === YesNoValues.YES;
                return isOptionInGeneral;
            })
            .filter(option => {
                const isOptionInUse = this.amClassQuestionnaires.some(
                    amClassQuestionnaire => amClassQuestionnaire.antimicrobialClass === option.code
                );
                return !isOptionInUse;
            });
        return amClassOptions;
    }

    public canAddAMClassQuestionnaire(): boolean {
        // naive implementation, just check if the number of questionnaires is less than the number of options
        return Object.entries(amClassOptionToGeneralMap).length > this.amClassQuestionnaires.length;
    }

    public canAddComponentQuestionnaire(): boolean {
        return this.amClassQuestionnaires.length !== 0; // TODO: implement this
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
