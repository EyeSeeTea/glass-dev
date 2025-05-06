import { useEffect, useState } from "react";
import { useAppContext } from "../contexts/app-context";
import {
    AMCQuestionnaireOptionsContext,
    AMCQuestionnaireOptionsContextState,
    defaultAMCQuestionnaireOptionsContextState,
} from "../contexts/amc-questionnaire-options-context";
import { Future } from "../../domain/entities/Future";

export const AMCQuestionnaireOptionsContextProvider: React.FC = ({ children }) => {
    const { compositionRoot } = useAppContext();
    const [amcQuestionnaireOptions, setAMCQuestionnaireOptions] = useState<AMCQuestionnaireOptionsContextState>(
        defaultAMCQuestionnaireOptionsContextState
    );

    useEffect(() => {
        return Future.joinObj({
            yesNoOptions: compositionRoot.amcQuestionnaires.getYesNoOptions(),
            yesNoUnknownOptions: compositionRoot.amcQuestionnaires.getYesNoUnknownOptions(),
            yesNoUnknownNAOptions: compositionRoot.amcQuestionnaires.getYesNoUnknownNAOptions(),
            antimicrobialClassOptions: compositionRoot.amcQuestionnaires.getAntimicrobialClassOptions(),
            healthLevelOptions: compositionRoot.amcQuestionnaires.getHealthLevelOptions(),
            healthSectorOptions: compositionRoot.amcQuestionnaires.getHealthSectorOptions(),
            proportion50to100Options: compositionRoot.amcQuestionnaires.getProportion50to100Options(),
        }).run(
            options => {
                setAMCQuestionnaireOptions(options);
            },
            error => {
                console.error("Error fetching AMC questionnaire options", error);
            }
        );
    }, [compositionRoot.amcQuestionnaires]);

    return (
        <AMCQuestionnaireOptionsContext.Provider value={amcQuestionnaireOptions}>
            {children}
        </AMCQuestionnaireOptionsContext.Provider>
    );
};
