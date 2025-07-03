import React from "react";
import { ComponentAMCQuestionnaire } from "../../../../../../domain/entities/amc-questionnaires/ComponentAMCQuestionnaire";
import { Id } from "../../../../../../domain/entities/Ref";
import { Maybe } from "../../../../../../types/utils";
import { useAMCQuestionnaireContext } from "../../../../../contexts/amc-questionnaire-context";
import { useAMCQuestionnaireOptionsContext } from "../../../../../contexts/amc-questionnaire-options-context";
import { useAppContext } from "../../../../../contexts/app-context";
import { FormLoadState } from "../../../../form/presentation-entities/FormState";
import { amcQuestionnaireMappers } from "../../mappers";
import { ComponentAMCQuestionnaireFormEntity } from "../../presentation-entities/QuestionnaireFormEntity";

type SaveOptions = {
    id: Maybe<Id>;
    orgUnitId: Id;
    period: string;
    questionnaireFormEntity: ComponentAMCQuestionnaireFormEntity;
    formState: FormLoadState;
    onSave?: () => void;
};

export function useSaveComponentAMCQuestionnaireForm() {
    const [isLoading, setIsLoading] = React.useState(false);
    const { compositionRoot } = useAppContext();
    const { questionnaire, fetchQuestionnaire, setGlobalMessage } = useAMCQuestionnaireContext();
    const options = useAMCQuestionnaireOptionsContext();

    const save = React.useCallback(
        (saveOptions: SaveOptions) => {
            const { id, formState, questionnaireFormEntity, orgUnitId, period, onSave } = saveOptions;
            // TODO: id is only used for isEditMode, consider removing it, or remove passing isEditMode altogether
            if (formState.kind !== "loaded" || !questionnaireFormEntity || !formState.data.isValid || !options) return;

            const handleError = (error: unknown) => {
                console.error(error);
                setGlobalMessage({
                    type: "error",
                    text: `Error saving Component AMC Questionnaire: ${error}`,
                });
                setIsLoading(false);
            };

            try {
                setIsLoading(true);
                const entity = amcQuestionnaireMappers["component-questionnaire"].mapFormStateToEntity({
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
                const componentQuestionnaire = entity as ComponentAMCQuestionnaire;
                if (!questionnaire) {
                    throw new Error("Component needs to be added to questionnaire");
                }
                compositionRoot.amcQuestionnaires.saveComponent(questionnaire, componentQuestionnaire).run(
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
        [options, setGlobalMessage, compositionRoot.amcQuestionnaires, fetchQuestionnaire, questionnaire]
    );

    return {
        save,
        isLoading,
    };
}
