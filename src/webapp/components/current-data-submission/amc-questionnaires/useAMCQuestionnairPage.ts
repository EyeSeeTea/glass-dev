import { useCallback, useMemo, useState } from "react";

import { useAMCQuestionnaireContext } from "../../../contexts/amc-questionnaire-context";
import { AMCQuestionnaire } from "../../../../domain/entities/amc-questionnaires/AMCQuestionnaire";
import { useAMCQuestionnaireOptionsContext } from "../../../contexts/amc-questionnaire-options-context";
import { QuestionnairesTableRow } from "../../questionnaires-table/QuestionnairesTable";
import { AMClassAMCQuestionnaire } from "../../../../domain/entities/amc-questionnaires/AMClassAMCQuestionnaire";
import { Id } from "../../../../domain/entities/Ref";
import { AMCQuestionnaireFormType } from "./presentation-entities/AMCQuestionnaireFormType";

type AMCQuestionnairPageState = {
    questionnaire: AMCQuestionnaire | null;
    questionnaireRows: QuestionnairesTableRow[];
    isEditMode: boolean;
    questionnaireIdToEdit?: Id;
    onClickAddOrEdit: (questionnaireIdToEdit?: Id) => void;
    onCancelForm: () => void;
    onSaveForm: () => void;
};

export function useAMCQuestionnairPage(formType: AMCQuestionnaireFormType, id?: Id): AMCQuestionnairPageState {
    const { questionnaire } = useAMCQuestionnaireContext();
    const formOptions = useAMCQuestionnaireOptionsContext();

    const [isEditMode, setIsEditMode] = useState(!!id);
    const [questionnaireIdToEdit, setQuestionnaireIdToEdit] = useState(id);

    const isLoading = useMemo(() => {
        return questionnaire === undefined || Object.values(formOptions).some(options => options.length === 0);
    }, [formOptions, questionnaire]);

    const questionnaireRows = useMemo(() => {
        if (isLoading || !questionnaire) {
            return [];
        }

        return questionnaire.amClassQuestionnaires.map(
            (amClassQuestionnaire: AMClassAMCQuestionnaire): QuestionnairesTableRow => {
                const amClassName =
                    formOptions.antimicrobialClassOptions.find(
                        option => option.code === amClassQuestionnaire.antimicrobialClass
                    )?.name || amClassQuestionnaire.antimicrobialClass;
                return {
                    id: amClassQuestionnaire.id,
                    name: amClassName,
                };
            }
        );
    }, [isLoading, questionnaire, formOptions]);

    const onClickAddOrEdit = useCallback((id?: Id) => {
        setIsEditMode(true);
        setQuestionnaireIdToEdit(id);
    }, []);

    const onCancelEditMode = useCallback(() => {
        setIsEditMode(false);
        setQuestionnaireIdToEdit(undefined);
    }, []);

    return {
        questionnaire,
        questionnaireRows,
        isEditMode,
        questionnaireIdToEdit,
        onClickAddOrEdit,
        onCancelForm: onCancelEditMode,
        onSaveForm: onCancelEditMode,
    };
}
