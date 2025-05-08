import { useCallback, useMemo, useState } from "react";

import { useAMCQuestionnaireContext } from "../../../contexts/amc-questionnaire-context";
import { AMCQuestionnaire } from "../../../../domain/entities/amc-questionnaires/AMCQuestionnaire";
import { useAMCQuestionnaireOptionsContext } from "../../../contexts/amc-questionnaire-options-context";
import { QuestionnairesTableRow } from "../../questionnaires-table/QuestionnairesTable";
import { AMClassAMCQuestionnaire } from "../../../../domain/entities/amc-questionnaires/AMClassAMCQuestionnaire";
import { Id } from "../../../../domain/entities/Ref";
import { AMCQuestionnaireFormType } from "./presentation-entities/AMCQuestionnaireFormType";
import i18n from "../../../../locales";
import { Maybe } from "../../../../types/utils";

type QuestionnaireInfo = {
    formType: AMCQuestionnaireFormType;
    title: string;
    id?: Id;
};

type MainPageAMCQuestionnaireState = {
    questionnaire: Maybe<AMCQuestionnaire>;
    amClassQuestionnaireRows: QuestionnairesTableRow[];
    componentQuestionnaireRows: QuestionnairesTableRow[];
    isEditMode: boolean;
    isLoading: boolean;
    openQuestionnaire: QuestionnaireInfo | undefined;
    onClickAddOrEdit: () => void;
    onCancelForm: () => void;
    onSaveForm: () => void;
    onCloseQuestionnaireForm: () => void;
    openQuestionnaireForm: (formType: AMCQuestionnaireFormType, id?: Id) => void;
};

export function useMainPageAMCQuestionnaire(): MainPageAMCQuestionnaireState {
    const { questionnaire } = useAMCQuestionnaireContext();
    const formOptions = useAMCQuestionnaireOptionsContext();

    const [isEditMode, setIsEditMode] = useState(false);
    const [openQuestionnaire, setOpenQuestionnaire] = useState<QuestionnaireInfo | undefined>(undefined);

    const isLoading = useMemo(() => {
        return questionnaire === undefined || Object.values(formOptions).some(options => options.length === 0);
    }, [formOptions, questionnaire]);

    const amClassQuestionnaireRows = useMemo(() => {
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

    const componentQuestionnaireRows: QuestionnairesTableRow[] = useMemo(() => {
        return [];
    }, []);

    const onClickAddOrEdit = useCallback(() => setIsEditMode(true), []);

    const onCancelEditMode = useCallback(() => setIsEditMode(false), []);

    const openQuestionnaireForm = useCallback((formType: AMCQuestionnaireFormType, id?: Id) => {
        const title =
            formType === "am-class-questionnaire"
                ? i18n.t("AM Class Questionnaires")
                : i18n.t("Component Questionnaires");
        setOpenQuestionnaire({ formType: formType, id: id, title: title });
    }, []);

    const onCloseQuestionnaireForm = useCallback(() => setOpenQuestionnaire(undefined), []);

    return {
        questionnaire,
        amClassQuestionnaireRows,
        componentQuestionnaireRows,
        isEditMode,
        isLoading,
        openQuestionnaire,
        onClickAddOrEdit,
        onCancelForm: onCancelEditMode,
        onSaveForm: onCancelEditMode,
        onCloseQuestionnaireForm,
        openQuestionnaireForm,
    };
}
