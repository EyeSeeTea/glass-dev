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

export type ComponentAMCQuestionnaireBaseAttributes = {
    id: Id;
    status: "ACTIVE" | "COMPLETED" | "CANCELLED";
    created?: Date;
    lastUpdated?: Date;
};

export type ComponentAMCQuestionnaireResponsesAttributes = {
    antimicrobialClass: AntimicrobialClassValue;
    componentStrata: string; // TODO: use optionSet when created
    excludedSubstances: YesNoUnknownValue;
    listOfExcludedSubstances: Maybe<string>;
    typeOfDataReported: DataLevelValue;
    procurementTypeOfDataReported: ProcurementLevelValue;
    mixedTypeOfData: Maybe<string>;
    sourcesOfDataReported: DataSourceValue;
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

export class ComponentAMCQuestionnaire extends Struct<ComponentAMCQuestionnaireAttributes>() {}
