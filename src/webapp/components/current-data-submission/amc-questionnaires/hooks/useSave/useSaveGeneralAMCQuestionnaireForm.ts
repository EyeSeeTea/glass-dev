import React from "react";
import { GeneralAMCQuestionnaire } from "../../../../../../domain/entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { Id } from "../../../../../../domain/entities/Ref";
import { Maybe } from "../../../../../../types/utils";
import { useAMCQuestionnaireContext } from "../../../../../contexts/amc-questionnaire-context";
import { useAMCQuestionnaireOptionsContext } from "../../../../../contexts/amc-questionnaire-options-context";
import { useAppContext } from "../../../../../contexts/app-context";
import { FormLoadState } from "../../../../form/presentation-entities/FormState";
import { amcQuestionnaireMappers } from "../../mappers";
import { GeneralAMCQuestionnaireFormEntity } from "../../presentation-entities/QuestionnaireFormEntity";

type SaveOptions = {
    id: Maybe<Id>;
    orgUnitId: Id;
    period: string;
    questionnaireFormEntity: GeneralAMCQuestionnaireFormEntity;
    formState: FormLoadState;
    onSave?: () => void;
};

export function useSaveGeneralAMCQuestionnaireForm() {
    const [isLoading, setIsLoading] = React.useState(false);
    const { compositionRoot } = useAppContext();
    const { fetchQuestionnaire, setGlobalMessage } = useAMCQuestionnaireContext();
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
                    text: `Error saving General AMC Questionnaire: ${error}`,
                });
                setIsLoading(false);
            };

            try {
                setIsLoading(true);
                const entity = amcQuestionnaireMappers["general-questionnaire"].mapFormStateToEntity({
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
            } catch (error) {
                handleError(error);
            }
        },
        [options, setGlobalMessage, compositionRoot.amcQuestionnaires, fetchQuestionnaire]
    );

    return {
        save,
        isLoading,
    };
}
