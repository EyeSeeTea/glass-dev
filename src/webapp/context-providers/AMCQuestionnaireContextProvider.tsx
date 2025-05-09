import { useEffect, useState } from "react";
import { useAppContext } from "../contexts/app-context";
import { AMCQuestionnaireContext, defaultAMCQuestionnaireContextState } from "../contexts/amc-questionnaire-context";
import { AMCQuestionnaire } from "../../domain/entities/amc-questionnaires/AMCQuestionnaire";
import { useCurrentPeriodContext } from "../contexts/current-period-context";
import { useCurrentOrgUnitContext } from "../contexts/current-orgUnit-context";
import { Maybe } from "../../types/utils";
import { Future } from "../../domain/entities/Future";
import { AMCQuestionnaireQuestions } from "../../domain/entities/amc-questionnaires/AMCQuestionnaireQuestions";

export const AMCQuestionnaireContextProvider: React.FC = ({ children }) => {
    const { compositionRoot } = useAppContext();
    const { currentPeriod } = useCurrentPeriodContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();

    const [amcQuestionnaire, setAMCQuestionnaire] = useState<Maybe<AMCQuestionnaire>>(
        defaultAMCQuestionnaireContextState.questionnaire
    );
    const [amcQuestions, setAMCQuestions] = useState<Maybe<AMCQuestionnaireQuestions>>(
        defaultAMCQuestionnaireContextState.questions
    );

    useEffect(() => {
        return Future.joinObj({
            amcQuestionnaireResponse: compositionRoot.amcQuestionnaires.getByOrgUnitAndPeriod(
                currentOrgUnitAccess.orgUnitId,
                currentPeriod
            ),
            amcQuestionsResponse: compositionRoot.amcQuestionnaires.getQuestions(),
        }).run(
            ({ amcQuestionnaireResponse, amcQuestionsResponse }) => {
                setAMCQuestionnaire(amcQuestionnaireResponse);
                setAMCQuestions(amcQuestionsResponse);
            },
            error => {
                console.error("Error fetching AMC Questionnaire and questions:", error);
                setAMCQuestionnaire(undefined);
                setAMCQuestions(undefined);
            }
        );
    }, [compositionRoot.amcQuestionnaires, currentOrgUnitAccess.orgUnitId, currentPeriod]);

    return (
        <AMCQuestionnaireContext.Provider value={{ questionnaire: amcQuestionnaire, questions: amcQuestions }}>
            {children}
        </AMCQuestionnaireContext.Provider>
    );
};
