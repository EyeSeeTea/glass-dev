import { useEffect, useState } from "react";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { useAppContext } from "../contexts/app-context";
import { Questionnaire } from "../../domain/entities/Questionnaire";

export function useProgramQuestionnaireForm(eventId: string | undefined) {
    const { compositionRoot } = useAppContext();
    const [questionnaire, setQuestionnaire] = useState<Questionnaire>();
    const [loading, setLoading] = useState<boolean>(false);
    const snackbar = useSnackbar();

    useEffect(() => {
        setLoading(true);
        if (!eventId) {
            //If Event id not specified, load an Empty Questionnaire form
            return compositionRoot.programQuestionnaires.getForm("").run(
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
            return compositionRoot.programQuestionnaires.getSignal(eventId).run(
                questionnaireWithData => {
                    console.debug(questionnaireWithData);
                    setQuestionnaire(questionnaireWithData);
                    setLoading(false);
                },
                err => {
                    snackbar.error(err);
                    setLoading(false);
                }
            );
        }
    }, [compositionRoot, snackbar, eventId]);

    return { questionnaire, setQuestionnaire, loading, setLoading };
}
