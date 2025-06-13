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
import { StrataOption, StrataValue } from "./StrataOption";
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
} as const;

export class AMCQuestionnaire extends Struct<AMCQuestionnaireAttrs>() {
    constructor(_attributes: AMCQuestionnaireAttrs) {
        super(_attributes);
        const validationResults = this.validate();
        if (validationResults.length > 0) {
            throw new Error(`Invalid AMCQuestionnaire: ${validationResults.join(", ")}`);
        }
    }

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
        const availableValues = this.getAvailableAMClassOptionValuesForAMClassQ();
        if (availableValues.length === 0) {
            return [];
        }
        return allOptions.filter(option => availableValues.includes(option.code));
    }

    private getAvailableAMClassOptionValuesForAMClassQ(): AntimicrobialClassValue[] {
        const usedAntimicrobials = this.amClassQuestionnaires.map(
            amClassQuestionnaire => amClassQuestionnaire.antimicrobialClass
        );
        const checkedAntimicrobials = Object.entries(amClassOptionToGeneralMap)
            .filter(([, value]) => this.generalQuestionnaire[value] === YesNoValues.YES)
            .map(([key]) => key) as AntimicrobialClassValue[];
        return checkedAntimicrobials.filter(antimicrobialClass => !usedAntimicrobials.includes(antimicrobialClass));
    }

    private getUsedStratasInComponentQ(forAMClass: AntimicrobialClassValue): StrataValue[] {
        return this.componentQuestionnaires.reduce<StrataValue[]>((acc, componentQuestionnaire) => {
            if (componentQuestionnaire.stratumByAntimicrobialClass[forAMClass]) {
                return [...acc, ...componentQuestionnaire.stratumByAntimicrobialClass[forAMClass]];
            }
            return acc;
        }, []);
    }

    private getAvailableStrataValuesForAMClass(forAMClass: AntimicrobialClassValue): StrataValue[] {
        const amClassQuestionnaire = this.amClassQuestionnaires.find(
            amClassQuestionnaire => amClassQuestionnaire.antimicrobialClass === forAMClass
        );
        if (!amClassQuestionnaire) {
            return [];
        }
        const allStrataValuesForAm = amClassQuestionnaire.stratas;
        const strataValuesAlreadyAssignedToAm = this.getUsedStratasInComponentQ(forAMClass);
        return allStrataValuesForAm.filter(strataValue => !strataValuesAlreadyAssignedToAm.includes(strataValue));
    }

    // filters the options based on availability in component questionnaires for the specified AM class
    public getAvailableStrataOptionsForComponentQ(
        allOptions: StrataOption[],
        forAMClass: AntimicrobialClassValue
    ): StrataOption[] {
        const amClassQuestionnaire = this.amClassQuestionnaires.find(
            amClassQuestionnaire => amClassQuestionnaire.antimicrobialClass === forAMClass
        );
        if (!amClassQuestionnaire) {
            return [];
        }
        const usedStrataValues = this.getUsedStratasInComponentQ(forAMClass);
        const availableStratas = amClassQuestionnaire.stratas.filter(
            strataValue => !usedStrataValues.includes(strataValue)
        );
        return allOptions.filter(option => availableStratas.includes(option.code));
    }

    public getRemainingComponentCombinations(): ComponentAMCQuestionnaireCombination[] {
        const result = this.amClassQuestionnaires.map(amClassQuestionnaire => ({
            antimicrobialClass: amClassQuestionnaire.antimicrobialClass,
            strataValues: this.getAvailableStrataValuesForAMClass(amClassQuestionnaire.antimicrobialClass),
        }));
        return result.filter(item => item.strataValues.length > 0);
    }

    public canAddAMClassQuestionnaire(): boolean {
        return this.getAvailableAMClassOptionValuesForAMClassQ().length > 0;
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
            return Object.entries(componentQuestionnaire.stratumByAntimicrobialClass)
                .filter(([_amClass, stratum]) => stratum.length > 0)
                .every(([amClass]) =>
                    this.amClassQuestionnaires.some(
                        amClassQuestionnaire => amClassQuestionnaire.antimicrobialClass === amClass
                    )
                );
        });
    }

    // strata values for antimicrobial classes in component questionnaires must not overlap
    public validateComponentQuestionnairesStrataOverlap(): boolean {
        const stratasByAMClass: Record<AntimicrobialClassValue, StrataValue[]> = this.componentQuestionnaires.reduce(
            (acc, componentQuestionnaire) => {
                Object.entries(componentQuestionnaire.stratumByAntimicrobialClass).forEach(([amClass, stratum]) => {
                    if (!acc[amClass as AntimicrobialClassValue]) {
                        acc[amClass as AntimicrobialClassValue] = [];
                    }
                    acc[amClass as AntimicrobialClassValue].push(...stratum);
                });
                return acc;
            },
            {} as Record<AntimicrobialClassValue, StrataValue[]>
        );
        const strataValuesByAMClass = Object.values(stratasByAMClass);
        for (const strataValues of strataValuesByAMClass) {
            if (_.uniq(strataValues).length !== strataValues.length) {
                // Overlapping strata values found
                return false;
            }
        }
        return true;
    }
}
