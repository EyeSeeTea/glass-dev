import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppContext } from "../../../../contexts/app-context";
import { Id } from "../../../../../domain/entities/Ref";
import { FormFieldState } from "../../../form/presentation-entities/FormFieldsState";
import { Maybe } from "../../../../../utils/ts-utils";
import {
    FormLables,
    getQuestionnaireFormEntity,
    QuestionnaireFormEntityMap,
} from "../presentation-entities/QuestionnaireFormEntity";
import { FormState } from "../../../form/presentation-entities/FormState";
import { AMCQuestionnaireFormType } from "../presentation-entities/AMCQuestionnaireFormType";
import { ModalData } from "../../../form/Form";
import { useAMCQuestionnaireOptionsContext } from "../../../../contexts/amc-questionnaire-options-context";
import { updateAndValidateFormState } from "../../../form/presentation-entities/utils/updateAndValidateFormState";
import { amcQuestionnaireMappers } from "../mappers";
import { useAMCQuestionnaireContext } from "../../../../contexts/amc-questionnaire-context";

export type FormStateLoaded = {
    kind: "loaded";
    data: FormState;
};

export type FormStateLoading = {
    kind: "loading";
};

export type FormStateError = {
    kind: "error";
    message: string;
};

export type FormLoadState = FormStateLoaded | FormStateLoading | FormStateError;

type State<T extends AMCQuestionnaireFormType> = {
    formLabels: Maybe<FormLables>;
    formState: FormLoadState;
    handleFormChange: (updatedField: FormFieldState) => void;
    onCancelForm: () => void;
    onCopyForm: () => void;
    onAddToForm: () => void;
    onResetForm: () => void;
    openModal: boolean;
    modalData?: ModalData;
    setOpenModal: (open: boolean) => void;
    questionnaireFormEntity: Maybe<QuestionnaireFormEntityMap[T]>;
};

export function useAMCQuestionnaireForm<T extends AMCQuestionnaireFormType>(params: {
    formType: T;
    id?: Id;
    orgUnitId: Id;
    period: string;
    isViewOnlyMode?: boolean;
    onCancel?: () => void;
}): State<T> {
    const { formType, id, orgUnitId, period, isViewOnlyMode = false, onCancel } = params;

    const { compositionRoot } = useAppContext();
    const { questionnaire, questions } = useAMCQuestionnaireContext();
    const options = useAMCQuestionnaireOptionsContext();
    const [formState, setFormState] = useState<FormLoadState>({ kind: "loading" });
    const [formLabels, setFormLabels] = useState<FormLables>();
    const [questionnaireFormEntity, setQuestionnaireFormEntity] = useState<QuestionnaireFormEntityMap[T]>();
    const [openModal, setOpenModal] = useState(false);

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

    const handleFormChange = useCallback(
        (updatedField: FormFieldState) => {
            setFormState(prevState => {
                if (prevState.kind === "loaded" && questionnaireFormEntity) {
                    const updatedData = updateAndValidateFormState(
                        prevState.data,
                        updatedField,
                        questionnaireFormEntity
                    );
                    return {
                        kind: "loaded" as const,
                        data: updatedData,
                    };
                } else {
                    return prevState;
                }
            });
        },
        [questionnaireFormEntity]
    );

    const onCancelForm = useCallback(() => {
        if (onCancel) {
            onCancel();
        }
    }, [onCancel]);

    const onCopyForm = useCallback(() => {}, []);

    const onAddToForm = useCallback(() => {}, []);

    const onResetForm = useCallback(() => {}, []);

    return {
        formLabels,
        formState,
        handleFormChange,
        onCancelForm,
        onCopyForm,
        onAddToForm,
        onResetForm,
        openModal,
        setOpenModal,
        questionnaireFormEntity,
    };
}
