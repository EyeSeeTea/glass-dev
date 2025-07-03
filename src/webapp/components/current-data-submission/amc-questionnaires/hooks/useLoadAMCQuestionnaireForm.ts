import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../../../../contexts/app-context";
import { Id } from "../../../../../domain/entities/Ref";
import { Maybe } from "../../../../../utils/ts-utils";
import {
    FormLables,
    getQuestionnaireFormEntity,
    QuestionnaireFormEntityMap,
} from "../presentation-entities/QuestionnaireFormEntity";
import { AMCQuestionnaireFormType } from "../presentation-entities/AMCQuestionnaireFormType";
import { useAMCQuestionnaireOptionsContext } from "../../../../contexts/amc-questionnaire-options-context";
import { amcQuestionnaireMappers } from "../mappers";
import { useAMCQuestionnaireContext } from "../../../../contexts/amc-questionnaire-context";
import { FormLoadState } from "../../../form/presentation-entities/FormState";

type State<T extends AMCQuestionnaireFormType> = {
    formLabels: Maybe<FormLables>;
    formState: FormLoadState;
    setFormState: (state: FormLoadState | ((prevState: FormLoadState) => FormLoadState)) => void;
    questionnaireFormEntity: Maybe<QuestionnaireFormEntityMap[T]>;
};

export function useLoadAMCQuestionnaireForm<T extends AMCQuestionnaireFormType>(params: {
    formType: T;
    id?: Id;
    orgUnitId: Id;
    period: string;
    isViewOnlyMode?: boolean;
}): State<T> {
    const { formType, id, orgUnitId, period, isViewOnlyMode = false } = params;

    const { compositionRoot } = useAppContext();
    const { questionnaire, questions } = useAMCQuestionnaireContext();
    const options = useAMCQuestionnaireOptionsContext();
    const [formState, setFormState] = useState<FormLoadState>({ kind: "loading" });
    const [formLabels, setFormLabels] = useState<FormLables>();
    const [questionnaireFormEntity, setQuestionnaireFormEntity] = useState<QuestionnaireFormEntityMap[T]>();

    const isEditMode = useMemo(() => !!id, [id]);

    useEffect(() => {
        if (!questions || !options) {
            return;
        }
        if (!id || !questionnaire) {
            const formEntity = getQuestionnaireFormEntity(formType, questions);
            setQuestionnaireFormEntity(formEntity);
            setFormLabels(formEntity.labels);
            setFormState({
                kind: "loaded",
                data: amcQuestionnaireMappers[formType].mapEntityToFormState({
                    questionnaireFormEntity: formEntity,
                    editMode: isEditMode,
                    options: options,
                    amcQuestionnaire: questionnaire,
                    isViewOnlyMode: isViewOnlyMode,
                }),
            });
            return;
        }
        switch (formType) {
            case "general-questionnaire":
                {
                    const formEntity = getQuestionnaireFormEntity(
                        formType,
                        questions,
                        questionnaire?.generalQuestionnaire
                    );
                    setQuestionnaireFormEntity(formEntity);
                    setFormLabels(formEntity.labels);
                    setFormState({
                        kind: "loaded",
                        data: amcQuestionnaireMappers[formType].mapEntityToFormState({
                            questionnaireFormEntity: formEntity,
                            editMode: isEditMode,
                            options: options,
                            amcQuestionnaire: questionnaire,
                            isViewOnlyMode: isViewOnlyMode,
                        }),
                    });
                }
                break;

            case "am-class-questionnaire":
                {
                    const amClassQuestionnaire = questionnaire?.amClassQuestionnaires.find(q => q.id === id);
                    if (!amClassQuestionnaire) {
                        setFormState({
                            kind: "error",
                            message: `AM Class Questionnaire with id ${id} not found`,
                        });
                        return;
                    }

                    const formEntity = getQuestionnaireFormEntity(formType, questions, amClassQuestionnaire);
                    setQuestionnaireFormEntity(formEntity);
                    setFormLabels(formEntity.labels);
                    setFormState({
                        kind: "loaded",
                        data: amcQuestionnaireMappers[formType].mapEntityToFormState({
                            questionnaireFormEntity: formEntity,
                            editMode: isEditMode,
                            options: options,
                            amcQuestionnaire: questionnaire,
                            isViewOnlyMode: isViewOnlyMode,
                        }),
                    });
                }
                break;

            case "component-questionnaire":
                {
                    const componentQuestionnaire = questionnaire.componentQuestionnaires.find(
                        componentQuestionnaire => componentQuestionnaire.id === id
                    );
                    if (!componentQuestionnaire) {
                        setFormState({
                            kind: "error",
                            message: `Component Questionnaire with id ${id} not found`,
                        });
                        return;
                    }

                    const formEntity = getQuestionnaireFormEntity(formType, questions, componentQuestionnaire);
                    setQuestionnaireFormEntity(formEntity);
                    setFormLabels(formEntity.labels);
                    setFormState({
                        kind: "loaded",
                        data: amcQuestionnaireMappers[formType].mapEntityToFormState({
                            questionnaireFormEntity: formEntity,
                            editMode: isEditMode,
                            options: options,
                            amcQuestionnaire: questionnaire,
                            isViewOnlyMode: isViewOnlyMode,
                        }),
                    });
                }
                break;
            default:
                break;
        }
    }, [
        questions,
        compositionRoot.amcQuestionnaires,
        formType,
        id,
        isEditMode,
        options,
        orgUnitId,
        period,
        isViewOnlyMode,
        questionnaire,
    ]);

    return {
        formLabels,
        formState,
        setFormState,
        questionnaireFormEntity,
    };
}
