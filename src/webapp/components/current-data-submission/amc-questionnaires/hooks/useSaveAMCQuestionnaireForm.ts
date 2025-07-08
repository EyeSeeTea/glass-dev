import React from "react";
import { AMCQuestionnaire } from "../../../../../domain/entities/amc-questionnaires/AMCQuestionnaire";
import { FutureData } from "../../../../../domain/entities/Future";
import { Id } from "../../../../../domain/entities/Ref";
import { Maybe } from "../../../../../types/utils";
import { useAMCQuestionnaireContext } from "../../../../contexts/amc-questionnaire-context";
import { useAMCQuestionnaireOptionsContext } from "../../../../contexts/amc-questionnaire-options-context";
import { FormLoadState } from "../../../form/presentation-entities/FormState";
import { AMCQuestionnaireFormMapper } from "../mappers/mapperTypes";
import { AMCQuestionnaireFormType } from "../presentation-entities/AMCQuestionnaireFormType";
import { QuestionnaireFormEntityMap } from "../presentation-entities/QuestionnaireFormEntity";

type SaveOptions<T extends AMCQuestionnaireFormType> = {
    id: Maybe<Id>;
    orgUnitId: Id;
    period: string;
    questionnaireFormEntity: Extract<QuestionnaireFormEntityMap[T], { type: T }>;
    formState: FormLoadState;
    onSave?: () => void;
};

type UseSaveAMCQuestionnaireFormParams<T extends AMCQuestionnaireFormType> = {
    formType: T;
    mapper: AMCQuestionnaireFormMapper[T];
    saveFunction: (
        rootQuestionnaire: AMCQuestionnaire,
        questionnaire: Extract<QuestionnaireFormEntityMap[T], { type: T }>["entity"]
    ) => FutureData<Id>;
};

export function useSaveAMCQuestionnaireForm<T extends AMCQuestionnaireFormType>(
    params: UseSaveAMCQuestionnaireFormParams<T>
) {
    const { formType, mapper, saveFunction } = params;
    const [isLoading, setIsLoading] = React.useState(false);
    const { questionnaire, fetchQuestionnaire, setGlobalMessage } = useAMCQuestionnaireContext();
    const options = useAMCQuestionnaireOptionsContext();

    const save = React.useCallback(
        (saveOptions: SaveOptions<T>) => {
            const { id, formState, questionnaireFormEntity, orgUnitId, period, onSave } = saveOptions;
            // TODO: id is only used for isEditMode, consider removing it, or remove passing isEditMode altogether
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
                const entity = mapper.mapFormStateToEntity({
                    formState: formState.data,
                    formEntity: questionnaireFormEntity,
                    orgUnitId,
                    period,
                    editMode: !!id,
                    options: options,
                });

                if (!entity) {
                    throw new Error("Form entity is undefined");
                }
                if (!questionnaire) {
                    throw new Error(`${formType} needs to be added to a questionnaire`);
                }
                saveFunction(questionnaire, entity).run(
                    _componentQuestionnaireId => {
                        onSave && onSave();
                        setIsLoading(false);
                        fetchQuestionnaire();
                    },
                    error => {
                        handleError(error);
                    }
                );
            } catch (error) {
                handleError(error);
            }
        },
        [options, setGlobalMessage, formType, mapper, questionnaire, saveFunction, fetchQuestionnaire]
    );

    return {
        save,
        isLoading,
    };
}
