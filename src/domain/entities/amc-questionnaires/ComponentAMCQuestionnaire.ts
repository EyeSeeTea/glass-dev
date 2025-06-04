import { Struct } from "../generic/Struct";
import {
    antimicrobialClassOption,
    AntimicrobialClassOption,
    AntimicrobialClassValue,
    AntimicrobialClassValues,
} from "./AntimicrobialClassOption";
import { Id } from "../Base";
import { YesNoUnknownValue, YesNoUnknownValues } from "./YesNoUnknownOption";
import { Maybe } from "../../../utils/ts-utils";
import { YesNoValue, YesNoValues } from "./YesNoOption";
import { DataLevelValue, DataLevelValues } from "./DataLevelOption";
import { ProcurementLevelValue } from "./ProcurementLevelOption";
import {
    NationalPopulationDataSourceValue,
    NationalPopulationDataSourceValues,
} from "./NationalPopulationDataSourceOption";
import { DataSourceValue } from "./DataSourceOption";
import { Proportion50to100UnknownValue } from "./Proportion50to100UnknownOption";
import { ValidationError, ValidationErrorKey } from "./ValidationError";
import { Either } from "../generic/Either";
import { strataOption, StrataOption, StrataValue } from "./StrataOption";

export type ComponentAMCQuestionnaireBaseAttributes = {
    id: Id;
    status: "ACTIVE" | "COMPLETED" | "CANCELLED";
    created?: Date;
    lastUpdated?: Date;
};

export type ComponentAMCQuestionnaireResponsesAttributes = {
    antibacterialStratum: StrataValue[];
    antifungalStratum: StrataValue[];
    antiviralStratum: StrataValue[];
    antituberculosisStratum: StrataValue[];
    antimalariaStratum: StrataValue[];
    excludedSubstances: YesNoUnknownValue;
    listOfExcludedSubstances: Maybe<string>;
    typeOfDataReported: DataLevelValue;
    procurementTypeOfDataReported: Maybe<ProcurementLevelValue>;
    mixedTypeOfData: Maybe<string>;
    sourcesOfDataReported: DataSourceValue[];
    commentsForDataSources: Maybe<string>;
    sameAsUNPopulation: YesNoValue;
    sourceOfNationalPopulation: Maybe<NationalPopulationDataSourceValue>;
    otherSourceForNationalPopulation: Maybe<string>;
    commentOnNationalPopulation: Maybe<string>;
    coverageVolumeWithinTheStratum: Proportion50to100UnknownValue;
    commentOnCoverageWithinTheStratum: Maybe<string>;
};

export type ComponentAMCQuestionId = keyof ComponentAMCQuestionnaireResponsesAttributes;

export type ComponentAMCQuestionnaireAttributes = ComponentAMCQuestionnaireBaseAttributes &
    ComponentAMCQuestionnaireResponsesAttributes;

export type ComponentAMCQuestionnaireCombination = {
    antimicrobialClass: AntimicrobialClassValue;
    strataValues: StrataValue[];
};

export class ComponentAMCQuestionnaire extends Struct<ComponentAMCQuestionnaireAttributes>() {
    static validateAndCreate(
        attributes: ComponentAMCQuestionnaireAttributes
    ): Either<ValidationError[], ComponentAMCQuestionnaire> {
        const errors = this.validate(attributes);
        if (errors.length > 0) {
            return Either.error(errors);
        }
        return Either.success(new ComponentAMCQuestionnaire(attributes));
    }

    static validate(attributes: ComponentAMCQuestionnaireAttributes): ValidationError[] {
        const requiredConditions = this.requiredFieldsCustomConditions(attributes);
        const haveAtLeastOneStrata =
            [
                ...attributes.antibacterialStratum,
                ...attributes.antifungalStratum,
                ...attributes.antimalariaStratum,
                ...attributes.antituberculosisStratum,
                ...attributes.antiviralStratum,
            ].length > 0;
        return _.compact([
            ..._.map(requiredConditions, (isRequired, key) => {
                if (isRequired && !attributes[key as keyof ComponentAMCQuestionnaireResponsesAttributes]) {
                    return {
                        property: key,
                        value: attributes[key as keyof ComponentAMCQuestionnaireAttributes],
                        errors: [ValidationErrorKey.FIELD_IS_REQUIRED],
                    };
                }
                return null;
            }),
            haveAtLeastOneStrata
                ? null
                : {
                      property: "stratum",
                      value: null,
                      errors: [ValidationErrorKey.COMPONENT_MUST_HAVE_AT_LEAST_ONE_STRATA],
                  },
        ]);
    }

    static requiredFieldsCustomConditions(
        attributes: Partial<ComponentAMCQuestionnaireAttributes>
    ): Partial<Record<keyof ComponentAMCQuestionnaireAttributes, boolean>> {
        return {
            excludedSubstances: true,
            typeOfDataReported: true,
            sourcesOfDataReported: true,
            coverageVolumeWithinTheStratum: true,
            listOfExcludedSubstances: attributes.excludedSubstances === YesNoUnknownValues.YES,
            procurementTypeOfDataReported: attributes.typeOfDataReported === DataLevelValues.Procurement,
            mixedTypeOfData: attributes.typeOfDataReported === DataLevelValues.Mixed,
            sourceOfNationalPopulation: attributes.sameAsUNPopulation === YesNoValues.NO,
            otherSourceForNationalPopulation:
                attributes.sourceOfNationalPopulation === NationalPopulationDataSourceValues.Other,
        };
    }

    static getAntimicrobialClassByStratumProperty(
        property: keyof ComponentAMCQuestionnaireResponsesAttributes
    ): AntimicrobialClassValue {
        switch (property) {
            case "antibacterialStratum":
                return AntimicrobialClassValues.Antibacterials;
            case "antifungalStratum":
                return AntimicrobialClassValues.Antifungals;
            case "antiviralStratum":
                return AntimicrobialClassValues.Antivirals;
            case "antituberculosisStratum":
                return AntimicrobialClassValues.Antituberculosis;
            case "antimalariaStratum":
                return AntimicrobialClassValues.Antimalaria;
            default:
                throw new Error(`Property "${property}" does not map to an antimicrobial class.`);
        }
    }

    public get stratumByAntimicrobialClass(): Record<AntimicrobialClassValue, StrataValue[]> {
        return {
            [AntimicrobialClassValues.Antibacterials]: this.antibacterialStratum,
            [AntimicrobialClassValues.Antifungals]: this.antifungalStratum,
            [AntimicrobialClassValues.Antivirals]: this.antiviralStratum,
            [AntimicrobialClassValues.Antituberculosis]: this.antituberculosisStratum,
            [AntimicrobialClassValues.Antimalaria]: this.antimalariaStratum,
        };
    }

    public getTitle({
        antimicrobialClassOptions,
        strataOptions,
    }: {
        antimicrobialClassOptions: AntimicrobialClassOption[];
        strataOptions: StrataOption[];
    }): string {
        return Object.entries(this.stratumByAntimicrobialClass)
            .map(([amClass, stratas]) => {
                if (stratas.length === 0) {
                    return "";
                }
                const amClassName = antimicrobialClassOption.getNameByCode(
                    antimicrobialClassOptions,
                    amClass as AntimicrobialClassValue
                );
                const stratasNames = stratas.map(strata => strataOption.getNameByCode(strataOptions, strata));
                return `${amClassName} (${stratasNames.join(", ")})`;
            })
            .filter(Boolean)
            .join(" / ");
    }
}
