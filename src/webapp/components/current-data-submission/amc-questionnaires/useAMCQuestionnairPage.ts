import { useCallback, useMemo, useState } from "react";

import { AMCQuestionnaire } from "../../../../domain/entities/amc-questionnaires/AMCQuestionnaire";
import { useAMCQuestionnaireOptionsContext } from "../../../contexts/amc-questionnaire-options-context";
import { QuestionnairesTableRow } from "../../questionnaires-table/QuestionnairesTable";
import { AMClassAMCQuestionnaire } from "../../../../domain/entities/amc-questionnaires/AMClassAMCQuestionnaire";
import { Id } from "../../../../domain/entities/Ref";
import { AMCQuestionnaireFormType } from "./presentation-entities/AMCQuestionnaireFormType";
import i18n from "../../../../locales";

type AMCQuestionnairPageState = {
    questionnaireRows: QuestionnairesTableRow[];
    tableTitle: string;
    disabledAddNewQuestionnaire: boolean;
    isEditMode: boolean;
    questionnaireIdToEdit?: Id;
    onClickAddOrEdit: (questionnaireIdToEdit?: Id) => void;
    onCancelForm: () => void;
    onSaveForm: () => void;
};

export function useAMCQuestionnairPage(options: {
    formType: AMCQuestionnaireFormType;
    questionnaire: AMCQuestionnaire;
    openQuestionnaireId?: Id;
}): AMCQuestionnairPageState {
    const { formType, questionnaire, openQuestionnaireId } = options;
    const formOptions = useAMCQuestionnaireOptionsContext();

    const [isEditMode, setIsEditMode] = useState(true);
    const [questionnaireIdToEdit, setQuestionnaireIdToEdit] = useState(openQuestionnaireId);

    const isLoading = useMemo(() => {
        return questionnaire === undefined || Object.values(formOptions).some(options => options.length === 0);
    }, [formOptions, questionnaire]);

    const questionnaireRows = useMemo(() => {
        if (isLoading || !questionnaire) {
            return [];
        }

        if (formType === "component-questionnaire") {
            return questionnaire.componentQuestionnaires.map((componentQuestionnaire): QuestionnairesTableRow => {
                return {
                    id: componentQuestionnaire.id,
                    name: componentQuestionnaire.getTitle(formOptions),
                };
            });
        }

        if (formType === "am-class-questionnaire") {
            return questionnaire.amClassQuestionnaires.map(
                (amClassQuestionnaire: AMClassAMCQuestionnaire): QuestionnairesTableRow => {
                    return {
                        id: amClassQuestionnaire.id,
                        name: amClassQuestionnaire.getTitle(formOptions),
                    };
                }
            );
        }

        return [];
    }, [isLoading, questionnaire, formType, formOptions]);

    const tableTitle = useMemo(
        () =>
            formType === "am-class-questionnaire"
                ? i18n.t("AM Questionnaire Editor")
                : i18n.t("Component Questionnaire Editor"),
        [formType]
    );

    const disabledAddNewQuestionnaire = useMemo(
        () =>
            formType === "am-class-questionnaire"
                ? !questionnaire.canAddAMClassQuestionnaire()
                : !questionnaire.canAddComponentQuestionnaire(),
        [formType, questionnaire]
    );

    const onClickAddOrEdit = useCallback((id?: Id) => {
        setIsEditMode(true);
        setQuestionnaireIdToEdit(id);
    }, []);

    const onCancelEditMode = useCallback(() => {
        setIsEditMode(false);
        setQuestionnaireIdToEdit(undefined);
    }, []);

    return {
        questionnaireRows,
        tableTitle,
        disabledAddNewQuestionnaire,
        isEditMode,
        questionnaireIdToEdit,
        onClickAddOrEdit,
        onCancelForm: onCancelEditMode,
        onSaveForm: onCancelEditMode,
    };
}
