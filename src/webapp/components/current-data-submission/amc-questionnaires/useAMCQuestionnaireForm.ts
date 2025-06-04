import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppContext } from "../../../contexts/app-context";
import { Id } from "../../../../domain/entities/Ref";
import { FormFieldState } from "../../form/presentation-entities/FormFieldsState";
import { Maybe } from "../../../../utils/ts-utils";
import {
    FormLables,
    getQuestionnaireFormEntity,
    QuestionnaireFormEntityMap,
} from "./presentation-entities/QuestionnaireFormEntity";
import { FormState } from "../../form/presentation-entities/FormState";
import { AMCQuestionnaireFormType } from "./presentation-entities/AMCQuestionnaireFormType";
import { ModalData } from "../../form/Form";
import { useAMCQuestionnaireOptionsContext } from "../../../contexts/amc-questionnaire-options-context";
import { updateAndValidateFormState } from "../../form/presentation-entities/utils/updateAndValidateFormState";
import { GeneralAMCQuestionnaire } from "../../../../domain/entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { amcQuestionnaireMappers } from "./mappers";
import { useAMCQuestionnaireContext } from "../../../contexts/amc-questionnaire-context";
import { AMClassAMCQuestionnaire } from "../../../../domain/entities/amc-questionnaires/AMClassAMCQuestionnaire";
import { ComponentAMCQuestionnaire } from "../../../../domain/entities/amc-questionnaires/ComponentAMCQuestionnaire";

export type GlobalMessage = {
    text: string;
    type: "warning" | "success" | "error";
};

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

type State = {
    formLabels: Maybe<FormLables>;
    globalMessage: Maybe<GlobalMessage>;
    formState: FormLoadState;
    isLoading: boolean;
    handleFormChange: (updatedField: FormFieldState) => void;
    onClickSave: () => void;
    onCancelForm: () => void;
    onCopyForm: () => void;
    onAddToForm: () => void;
    onResetForm: () => void;
    openModal: boolean;
    modalData?: ModalData;
    setOpenModal: (open: boolean) => void;
};

export function useAMCQuestionnaireForm<T extends AMCQuestionnaireFormType>(params: {
    formType: T;
    id?: Id;
    orgUnitId: Id;
    period: string;
    isViewOnlyMode?: boolean;
    onSave?: () => void;
    onCancel?: () => void;
}): State {
    const { formType, id, orgUnitId, period, isViewOnlyMode = false, onSave, onCancel } = params;

    const { compositionRoot } = useAppContext();
    const { questionnaire, questions, fetchQuestionnaire } = useAMCQuestionnaireContext();
    const options = useAMCQuestionnaireOptionsContext();
    const [globalMessage, setGlobalMessage] = useState<Maybe<GlobalMessage>>();
    const [formState, setFormState] = useState<FormLoadState>({ kind: "loading" });
    const [formLabels, setFormLabels] = useState<FormLables>();
    const [isLoading, setIsLoading] = useState(false);
    const [questionnaireFormEntity, setQuestionnaireFormEntity] = useState<QuestionnaireFormEntityMap[T]>();
    const [openModal, setOpenModal] = useState(false);

    const isEditMode = useMemo(() => !!id, [id]);

    useEffect(() => {
        if (questions && options) {
            if (id && questionnaire) {
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
            } else {
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
            }
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

    const onClickSave = useCallback(() => {
        if (formState.kind !== "loaded" || !questionnaireFormEntity || !formState.data.isValid || !options) return;

        const handleError = (error: unknown) => {
            console.error(error);
            setGlobalMessage({
                type: "error",
                text: `Error saving ${formType} AMC Questionnaire: ${error}`,
            });
            setIsLoading(false);
        };

        try {
            setIsLoading(true);
            const entity = amcQuestionnaireMappers[formType].mapFormStateToEntity({
                formState: formState.data,
                formEntity: questionnaireFormEntity,
                orgUnitId,
                period,
                editMode: isEditMode,
                options: options,
            });

            if (!entity) {
                throw new Error("Form entity is undefined");
            }

            switch (formType) {
                case "general-questionnaire":
                    compositionRoot.amcQuestionnaires.saveGeneral(entity as GeneralAMCQuestionnaire).run(
                        _generalQuestionnaireId => {
                            onSave && onSave();
                            setIsLoading(false);
                            fetchQuestionnaire();
                        },
                        error => {
                            handleError(error);
                        }
                    );
                    break;

                case "am-class-questionnaire":
                    {
                        const amClassQuestionnaire = entity as AMClassAMCQuestionnaire;
                        if (!questionnaire) {
                            throw new Error("AM Class needs to be added to questionnaire");
                        }
                        const validationErrors = questionnaire
                            .addOrUpdateAMClassQuestionnaire(amClassQuestionnaire)
                            .match({
                                error: errors => errors,
                                success: () => [],
                            });
                        if (validationErrors.length > 0) {
                            throw new Error(`Validation errors: ${validationErrors.join(", ")}`);
                        }
                        compositionRoot.amcQuestionnaires.saveAmClass(questionnaire.id, amClassQuestionnaire).run(
                            _amClassQuestionnaireId => {
                                onSave && onSave();
                                setIsLoading(false);
                                fetchQuestionnaire();
                            },
                            error => {
                                handleError(error);
                            }
                        );
                    }
                    break;

                case "component-questionnaire":
                    {
                        const componentQuestionnaire = entity as ComponentAMCQuestionnaire;
                        if (!questionnaire) {
                            throw new Error("Component needs to be added to questionnaire");
                        }
                        const validationErrors = questionnaire
                            .addOrUpdateComponentQuestionnaire(componentQuestionnaire)
                            .match({
                                error: errors => errors,
                                success: () => [],
                            });
                        if (validationErrors.length > 0) {
                            throw new Error(`Validation errors: ${validationErrors.join(", ")}`);
                        }
                        compositionRoot.amcQuestionnaires.saveComponent(questionnaire.id, componentQuestionnaire).run(
                            _componentQuestionnaireId => {
                                onSave && onSave();
                                setIsLoading(false);
                                fetchQuestionnaire();
                            },
                            error => {
                                handleError(error);
                            }
                        );
                    }
                    break;
                default:
                    throw new Error(`Unsupported form type: ${formType}`);
            }
        } catch (error) {
            handleError(error);
        }
    }, [
        compositionRoot.amcQuestionnaires,
        formState,
        formType,
        isEditMode,
        onSave,
        options,
        orgUnitId,
        period,
        questionnaireFormEntity,
        questionnaire,
        fetchQuestionnaire,
    ]);

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
        globalMessage,
        formState,
        isLoading,
        handleFormChange,
        onClickSave,
        onCancelForm,
        onCopyForm,
        onAddToForm,
        onResetForm,
        openModal,
        setOpenModal,
    };
}
