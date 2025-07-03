import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../../../../../contexts/app-context";
import { Id } from "../../../../../../domain/entities/Ref";
import { Maybe } from "../../../../../../utils/ts-utils";
import {
    FormLables,
    GeneralAMCQuestionnaireFormEntity,
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
    questionnaireFormEntity: Maybe<GeneralAMCQuestionnaireFormEntity>;
};

export function useLoadGeneralAMCQuestionnaireForm(params: {
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
    const [questionnaireFormEntity, setQuestionnaireFormEntity] = useState<GeneralAMCQuestionnaireFormEntity>();

    const isEditMode = useMemo(() => !!id, [id]);
    const { loadEmptyForm } = useLoadEmptyQuestionnaireForm({
        formType: "general-questionnaire",
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
        const formEntity = getQuestionnaireFormEntity(
            "general-questionnaire",
            questions,
            questionnaire?.generalQuestionnaire
        );
        setQuestionnaireFormEntity(formEntity);
        setFormLabels(formEntity.labels);
        setFormState({
            kind: "loaded",
            data: amcQuestionnaireMappers["general-questionnaire"].mapEntityToFormState({
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
