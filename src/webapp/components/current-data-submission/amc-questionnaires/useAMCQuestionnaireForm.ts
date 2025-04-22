import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppContext } from "../../../contexts/app-context";
import { Id } from "../../../../domain/entities/Ref";
import { FormFieldState } from "../../form/presentation-entities/FormFieldsState";
import { Maybe } from "../../../../utils/ts-utils";
import {
    FormLables,
    getQuestionnaireFormEntity,
    QuestionnaireFormEntity,
} from "./presentation-entities/QuestionnaireFormEntity";
import { FormState } from "../../form/presentation-entities/FormState";
import { AMCQuestionnaireFormType } from "./presentation-entities/AMCQuestionnaireFormType";
import { mapEntityToFormState } from "./mapEntityToFormState";
import { ModalData } from "../../form/Form";
import { AMCQuestionnaireQuestions } from "../../../../domain/entities/amc-questionnaires/AMCQuestionnaireQuestions";
import { useAMCQuestionnaireOptionsContext } from "../../../contexts/amc-questionnaire-options-context";
import { updateAndValidateFormState } from "../../form/presentation-entities/utils/updateAndValidateFormState";
import { mapFormStateToEntity } from "./mapFormStateToEntity";

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

export function useAMCQuestionnaireForm(params: {
    formType: AMCQuestionnaireFormType;
    id?: Id;
    orgUnitId: Id;
    period: string;
}): State {
    const { formType, id, orgUnitId, period } = params;

    const { compositionRoot } = useAppContext();
    const options = useAMCQuestionnaireOptionsContext();

    const [globalMessage, setGlobalMessage] = useState<Maybe<GlobalMessage>>();
    const [formState, setFormState] = useState<FormLoadState>({ kind: "loading" });
    const [formLabels, setFormLabels] = useState<FormLables>();
    const [isLoading, setIsLoading] = useState(false);
    const [questionnaireFormEntity, setQuestionnaireFormEntity] = useState<QuestionnaireFormEntity>();
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
                        compositionRoot.amcQuestionnaires.getGeneral(id, orgUnitId, period).run(
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
                                    data: mapEntityToFormState({
                                        questionnaireFormEntity: formEntity,
                                        editMode: isEditMode,
                                        options: options,
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
                    data: mapEntityToFormState({
                        questionnaireFormEntity: formEntity,
                        editMode: isEditMode,
                        options: options,
                    }),
                });
            }
        }
    }, [amcQuestions, compositionRoot.amcQuestionnaires, formType, id, isEditMode, options, orgUnitId, period]);

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
            const entity = mapFormStateToEntity({
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
                    compositionRoot.amcQuestionnaires.saveGeneral(entity).run(
                        _generalQuestionnaireId => {
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
        options,
        orgUnitId,
        period,
        questionnaireFormEntity,
    ]);

    const onCancelForm = useCallback(() => {}, []);

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
