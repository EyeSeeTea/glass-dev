import { useSnackbar } from "@eyeseetea/d2-ui-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { Button, LinearProgress } from "@material-ui/core";
import React, { Dispatch, SetStateAction } from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import { Id } from "../../../domain/entities/Base";
import { QuestionnaireBase } from "../../../domain/entities/Questionnaire";
import { useAppContext } from "../../contexts/app-context";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useGlassCaptureAccess } from "../../hooks/useGlassCaptureAccess";
import { useGlassModule } from "../../hooks/useGlassModule";
import { useGlassReadAccess } from "../../hooks/useGlassReadAccess";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import QuestionnarieForm, { QuestionnarieFormProps } from "../questionnaire/QuestionnaireForm";
import { useCurrentDataSubmissionId } from "../../hooks/useCurrentDataSubmissionId";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { DataSubmissionStatusTypes } from "../../../domain/entities/GlassDataSubmission";
import { useStatusDataSubmission } from "../../hooks/useStatusDataSubmission";

interface QuestionnairesProps {
    setRefetchStatus: Dispatch<SetStateAction<DataSubmissionStatusTypes | undefined>>;
}
export const Questionnaires: React.FC<QuestionnairesProps> = ({ setRefetchStatus }) => {
    const { compositionRoot } = useAppContext();
    const hasCurrentUserCaptureAccess = useGlassCaptureAccess();
    const hasCurrentUserViewAccess = useGlassReadAccess();
    const [questionnaires, updateQuestionnarie] = useQuestionnaires();
    const { orgUnit, year } = useSelector();
    const [formState, actions] = useFormState();
    const { currentModuleAccess } = useCurrentModuleContext();
    const dataSubmissionId = useCurrentDataSubmissionId(
        compositionRoot,
        currentModuleAccess.moduleId,
        orgUnit.id,
        year
    );

    const currentDataSubmissionStatus = useStatusDataSubmission(currentModuleAccess.moduleId, orgUnit.id, year);

    const validateAndUpdateStatus = (complete: boolean, questionnaireId: string) => {
        //If Questionnaire has been set to complete/not complete, check if data submission status needs to be updated
        if (complete) {
            const allMandatoryQuestionnairesCompleted = questionnaires
                ?.filter(mq => mq.isMandatory && mq.id !== questionnaireId)
                .every(q => q.isCompleted);
            if (allMandatoryQuestionnairesCompleted) {
                //Set the status of data Submission to "COMPLETE"
                compositionRoot.glassDataSubmission.setStatus(dataSubmissionId, "COMPLETE").run(
                    () => {
                        //Triggerring relaod of status in parent
                        setRefetchStatus("COMPLETE");
                    },
                    () => {}
                );
            }
        } else {
            const mandatoryQuestionnaireIncomplete = questionnaires?.find(q => q.id === questionnaireId)?.isMandatory;
            if (mandatoryQuestionnaireIncomplete) {
                compositionRoot.glassDataSubmission.setStatus(dataSubmissionId, "NOT_COMPLETED").run(
                    () => {
                        //Triggerring relaod of status in parent
                        setRefetchStatus("NOT_COMPLETED");
                    },
                    () => {}
                );
            }
        }
    };

    if (!questionnaires) {
        return <LinearProgress />;
    } else if (formState.mode !== "closed") {
        return (
            <QuestionnarieForm
                id={formState.id}
                orgUnitId={orgUnit.id}
                year={year}
                onBackClick={actions.closeQuestionnarie}
                mode={formState.mode}
                onSave={updateQuestionnarie}
                validateAndUpdateDataSubmissionStatus={validateAndUpdateStatus}
            />
        );
    } else {
        return (
            <QuestionnairesGrid>
                {questionnaires.length === 0 && <h3>{i18n.t("There are no questionnaries for this module")}</h3>}

                {questionnaires.map(questionnaire => (
                    <QuestionnaireCard key={questionnaire.id}>
                        <div className="head">
                            <h3 style={{ wordBreak: "break-all" }}>{questionnaire.name}</h3>
                            <span className="desc">{questionnaire.description}</span>
                        </div>

                        {questionnaire.isMandatory && <span className="mand">{i18n.t("mandatory")}</span>}

                        {questionnaire.isCompleted ? (
                            <span className="comp completed">{i18n.t("Completed")}</span>
                        ) : (
                            <span className="comp">{i18n.t("Not completed")}</span>
                        )}

                        <div className="buttons">
                            {questionnaire.isCompleted && (
                                <Button
                                    onClick={() => actions.goToQuestionnarie(questionnaire, { mode: "show" })}
                                    disabled={!hasCurrentUserViewAccess}
                                >
                                    {i18n.t("View")}
                                </Button>
                            )}

                            {currentDataSubmissionStatus.kind === "loaded" &&
                                (currentDataSubmissionStatus.data.title === "NOT COMPLETED" ||
                                    currentDataSubmissionStatus.data.title === "DATA TO BE APROVED BY COUNTRY" ||
                                    currentDataSubmissionStatus.data.title === "REJECTED BY WHO" ||
                                    currentDataSubmissionStatus.data.title === "DATA UPDATE REQUEST ACCEPTED") && (
                                    <>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            disabled={!hasCurrentUserCaptureAccess}
                                            onClick={() => actions.goToQuestionnarie(questionnaire, { mode: "edit" })}
                                        >
                                            {i18n.t("Go")}
                                        </Button>
                                    </>
                                )}
                        </div>
                    </QuestionnaireCard>
                ))}
            </QuestionnairesGrid>
        );
    }
};

