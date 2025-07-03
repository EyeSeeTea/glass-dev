import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../../../../../contexts/app-context";
import { Id } from "../../../../../../domain/entities/Ref";
import { Maybe } from "../../../../../../utils/ts-utils";
import {
    ComponentAMCQuestionnaireFormEntity,
    FormLables,
    getQuestionnaireFormEntity,
} from "../../presentation-entities/QuestionnaireFormEntity";
import { useAMCQuestionnaireOptionsContext } from "../../../../../contexts/amc-questionnaire-options-context";
import { amcQuestionnaireMappers } from "../../mappers";
import { useAMCQuestionnaireContext } from "../../../../../contexts/amc-questionnaire-context";
import { FormLoadState } from "../../../../form/presentation-entities/FormState";
import { useLoadEmptyQuestionnaireForm } from "./useLoadEmptyQuestionnaireForm";

type State = {
    formLabels: Maybe<FormLables>;
    formState: FormLoadState;
    setFormState: (state: FormLoadState | ((prevState: FormLoadState) => FormLoadState)) => void;
    questionnaireFormEntity: Maybe<ComponentAMCQuestionnaireFormEntity>;
};

export function useLoadComponentAMCQuestionnaireForm(params: {
    id?: Id;
    orgUnitId: Id;
    period: string;
    isViewOnlyMode?: boolean;
}): State {
    const { id, orgUnitId, period, isViewOnlyMode = false } = params;

    const { compositionRoot } = useAppContext();
    const { questionnaire, questions } = useAMCQuestionnaireContext();
    const options = useAMCQuestionnaireOptionsContext();
    const [formState, setFormState] = useState<FormLoadState>({ kind: "loading" });
    const [formLabels, setFormLabels] = useState<FormLables>();
    const [questionnaireFormEntity, setQuestionnaireFormEntity] = useState<ComponentAMCQuestionnaireFormEntity>();

    const isEditMode = useMemo(() => !!id, [id]);
    const { loadEmptyForm } = useLoadEmptyQuestionnaireForm({
        formType: "component-questionnaire",
        setQuestionnaireFormEntity,
        setFormLabels,
        setFormState,
    });
    useEffect(() => {
        if (!questions || !options) {
            return;
        }
        if (!id || !questionnaire) {
            loadEmptyForm({
                questions,
                options,
                questionnaire,
                isViewOnlyMode,
            });
            return;
        }
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

        const formEntity = getQuestionnaireFormEntity("component-questionnaire", questions, componentQuestionnaire);
        setQuestionnaireFormEntity(formEntity);
        setFormLabels(formEntity.labels);
        setFormState({
            kind: "loaded",
            data: amcQuestionnaireMappers["component-questionnaire"].mapEntityToFormState({
                questionnaireFormEntity: formEntity,
                editMode: isEditMode,
                options: options,
                amcQuestionnaire: questionnaire,
                isViewOnlyMode: isViewOnlyMode,
            }),
        });
    }, [
        questions,
        compositionRoot.amcQuestionnaires,
        id,
        isEditMode,
        options,
        orgUnitId,
        period,
        isViewOnlyMode,
        questionnaire,
        loadEmptyForm,
    ]);

    return {
        formLabels,
        formState,
        setFormState,
        questionnaireFormEntity,
    };
}
