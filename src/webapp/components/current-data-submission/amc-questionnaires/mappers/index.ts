import {
    mapFormStateToGeneralAMCQuestionnaire,
    mapGeneralAMCQuestionnaireToInitialFormState,
} from "./generalAMCQuestionnaireMapper";
import {
    mapAMClassAMCQuestionnaireToInitialFormState,
    mapFormStateToAMClassAMCQuestionnaire,
} from "./amClassAMCQuestionnaireMapper";
import { AMCQuestionnaireFormMapper } from "./mapperTypes";

export const amcQuestionnaireMappers: AMCQuestionnaireFormMapper = {
    "general-questionnaire": {
        mapFormStateToEntity: mapFormStateToGeneralAMCQuestionnaire,
        mapEntityToFormState: mapGeneralAMCQuestionnaireToInitialFormState,
    },
    "am-class-questionnaire": {
        mapFormStateToEntity: mapFormStateToAMClassAMCQuestionnaire,
        mapEntityToFormState: mapAMClassAMCQuestionnaireToInitialFormState,
    },
};
