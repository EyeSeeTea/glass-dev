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
    onPrimaryButtonClick: () => void;
    onCancelForm: () => void;
};

export function useAMCQuestionnaireForm(params: {
    formType: AMCQuestionnaireFormType;
    id?: Id;
    orgUnitId: Id;
    period: string;
}): State {
    const { formType, id, orgUnitId, period } = params;

    const { compositionRoot } = useAppContext();

    const [globalMessage, setGlobalMessage] = useState<Maybe<GlobalMessage>>();
    const [formState, setFormState] = useState<FormLoadState>({ kind: "loading" });
    const [formLabels, setFormLabels] = useState<FormLables>();
    const [isLoading, setIsLoading] = useState(false);
    const [questionnaireFormEntity, setQuestionnaireFormEntity] = useState<QuestionnaireFormEntity>();

    const isEditMode = useMemo(() => !!id, [id]);

    useEffect(() => {
        if (id) {
            switch (formType) {
                case "general-questionnaire":
                    compositionRoot.amcQuestionnaires.getGeneral(id, orgUnitId, period).run(
                        generalAMCQuestionnaire => {
                            const formEntity = getQuestionnaireFormEntity(formType, generalAMCQuestionnaire);
                            setQuestionnaireFormEntity(formEntity);
                            setFormLabels(formEntity.labels);
                            setFormState({
                                kind: "loaded",
                                data: mapEntityToFormState({
                                    questionnaireFormEntity: formEntity,
                                    editMode: isEditMode,
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
            const formEntity = getQuestionnaireFormEntity(formType);
            setQuestionnaireFormEntity(formEntity);
            setFormLabels(formEntity.labels);
            setFormState({
                kind: "loaded",
                data: mapEntityToFormState({
                    questionnaireFormEntity: formEntity,
                    editMode: isEditMode,
                }),
            });
        }
    }, [compositionRoot.amcQuestionnaires, formType, id, isEditMode, orgUnitId, period]);

    const handleFormChange = useCallback((updatedField: FormFieldState) => {
        // setFormState(prevState => {
        //     if (prevState.kind === "loaded" && configurableForm) {
        //         const updatedData = updateAndValidateFormState(prevState.data, updatedField, configurableForm);
        //         return {
        //             kind: "loaded" as const,
        //             data: updatedData,
        //         };
        //     } else {
        //         return prevState;
        //     }
        // });
    }, []);

    const onPrimaryButtonClick = useCallback(() => {}, []);

    const onCancelForm = useCallback(() => {}, []);

    return {
        formLabels,
        globalMessage,
        formState,
        isLoading,
        handleFormChange,
        onPrimaryButtonClick,
        onCancelForm,
    };
}
