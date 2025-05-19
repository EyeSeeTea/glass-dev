import { useCallback, useEffect, useState } from "react";
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
    const [amcQuestionnaireIsLoading, setAMCQuestionnaireIsLoading] = useState(false);
    const [amcQuestionnaireError, setAMCQuestionnaireError] = useState<Maybe<Error>>(undefined);
    const [amcQuestionnaire, setAMCQuestionnaire] = useState<Maybe<AMCQuestionnaire>>(
        defaultAMCQuestionnaireContextState.questionnaire
    );
    const [amcQuestions, setAMCQuestions] = useState<Maybe<AMCQuestionnaireQuestions>>(
        defaultAMCQuestionnaireContextState.questions
    );

    const fetchQuestionnaire = useCallback(() => {
        setAMCQuestionnaireIsLoading(true);
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
                setAMCQuestionnaireIsLoading(false);
            },
            (error: unknown) => {
                console.error("Error fetching AMC Questionnaire and questions:", error);
                setAMCQuestionnaire(undefined);
                setAMCQuestions(undefined);
                setAMCQuestionnaireIsLoading(false);
                if (error instanceof Error) {
                    setAMCQuestionnaireError(error);
                }
            }
        );
    }, [compositionRoot.amcQuestionnaires, currentOrgUnitAccess.orgUnitId, currentPeriod]);

    useEffect(() => {
        const cancel = fetchQuestionnaire();
        return () => {
            cancel();
        };
    }, [fetchQuestionnaire]);

    return (
        <AMCQuestionnaireContext.Provider
            value={{
                fetchQuestionnaire,
                questionnaireIsLoading: amcQuestionnaireIsLoading,
                questionnaireError: amcQuestionnaireError,
                questionnaire: amcQuestionnaire,
                questions: amcQuestions,
            }}
        >
            {children}
        </AMCQuestionnaireContext.Provider>
    );
};
