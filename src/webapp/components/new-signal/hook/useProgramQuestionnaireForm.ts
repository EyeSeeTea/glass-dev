import { useEffect, useState } from "react";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { useAppContext } from "../../../contexts/app-context";
import { Questionnaire } from "../../../../domain/entities/Questionnaire";
import { useCurrentModuleContext } from "../../../contexts/current-module-context";
import { NamedRef } from "../../../../domain/entities/Ref";

export function useProgramQuestionnaireForm(questionnaireId: string, eventId?: string, subQuestionnaires?: NamedRef[]) {
    const { compositionRoot } = useAppContext();
    const [questionnaire, setQuestionnaire] = useState<Questionnaire>();
    const [loading, setLoading] = useState<boolean>(false);
    const { currentModuleAccess } = useCurrentModuleContext();

    const snackbar = useSnackbar();

    useEffect(() => {
        setLoading(true);
        if (!eventId) {
            //If Event id not specified, load an Empty Questionnaire form
            return compositionRoot.programQuestionnaires
                .getForm(questionnaireId, currentModuleAccess.moduleName, subQuestionnaires)
                .run(
                    questionnaireForm => {
                        setQuestionnaire(questionnaireForm);
                        setLoading(false);
                    },
                    err => {
                        snackbar.error(err);
                        setLoading(false);
                    }
                );
        } else {
            //If Event Id has been specified, pre-populate event data in Questionnaire form
            return compositionRoot.programQuestionnaires
                .getPopulatedForm(eventId, currentModuleAccess.moduleName, subQuestionnaires)
                .run(
                    questionnaireWithData => {
                        setQuestionnaire(questionnaireWithData);
                        setLoading(false);
                    },
                    err => {
                        snackbar.error(err);
                        setLoading(false);
                    }
                );
        }
    }, [compositionRoot, snackbar, eventId, questionnaireId, currentModuleAccess.moduleName, subQuestionnaires]);

    return { questionnaire, setQuestionnaire, loading, setLoading };
}
