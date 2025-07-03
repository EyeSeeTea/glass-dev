import React from "react";
import { AMCQuestionnaire } from "../../../../../../domain/entities/amc-questionnaires/AMCQuestionnaire";
import { AMCQuestionnaireQuestions } from "../../../../../../domain/entities/amc-questionnaires/AMCQuestionnaireQuestions";
import { Maybe } from "../../../../../../types/utils";
import { AMCQuestionnaireOptionsContextState } from "../../../../../contexts/amc-questionnaire-options-context";
import { FormLoadState } from "../../../../form/presentation-entities/FormState";
import { amcQuestionnaireMappers } from "../../mappers";
import { AMCQuestionnaireFormType } from "../../presentation-entities/AMCQuestionnaireFormType";
import {
    getQuestionnaireFormEntity,
    QuestionnaireFormEntityMap,
} from "../../presentation-entities/QuestionnaireFormEntity";

type UseLoadEmptyParams = {
    questions: AMCQuestionnaireQuestions;
    options: AMCQuestionnaireOptionsContextState;
    questionnaire: Maybe<AMCQuestionnaire>;
    isViewOnlyMode?: boolean;
};

export function useLoadEmptyQuestionnaireForm<T extends AMCQuestionnaireFormType>(params: {
    formType: T;
    setQuestionnaireFormEntity: React.Dispatch<React.SetStateAction<Maybe<QuestionnaireFormEntityMap[T]>>>;
    setFormLabels: React.Dispatch<React.SetStateAction<Maybe<QuestionnaireFormEntityMap[T]["labels"]>>>;
    setFormState: React.Dispatch<React.SetStateAction<FormLoadState>>;
}) {
    const { formType, setQuestionnaireFormEntity, setFormLabels, setFormState } = params;

    const loadEmptyForm = React.useCallback(
        (params: UseLoadEmptyParams) => {
            const { questions, options, questionnaire, isViewOnlyMode } = params;
            const formEntity = getQuestionnaireFormEntity(formType, questions);
            setQuestionnaireFormEntity(formEntity);
            setFormLabels(formEntity.labels);
            setFormState({
                kind: "loaded",
                data: amcQuestionnaireMappers[formType].mapEntityToFormState({
                    questionnaireFormEntity: formEntity,
                    editMode: false,
                    options: options,
                    amcQuestionnaire: questionnaire,
                    isViewOnlyMode: isViewOnlyMode,
                }),
            });
        },
        [formType, setFormLabels, setFormState, setQuestionnaireFormEntity]
    );
    return { loadEmptyForm };
}
