import React from "react";
import { AMClassAMCQuestionnaire } from "../../../../../domain/entities/amc-questionnaires/AMClassAMCQuestionnaire";
import { ComponentAMCQuestionnaire } from "../../../../../domain/entities/amc-questionnaires/ComponentAMCQuestionnaire";
import { GeneralAMCQuestionnaire } from "../../../../../domain/entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { Id } from "../../../../../domain/entities/Ref";
import { Maybe } from "../../../../../types/utils";
import { useAMCQuestionnaireContext } from "../../../../contexts/amc-questionnaire-context";
import { useAMCQuestionnaireOptionsContext } from "../../../../contexts/amc-questionnaire-options-context";
import { useAppContext } from "../../../../contexts/app-context";
import { amcQuestionnaireMappers } from "../mappers";
import { AMCQuestionnaireFormType } from "../presentation-entities/AMCQuestionnaireFormType";
import { QuestionnaireFormEntityMap } from "../presentation-entities/QuestionnaireFormEntity";
import { FormLoadState } from "./useAMCQuestionnaireForm";

type SaveOptions<T extends AMCQuestionnaireFormType> = {
    id: Maybe<Id>;
    orgUnitId: Id;
    period: string;
    questionnaireFormEntity: QuestionnaireFormEntityMap[T];
    formState: FormLoadState;
    onSave?: () => void;
};

type UseSaveAMCQuestionnaireFormOptions<T extends AMCQuestionnaireFormType> = {
    formType: T;
};

export function useSaveAMCQuestionnaireForm<T extends AMCQuestionnaireFormType>({
    formType,
}: UseSaveAMCQuestionnaireFormOptions<T>) {
    const [isLoading, setIsLoading] = React.useState(false);
    const { compositionRoot } = useAppContext();
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
                const entity = amcQuestionnaireMappers[formType].mapFormStateToEntity({
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
                            compositionRoot.amcQuestionnaires.saveAmClass(questionnaire, amClassQuestionnaire).run(
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
                        }
                        break;
                    default:
                        throw new Error(`Unsupported form type: ${formType}`);
                }
            } catch (error) {
                handleError(error);
            }
        },
        [options, setGlobalMessage, formType, compositionRoot.amcQuestionnaires, fetchQuestionnaire, questionnaire]
    );

    return {
        save,
        isLoading,
    };
}
