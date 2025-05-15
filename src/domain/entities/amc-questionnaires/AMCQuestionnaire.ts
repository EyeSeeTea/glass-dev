import { Maybe } from "../../../types/utils";
import { Id } from "../Base";
import { Either } from "../Either";
import { Struct } from "../generic/Struct";
import { AMClassAMCQuestionnaire } from "./AMClassAMCQuestionnaire";
import {
    AntimicrobialClassOption,
    AntimicrobialClassValue,
    AntimicrobialClassValues,
} from "./AntimicrobialClassOption";
import { ComponentAMCQuestionnaire, ComponentAMCQuestionnaireCombination } from "./ComponentAMCQuestionnaire";
import { GeneralAMCQuestionnaire, GeneralAMCQuestionnaireAMClassAttributes } from "./GeneralAMCQuestionnaire";
import { getStrataValuesFromHealthSectorAndLevel, StrataOption, StrataValue } from "./StrataOption";
import { ValidationErrorKey } from "./ValidationError";
import { YesNoValues } from "./YesNoOption";
import _ from "lodash";
import { replaceById } from "../../../utils/ts-utils";

export type AMCQuestionnaireAttrs = {
    id: Id;
    orgUnitId: Id;
    period: string;
    generalQuestionnaire: GeneralAMCQuestionnaire;
    amClassQuestionnaires: AMClassAMCQuestionnaire[];
    componentQuestionnaires: ComponentAMCQuestionnaire[];
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
        if (!this.validateComponentQuestionnairesHaveAmClassQuestionnaires()) {
            validationErrors.push(ValidationErrorKey.COMPONENT_AM_WITHOUT_AMCLASS_QUESTIONNAIRE);
        }
        if (!this.validateComponentQuestionnairesStrataOverlap()) {
            validationErrors.push(ValidationErrorKey.COMPONENT_STRATA_OVERLAP);
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
            ? replaceById(this.amClassQuestionnaires, amClassQuestionnaire)
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

    public addOrUpdateComponentQuestionnaire(
        componentQuestionnaire: ComponentAMCQuestionnaire
    ): Either<ValidationErrorKey[], AMCQuestionnaireAttrs> {
        const updatedComponentQuestionnaireList = componentQuestionnaire.id
            ? replaceById(this.componentQuestionnaires, componentQuestionnaire)
            : [...this.componentQuestionnaires, componentQuestionnaire];
        const newAMCQuestionnaire = this._update({
            componentQuestionnaires: updatedComponentQuestionnaireList,
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
    public getAvailableAMClassOptionsForAMClassQ(allOptions: AntimicrobialClassOption[]): AntimicrobialClassOption[] {
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

    // filters the options based on AMClass questionnaires and Component questionnaires
    public getAvailableAMClassOptionsForComponentQ(
        allOptions: AntimicrobialClassOption[],
        forStrata: Maybe<StrataValue>
    ): AntimicrobialClassOption[] {
        return allOptions
            .filter(option => {
                const isOptionInAmClass = this.amClassQuestionnaires.some(
                    amClassQuestionnaire => amClassQuestionnaire.antimicrobialClass === option.code
                );
                return isOptionInAmClass;
            })
            .filter(option => {
                const availableStratasForAmClass = this.getAvailableStrataValuesForAMClass(option.code);
                return forStrata
                    ? availableStratasForAmClass.includes(forStrata)
                    : availableStratasForAmClass.length > 0;
            });
    }

    private getAvailableStrataValuesForAMClass(forAMClass: AntimicrobialClassValue): StrataValue[] {
        const amClassQuestionnaire = this.amClassQuestionnaires.find(
            amClassQuestionnaire => amClassQuestionnaire.antimicrobialClass === forAMClass
        );
        if (!amClassQuestionnaire) {
            return [];
        }
        const allStrataValuesForAm = getStrataValuesFromHealthSectorAndLevel(
            amClassQuestionnaire.healthSector,
            amClassQuestionnaire.healthLevel
        );
        const strataValuesAlreadyAssignedToAm = this.componentQuestionnaires.reduce<StrataValue[]>(
            (acc, componentQuestionnaire) => {
                if (componentQuestionnaire.antimicrobialClasses.includes(forAMClass)) {
                    return [...acc, componentQuestionnaire.componentStrata];
                }
                return acc;
            },
            []
        );
        return allStrataValuesForAm.filter(strataValue => !strataValuesAlreadyAssignedToAm.includes(strataValue));
    }

    // filters the options based on availability in component questionnaires for the specified AM classes
    // if no `forAMClasses` are specified, return union of stratas for all available AM classes
    // otherwise, return stratas that are available simultaneously for `forAMClasses`
    public getAvailableStrataOptionsForComponentQ(
        allOptions: StrataOption[],
        forAMClasses: AntimicrobialClassValue[]
    ): StrataOption[] {
        const useIntersection = forAMClasses.length > 0;
        const filterForClasses = useIntersection
            ? forAMClasses
            : this.amClassQuestionnaires.map(amClassQuestionnaire => amClassQuestionnaire.antimicrobialClass);
        const strataValuesAvailableForEachClass = filterForClasses.map(forAMClass =>
            this.getAvailableStrataValuesForAMClass(forAMClass)
        );
        const strataValuesAvailableForAllClasses = useIntersection
            ? _.intersection(...strataValuesAvailableForEachClass)
            : _.union(...strataValuesAvailableForEachClass);
        return allOptions.filter(option => strataValuesAvailableForAllClasses.includes(option.code));
    }

    public getRemainingComponentCombinations(): ComponentAMCQuestionnaireCombination[] {
        const result = this.amClassQuestionnaires.map(amClassQuestionnaire => ({
            antimicrobialClass: amClassQuestionnaire.antimicrobialClass,
            strataValues: this.getAvailableStrataValuesForAMClass(amClassQuestionnaire.antimicrobialClass),
        }));
        return result.filter(item => item.strataValues.length > 0);
    }

    public canAddAMClassQuestionnaire(): boolean {
        // naive implementation, just check if the number of questionnaires is less than the number of options
        return Object.entries(amClassOptionToGeneralMap).length > this.amClassQuestionnaires.length;
    }

    public canAddComponentQuestionnaire(): boolean {
        return this.getRemainingComponentCombinations().length > 0;
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

    // All the antimicrobialClasses in component questionnaires must have a corresponding amClass questionnaire
    private validateComponentQuestionnairesHaveAmClassQuestionnaires(): boolean {
        return this.componentQuestionnaires.every(componentQuestionnaire => {
            return componentQuestionnaire.antimicrobialClasses.every(amClass =>
                this.amClassQuestionnaires.some(
                    amClassQuestionnaire => amClassQuestionnaire.antimicrobialClass === amClass
                )
            );
        });
    }

    // strata values for antimicrobial classes in component questionnaires must not overlap
    public validateComponentQuestionnairesStrataOverlap(): boolean {
        return true; // TODO: implement this
    }
}
