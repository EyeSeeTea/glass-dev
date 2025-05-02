import { createContext, useContext } from "react";
import { AntimicrobialClassOption } from "../../domain/entities/amc-questionnaires/AntimicrobialClassOption";
import { HealthLevelOption } from "../../domain/entities/amc-questionnaires/HealthLevelOption";
import { HealthSectorOption } from "../../domain/entities/amc-questionnaires/HealthSectorOption";
import { Proportion50to100Option } from "../../domain/entities/amc-questionnaires/Proportion50to100Option";
import { YesNoOption } from "../../domain/entities/amc-questionnaires/YesNoOption";
import { YesNoUnknownNAOption } from "../../domain/entities/amc-questionnaires/YesNoUnknownNAOption";
import { YesNoUnknownOption } from "../../domain/entities/amc-questionnaires/YesNoUnknownOption";

export interface AMCQuestionnaireOptionsContextState {
    yesNoUnknownNAOptions: YesNoUnknownNAOption[];
    yesNoOptions: YesNoOption[];
    yesNoUnknownOptions: YesNoUnknownOption[];
    antimicrobialClassOptions: AntimicrobialClassOption[];
    healthLevelOptions: HealthLevelOption[];
    healthSectorOptions: HealthSectorOption[];
    proportion50to100Options: Proportion50to100Option[];
}

export const defaultAMCQuestionnaireOptionsContextState: AMCQuestionnaireOptionsContextState = {
    yesNoUnknownNAOptions: [],
    yesNoOptions: [],
    yesNoUnknownOptions: [],
    antimicrobialClassOptions: [],
    healthLevelOptions: [],
    healthSectorOptions: [],
    proportion50to100Options: [],
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
