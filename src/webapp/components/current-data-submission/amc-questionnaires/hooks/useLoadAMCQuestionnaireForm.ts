import { useEffect, useMemo, useState } from "react";
import { Id } from "../../../../../domain/entities/Ref";
import { Maybe } from "../../../../../utils/ts-utils";
import {
    AMCQuestionnaireMap,
    FormLables,
    getQuestionnaireFormEntity,
    QuestionnaireFormEntityOf,
} from "../presentation-entities/QuestionnaireFormEntity";
import { useAMCQuestionnaireOptionsContext } from "../../../../contexts/amc-questionnaire-options-context";
import { amcQuestionnaireMappers } from "../mappers";
import { useAMCQuestionnaireContext } from "../../../../contexts/amc-questionnaire-context";
import { FormLoadState } from "../../../form/presentation-entities/FormState";
import { AMCQuestionnaireFormType } from "../presentation-entities/AMCQuestionnaireFormType";
import { AMCQuestionnaire } from "../../../../../domain/entities/amc-questionnaires/AMCQuestionnaire";

export type UseLoadFormResult<T extends AMCQuestionnaireFormType> = {
    formLabels: Maybe<FormLables>;
    formState: FormLoadState;
    setFormState: (state: FormLoadState | ((prevState: FormLoadState) => FormLoadState)) => void;
    questionnaireFormEntity: Maybe<QuestionnaireFormEntityOf<T>>;
};

export type UseLoadAMCQuestionnaireFormParamsBase = {
    id?: Id;
    orgUnitId: Id;
    period: string;
    isViewOnlyMode?: boolean;
};

export function useLoadAMCQuestionnaireForm<T extends AMCQuestionnaireFormType>(
    params: UseLoadAMCQuestionnaireFormParamsBase & {
        formType: T;
        finderFunction: (amcQuestionnaire: AMCQuestionnaire, id?: Id) => Maybe<AMCQuestionnaireMap[T]>;
    }
): UseLoadFormResult<T> {
    const { id, orgUnitId, period, isViewOnlyMode, formType, finderFunction } = params;
    const { questionnaire: rootQuestionnaire, questions } = useAMCQuestionnaireContext();
    const options = useAMCQuestionnaireOptionsContext();
    const [formState, setFormState] = useState<FormLoadState>({ kind: "loading" });
    const [formLabels, setFormLabels] = useState<FormLables>();
    const [questionnaireFormEntity, setQuestionnaireFormEntity] = useState<QuestionnaireFormEntityOf<T>>();

    const isEditMode = useMemo(() => !!id, [id]);
    useEffect(() => {
        if (!questions || !options || !rootQuestionnaire) {
            return;
        }
        const questionnaire = finderFunction(rootQuestionnaire, id);

        if (id !== undefined && !questionnaire) {
            // If id is provided, we expect to find the questionnaire
            setFormState({
                kind: "error",
                message: `${formType} with id ${id} not found`,
            });
            return;
        }

        const formEntity = getQuestionnaireFormEntity(formType, questions, questionnaire);
        setQuestionnaireFormEntity(formEntity);
        setFormLabels(formEntity.labels);
        setFormState({
            kind: "loaded",
            data: amcQuestionnaireMappers[formType].mapEntityToFormState({
                questionnaireFormEntity: formEntity,
                editMode: !id && !rootQuestionnaire ? false : isEditMode, // edit mode is false by default for empty questionnaires
                options: options,
                amcQuestionnaire: rootQuestionnaire,
                isViewOnlyMode: isViewOnlyMode,
            }),
        });
    }, [
        questions,
        id,
        isEditMode,
        options,
        orgUnitId,
        period,
        isViewOnlyMode,
        rootQuestionnaire,
        finderFunction,
        formType,
    ]);

    return {
        formLabels,
        formState,
        setFormState,
        questionnaireFormEntity,
    };
}
