import { useCallback, useState } from "react";
import { Id } from "../../../../../domain/entities/Ref";
import { FormFieldState } from "../../../form/presentation-entities/FormFieldsState";
import { Maybe } from "../../../../../utils/ts-utils";
import { FormLables, QuestionnaireFormEntityMap } from "../presentation-entities/QuestionnaireFormEntity";
import { AMCQuestionnaireFormType } from "../presentation-entities/AMCQuestionnaireFormType";
import { ModalData } from "../../../form/Form";
import { updateAndValidateFormState } from "../../../form/presentation-entities/utils/updateAndValidateFormState";
import { FormLoadState, useLoadAMCQuestionnaireForm } from "./useLoadAMCQuestionnaireForm";

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

    const [openModal, setOpenModal] = useState(false);

    const { formLabels, formState, setFormState, questionnaireFormEntity } = useLoadAMCQuestionnaireForm({
        formType,
        id,
        orgUnitId,
        period,
        isViewOnlyMode,
    });

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
        [questionnaireFormEntity, setFormState]
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
