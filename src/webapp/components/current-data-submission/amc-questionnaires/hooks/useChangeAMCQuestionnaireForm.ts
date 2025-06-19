import React from "react";
import { Maybe } from "../../../../../types/utils";
import { FormFieldState } from "../../../form/presentation-entities/FormFieldsState";
import { updateAndValidateFormState } from "../../../form/presentation-entities/utils/updateAndValidateFormState";
import { AMCQuestionnaireFormType } from "../presentation-entities/AMCQuestionnaireFormType";
import { QuestionnaireFormEntityMap } from "../presentation-entities/QuestionnaireFormEntity";
import { FormLoadState } from "./useLoadAMCQuestionnaireForm";

export function useChangeAMCQuestionnaireForm<T extends AMCQuestionnaireFormType>(params: {
    setFormState: React.Dispatch<React.SetStateAction<FormLoadState>>;
    questionnaireFormEntity: Maybe<QuestionnaireFormEntityMap[T]>;
}) {
    const { setFormState, questionnaireFormEntity } = params;

    const handleFormChange = React.useCallback(
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

    return {
        handleFormChange,
    };
}
