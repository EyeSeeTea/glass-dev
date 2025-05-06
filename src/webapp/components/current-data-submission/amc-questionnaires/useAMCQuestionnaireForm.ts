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
import { AMCQuestionnaireQuestions } from "../../../../domain/entities/amc-questionnaires/AMCQuestionnaireQuestions";
import { useAMCQuestionnaireOptionsContext } from "../../../contexts/amc-questionnaire-options-context";
import { updateAndValidateFormState } from "../../form/presentation-entities/utils/updateAndValidateFormState";
import { GeneralAMCQuestionnaire } from "../../../../domain/entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { amcQuestionnaireMappers } from "./mappers";

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
    const options = useAMCQuestionnaireOptionsContext();

    const [globalMessage, setGlobalMessage] = useState<Maybe<GlobalMessage>>();
    const [formState, setFormState] = useState<FormLoadState>({ kind: "loading" });
    const [formLabels, setFormLabels] = useState<FormLables>();
    const [isLoading, setIsLoading] = useState(false);
    const [questionnaireFormEntity, setQuestionnaireFormEntity] = useState<QuestionnaireFormEntityMap[T]>();
    const [amcQuestions, setAMCQuestions] = useState<AMCQuestionnaireQuestions>();
    const [openModal, setOpenModal] = useState(false);
    const [modalData, setModalData] = useState<ModalData>();

    const isEditMode = useMemo(() => !!id, [id]);

    useEffect(() => {
        if (!amcQuestions && formState.kind !== "loaded") {
            setIsLoading(true);
            compositionRoot.amcQuestionnaires.getQuestions().run(
                questions => {
                    setAMCQuestions(questions);
                    setIsLoading(false);
                },
                error => {
                    setAMCQuestions(undefined);
                    console.debug(error);
                    setGlobalMessage({
                        type: "error",
                        text: `Error loading General AMC Questions: ${error}`,
                    });
                    setIsLoading(false);
                }
            );
        }
    }, [amcQuestions, compositionRoot.amcQuestionnaires, formState.kind]);

    useEffect(() => {
        if (amcQuestions && options) {
            if (id) {
                switch (formType) {
                    case "general-questionnaire":
                        compositionRoot.amcQuestionnaires.getGeneralById(id, orgUnitId, period).run(
                            generalAMCQuestionnaire => {
                                const formEntity = getQuestionnaireFormEntity(
                                    formType,
                                    amcQuestions,
                                    generalAMCQuestionnaire
                                );
                                setQuestionnaireFormEntity(formEntity);
                                setFormLabels(formEntity.labels);
                                setFormState({
                                    kind: "loaded",
                                    data: amcQuestionnaireMappers[formType].mapEntityToFormState({
                                        questionnaireFormEntity: formEntity,
                                        editMode: isEditMode,
                                        options: options,
                                        isViewOnlyMode: isViewOnlyMode,
                                    }),
                                });
                            },
                            error => {
                                console.debug(error);
                                setGlobalMessage({
                                    type: "error",
                                    text: `Error loading General AMC Questionnaire: ${error}`,
                                });
                            }
                        );
                        break;
                    default:
                        break;
                }
            } else {
                const formEntity = getQuestionnaireFormEntity(formType, amcQuestions);
                setQuestionnaireFormEntity(formEntity);
                setFormLabels(formEntity.labels);
                setFormState({
                    kind: "loaded",
                    data: amcQuestionnaireMappers[formType].mapEntityToFormState({
                        questionnaireFormEntity: formEntity,
                        editMode: isEditMode,
                        options: options,
                        isViewOnlyMode: isViewOnlyMode,
                    }),
                });
            }
        }
    }, [
        amcQuestions,
        compositionRoot.amcQuestionnaires,
        formType,
        id,
        isEditMode,
        options,
        orgUnitId,
        period,
        isViewOnlyMode,
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

        try {
            const entity = amcQuestionnaireMappers[formType].mapFormStateToEntity({
                formState: formState.data,
                formEntity: questionnaireFormEntity,
                orgUnitId,
                period,
                editMode: isEditMode,
                options: options,
            });

            if (!entity) {
                setGlobalMessage({
                    type: "error",
                    text: `Error saving AMC Questionnaire: ${formType}`,
                });
                return;
            }

            switch (formType) {
                case "general-questionnaire":
                    setIsLoading(true);
                    compositionRoot.amcQuestionnaires.saveGeneral(entity as GeneralAMCQuestionnaire).run(
                        _generalQuestionnaireId => {
                            onSave && onSave();
                            setIsLoading(false);
                        },
                        error => {
                            console.debug(error);
                            setGlobalMessage({
                                type: "error",
                                text: `Error saving General AMC Questions: ${error}`,
                            });
                            setIsLoading(false);
                        }
                    );
                    break;
                default:
                    setGlobalMessage({
                        type: "error",
                        text: `Error saving AMC Questionnaire: ${formType} not supported`,
                    });
                    break;
            }
        } catch (error) {
            console.error(error);
            setGlobalMessage({
                type: "error",
                text: `Error saving AMC Questionnaire: ${error}`,
            });
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
        modalData,
        setOpenModal,
    };
}