const QuestionnairesGrid = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 30px;
    .head {
        * {
            display: block;
        }
    }
    .mand {
        margin: 0 0 0 auto;
    }
    .comp {
        width: 100%;
        text-transform: uppercase;
        font-size: 12px;
        color: ${glassColors.orange};
        &.completed {
            color: ${glassColors.green};
        }
    }
    .buttons {
        margin: 20px 0 0 auto;
        display: flex;
        gap: 10px;
        button {
            padding: 8px 16px;
        }
    }
`;

const QuestionnaireCard = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10px;
    padding: 20px;
    width: calc(50% - 60px);
    box-shadow: rgb(0 0 0 / 12%) 0px 1px 6px, rgb(0 0 0 / 12%) 0px 1px 4px;
    .mand {
        text-transform: uppercase;
        font-size: 12px;
        font-weight: 500;
        color: ${glassColors.mainPrimary};
    }
`;

// This should be probably abstracted to a common hook (with a more descriptive name)
function useSelector() {
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const { orgUnitId, orgUnitName } = currentOrgUnitAccess;
    const orgUnit = React.useMemo(() => ({ id: orgUnitId, name: orgUnitName }), [orgUnitId, orgUnitName]);

    const location = useLocation();
    const queryParameters = new URLSearchParams(location.search);
    const periodFromUrl = parseInt(queryParameters.get("period") || "");
    const year = periodFromUrl || new Date().getFullYear() - 1;

    return { orgUnit, year };
}

function useQuestionnaires() {
    const { compositionRoot } = useAppContext();

    const module = useGlassModule(compositionRoot);
    const [questionnaires, setQuestionnaires] = React.useState<QuestionnaireBase[]>();
    const snackbar = useSnackbar();
    const { orgUnit, year } = useSelector();

    React.useEffect(() => {
        if (module.kind !== "loaded") return;

        return compositionRoot.questionnaires
            .getList(module.data, { orgUnitId: orgUnit.id, year: year })
            .run(setQuestionnaires, err => snackbar.error(err));
    }, [compositionRoot, snackbar, module, orgUnit, year]);

    const updateQuestionnarie = React.useCallback<QuestionnarieFormProps["onSave"]>(updatedQuestionnaire => {
        setQuestionnaires(prevQuestionnaries =>
            prevQuestionnaries?.map(questionnarire =>
                questionnarire.id === updatedQuestionnaire.id ? updatedQuestionnaire : questionnarire
            )
        );
    }, []);

    return [questionnaires, updateQuestionnarie] as const;
}

type QuestionnaireFormState = { mode: "closed" } | { mode: "show"; id: Id } | { mode: "edit"; id: Id };

function useFormState() {
    const [formState, setFormState] = React.useState<QuestionnaireFormState>({ mode: "closed" });

    const goToQuestionnarie = React.useCallback(
        (questionnaire: QuestionnaireBase, options: { mode: "show" | "edit" }) => {
            setFormState({ mode: options.mode, id: questionnaire.id });
        },
        []
    );

    const closeQuestionnarie = React.useCallback(() => {
        setFormState({ mode: "closed" });
    }, []);

    return [formState, { goToQuestionnarie, closeQuestionnarie }] as const;
}
