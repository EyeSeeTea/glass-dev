import { createContext, useContext } from "react";
import { AntimicrobialClassOption } from "../../domain/entities/amc-questionnaires/AntimicrobialClassOption";
import { Proportion50to100Option } from "../../domain/entities/amc-questionnaires/Proportion50to100Option";
import { YesNoOption } from "../../domain/entities/amc-questionnaires/YesNoOption";
import { YesNoUnknownNAOption } from "../../domain/entities/amc-questionnaires/YesNoUnknownNAOption";
import { YesNoUnknownOption } from "../../domain/entities/amc-questionnaires/YesNoUnknownOption";
import { Proportion50to100UnknownOption } from "../../domain/entities/amc-questionnaires/Proportion50to100UnknownOption";
import { DataLevelOption } from "../../domain/entities/amc-questionnaires/DataLevelOption";
import { DataSourceOption } from "../../domain/entities/amc-questionnaires/DataSourceOption";
import { NationalPopulationDataSourceOption } from "../../domain/entities/amc-questionnaires/NationalPopulationDataSourceOption";
import { ProcurementLevelOption } from "../../domain/entities/amc-questionnaires/ProcurementLevelOption";
import { StrataOption } from "../../domain/entities/amc-questionnaires/StrataOption";

export interface AMCQuestionnaireOptionsContextState {
    yesNoUnknownNAOptions: YesNoUnknownNAOption[];
    yesNoOptions: YesNoOption[];
    yesNoUnknownOptions: YesNoUnknownOption[];
    antimicrobialClassOptions: AntimicrobialClassOption[];
    proportion50to100Options: Proportion50to100Option[];
    proportion50to100UnknownOptions: Proportion50to100UnknownOption[];
    dataLevelOptions: DataLevelOption[];
    dataSourceOptions: DataSourceOption[];
    nationalPopulationDataSourceOptions: NationalPopulationDataSourceOption[];
    procurementLevelOptions: ProcurementLevelOption[];
    strataOptions: StrataOption[];
}

export const defaultAMCQuestionnaireOptionsContextState: AMCQuestionnaireOptionsContextState = {
    yesNoUnknownNAOptions: [],
    yesNoOptions: [],
    yesNoUnknownOptions: [],
    antimicrobialClassOptions: [],
    proportion50to100Options: [],
    proportion50to100UnknownOptions: [],
    dataLevelOptions: [],
    dataSourceOptions: [],
    nationalPopulationDataSourceOptions: [],
    procurementLevelOptions: [],
    strataOptions: [],
};

export const AMCQuestionnaireOptionsContext = createContext<AMCQuestionnaireOptionsContextState>(
    defaultAMCQuestionnaireOptionsContextState
);

export function useAMCQuestionnaireOptionsContext() {
    const context = useContext(AMCQuestionnaireOptionsContext);

    if (context) {
        return context;
    } else {
        throw new Error("AMC Questionnaire Options Context uninitialized");
    }
}
