import { Struct } from "../generic/Struct";
import { AntimicrobialClassValue } from "./AntimicrobialClassOption";
import { Id } from "../Base";
import { YesNoUnknownValue } from "./YesNoUnknownOption";
import { Maybe } from "../../../utils/ts-utils";
import { YesNoValue } from "./YesNoOption";
import { DataLevelValue } from "./DataLevelOption";
import { ProcurementLevelValue } from "./ProcurementLevelOption";
import { NationalPopulationDataSourceValue } from "./NationalPopulationDataSourceOption";
import { DataSourceValue } from "./DataSourceOption";
import { Proportion50to100UnknownValue } from "./Proportion50to100UnknownOption";
import { ValidationError, ValidationErrorKey } from "./ValidationError";
import { Either } from "../generic/Either";

export type ComponentAMCQuestionnaireBaseAttributes = {
    id: Id;
    status: "ACTIVE" | "COMPLETED" | "CANCELLED";
    created?: Date;
    lastUpdated?: Date;
};

export type ComponentAMCQuestionnaireResponsesAttributes = {
    antimicrobialClasses: AntimicrobialClassValue[];
    componentStrata: string[]; // TODO: use optionSet when created
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

// TODO: add validations
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
        return _.compact(
            _.map(requiredConditions, (isRequired, key) => {
                if (isRequired && !attributes[key as keyof ComponentAMCQuestionnaireResponsesAttributes]) {
                    return {
                        property: key,
                        value: attributes[key as keyof ComponentAMCQuestionnaireAttributes],
                        errors: [ValidationErrorKey.FIELD_IS_REQUIRED],
                    };
                }
                return null;
            })
        );
    }

    static requiredFieldsCustomConditions(
        attributes: Partial<ComponentAMCQuestionnaireAttributes>
    ): Partial<Record<keyof ComponentAMCQuestionnaireAttributes, boolean>> {
        return {};
    }
}
