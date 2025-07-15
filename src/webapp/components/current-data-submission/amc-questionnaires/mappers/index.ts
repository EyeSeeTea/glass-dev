import {
    mapFormStateToGeneralAMCQuestionnaire,
    mapGeneralAMCQuestionnaireToInitialFormState,
} from "./generalAMCQuestionnaireMapper";
import {
    mapAMClassAMCQuestionnaireToInitialFormState,
    mapFormStateToAMClassAMCQuestionnaire,
} from "./amClassAMCQuestionnaireMapper";
import { AMCQuestionnaireFormMapper, MapToFormStateFunction } from "./mapperTypes";
import {
    mapComponentAMCQuestionnaireToInitialFormState,
    mapFormStateToComponentAMCQuestionnaire,
} from "./componentAMCQuestionnaireMapper";
import { QuestionnaireFormEntity } from "../presentation-entities/QuestionnaireFormEntity";
import { applyRulesToAllFieldsInFormState } from "../../../form/presentation-entities/utils/applyRulesInFormState";

const makeMapToFormState = <T extends QuestionnaireFormEntity>(
    mapper: MapToFormStateFunction<T>
): MapToFormStateFunction<T> => {
    return function (params: Parameters<MapToFormStateFunction<T>>[0]): ReturnType<MapToFormStateFunction<T>> {
        const formState = mapper(params);
        // We need to apply rules so required fields and other rules are consistent after initial mapping
        return applyRulesToAllFieldsInFormState(formState, params.questionnaireFormEntity.rules, params.context);
    };
};

export const amcQuestionnaireMappers: AMCQuestionnaireFormMapper = {
    "general-questionnaire": {
        mapFormStateToEntity: mapFormStateToGeneralAMCQuestionnaire,
        mapEntityToFormState: makeMapToFormState(mapGeneralAMCQuestionnaireToInitialFormState),
    },
    "am-class-questionnaire": {
        mapFormStateToEntity: mapFormStateToAMClassAMCQuestionnaire,
        mapEntityToFormState: makeMapToFormState(mapAMClassAMCQuestionnaireToInitialFormState),
    },
    "component-questionnaire": {
        mapFormStateToEntity: mapFormStateToComponentAMCQuestionnaire,
        mapEntityToFormState: makeMapToFormState(mapComponentAMCQuestionnaireToInitialFormState),
    },
};
