import { useSnackbar } from "@eyeseetea/d2-ui-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { Button, LinearProgress } from "@material-ui/core";
import React, { Dispatch, SetStateAction, useCallback, useEffect } from "react";
import styled from "styled-components";
import { Id } from "../../../domain/entities/Base";
import { QuestionnaireBase, QuestionnairesType } from "../../../domain/entities/Questionnaire";
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
import { useCurrentPeriodContext } from "../../contexts/current-period-context";
import { isEditModeStatus } from "../../../utils/editModeStatus";
import { useCurrentUserGroupsAccess } from "../../hooks/useCurrentUserGroupsAccess";
import { ProgramQuestionnaireForm } from "../new-signal/ProgramQuestionnaireForm";
import { NamedRef } from "../../../domain/entities/Ref";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";
import { useGlassUploadsByModuleOUPeriod } from "../../hooks/useGlassUploadsByModuleOUPeriod";
import { getCompletedUploads } from "./ListOfDatasets";

const AMR_MODULE_ID = "AVnpk4xiXGG";
const AMR_MODULE_NAME = "AMR";
interface QuestionnairesProps {
    setRefetchStatus: Dispatch<SetStateAction<DataSubmissionStatusTypes | undefined>>;
}
export const Questionnaires: React.FC<QuestionnairesProps> = ({ setRefetchStatus }) => {
    const { compositionRoot } = useAppContext();
    const hasCurrentUserCaptureAccess = useGlassCaptureAccess();
    const hasCurrentUserViewAccess = useGlassReadAccess();
    const [questionnaires, updateQuestionnarie, questionnairesType, setRefresh] = useQuestionnaires();
    const { orgUnit, year } = useSelector();
    const [formState, actions] = useFormState();
    const { currentModuleAccess } = useCurrentModuleContext();
    const { currentPeriod } = useCurrentPeriodContext();
    const { uploads } = useGlassUploadsByModuleOUPeriod(currentPeriod.toString());

    const dataSubmissionId = useCurrentDataSubmissionId(
        currentModuleAccess.moduleId,
        currentModuleAccess.moduleName,
        orgUnit.id,
        year
    );
    const { captureAccessGroup } = useCurrentUserGroupsAccess();
    const currentDataSubmissionStatus = useStatusDataSubmission(
        { id: currentModuleAccess.moduleId, name: currentModuleAccess.moduleName },
        orgUnit.id,
        year
    );
    const amrDataSubmissionId = useCurrentDataSubmissionId(AMR_MODULE_ID, AMR_MODULE_NAME, orgUnit.id, currentPeriod);

    const setCompleteStatus = useCallback(() => {
        compositionRoot.glassDataSubmission.setStatus(dataSubmissionId, "COMPLETE").run(
            () => {
                //Triggerring relaod of status in parent
                setRefetchStatus("COMPLETE");

                if (captureAccessGroup.kind === "loaded") {
                    const userGroupsIds = captureAccessGroup.data.map(cag => {
                        return cag.id;
                    });
                    const notificationText = `The data submission for ${currentModuleAccess.moduleName} module for year ${year} and country ${orgUnit.name} has changed to DATA TO BE APPROVED BY COUNTRY`;

                    compositionRoot.notifications
                        .send(notificationText, notificationText, userGroupsIds, orgUnit.path)
                        .run(
                            () => {},
                            () => {}
                        );
                }
            },
            () => {}
        );
    }, [
        captureAccessGroup,
        compositionRoot.notifications,
        compositionRoot.glassDataSubmission,
        currentModuleAccess.moduleName,
        dataSubmissionId,
        orgUnit,
        setRefetchStatus,
        year,
    ]);

    const validateAndUpdateStatus = useCallback(
        (complete: boolean, questionnaireId: string) => {
            //If Questionnaire has been set to complete/not complete, check if data submission status needs to be updated
            if (complete) {
                const allMandatoryQuestionnairesCompleted = questionnaires
                    ?.filter(mq => mq.isMandatory && mq.id !== questionnaireId)
                    .every(q => q.isCompleted);
                if (allMandatoryQuestionnairesCompleted) {
                    //Set the status of data Submission to "COMPLETE"
                    if (
                        moduleProperties.get(currentModuleAccess.moduleName)?.completeStatusChange === "QUESTIONNAIRE"
                    ) {
                        setCompleteStatus();
                    } else if (
                        moduleProperties.get(currentModuleAccess.moduleName)?.completeStatusChange ===
                        "QUESTIONNAIRE_AND_DATASET"
                    ) {
                        //check if dataset is uploaded.
                        const completedUploads = getCompletedUploads(uploads);
                        if (completedUploads && completedUploads?.length > 0) setCompleteStatus();
                    } else if (currentModuleAccess.moduleName === "AMR - Individual") {
                        //If AMR-I completes the questionnaire, change status for AMR-agg
                        compositionRoot.glassDataSubmission.setStatus(amrDataSubmissionId, "COMPLETE").run(
                            () => {},
                            () => {}
                        );
                    }
                }
            } else {
                const mandatoryQuestionnaireIncomplete = questionnaires?.find(
                    q => q.id === questionnaireId
                )?.isMandatory;
                if (mandatoryQuestionnaireIncomplete) {
                    compositionRoot.glassDataSubmission.setStatus(dataSubmissionId, "NOT_COMPLETED").run(
                        () => {
                            //Triggerring relaod of status in parent
                            setRefetchStatus("NOT_COMPLETED");
                        },
                        () => {}
                    );
                } else if (currentModuleAccess.moduleName === "AMR - Individual") {
                    //If AMR-I completes the questionnaire, change status for AMR-agg
                    compositionRoot.glassDataSubmission.setStatus(amrDataSubmissionId, "NOT_COMPLETED").run(
                        () => {},
                        () => {}
                    );
                }
            }
        },
        [
            amrDataSubmissionId,
            compositionRoot.glassDataSubmission,
            currentModuleAccess.moduleName,
            dataSubmissionId,
            questionnaires,
            uploads,
            setRefetchStatus,
            setCompleteStatus,
        ]
    );

    useEffect(() => {
        //FOR AMC, the mandatory questinnaire is split into multiple questionnaires.
        //check if mandatory questionnaire completed, apply data submission status change logic.

        if (
            moduleProperties.get(currentModuleAccess.moduleName)?.completeStatusChange === "QUESTIONNAIRE_AND_DATASET"
        ) {
            const mandatoryQuestionnairePart1 = questionnaires?.find(q => q.isMandatory === true);
            if (mandatoryQuestionnairePart1?.isCompleted) {
                validateAndUpdateStatus(true, mandatoryQuestionnairePart1.id);
            } else if (mandatoryQuestionnairePart1) {
                validateAndUpdateStatus(false, mandatoryQuestionnairePart1.id);
            }
        }
    }, [currentModuleAccess.moduleName, questionnaires, validateAndUpdateStatus]);

    if (!questionnaires) {
        return <LinearProgress />;
    } else if (formState.mode !== "closed") {
        if (questionnairesType === "Dataset") {
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
                <ProgramQuestionnaireForm
                    hideForm={actions.closeQuestionnarie}
                    questionnaireId={formState.id}
                    readonly={formState.mode === "show" ? true : false}
                    hidePublish={true}
                    eventId={formState.eventId}
                    parentEventId={formState.parentEventId}
                    subQuestionnaires={formState.subQuestionnaires}
                    aggsubQuestionnaires={formState.aggSubQuestionnaires}
                    refreshGrid={setRefresh}
                />
            );
        }
    } else {
        return (
            <QuestionnairesGrid>
                {questionnaires.length === 0 && <h3>{i18n.t("There are no questionnaries for this module")}</h3>}

                {questionnaires.map(questionnaire => (
                    <QuestionnaireCard key={`${questionnaire.id}${questionnaire.name}`}>
                        <div className="head">
                            <h3 style={{ wordBreak: "break-all" }}>{questionnaire.name}</h3>
                            <span className="desc">{questionnaire.description}</span>
                            <br />
                            {questionnaire.subQuestionnaires && questionnaire.subQuestionnaires.length > 0 && (
                                <>
                                    <span className="comp completed">Filled Subquestionnaires</span>
                                    {questionnaire.subQuestionnaires.map(fq => (
                                        <span key={fq.id}>{fq.name}</span>
                                    ))}
                                </>
                            )}
                        </div>

                        {questionnaire.isMandatory && <span className="mand">{i18n.t("mandatory")}</span>}
                        {hasCurrentUserCaptureAccess ? (
                            <>
                                {questionnaire.isCompleted ? (
                                    <span className="comp completed">{i18n.t("Completed")}</span>
                                ) : (
                                    <span className="comp">{i18n.t("Not completed")}</span>
                                )}
                            </>
                        ) : (
                            <span className="comp" />
                        )}

                        <div className="buttons">
                            <Button
                                onClick={() => actions.goToQuestionnarie(questionnaire, { mode: "show" })}
                                disabled={!hasCurrentUserViewAccess}
                            >
                                {i18n.t("View")}
                            </Button>

                            {currentDataSubmissionStatus.kind === "loaded" &&
                                isEditModeStatus(currentDataSubmissionStatus.data.title) && (
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
    const { orgUnitId, orgUnitName, orgUnitPath } = currentOrgUnitAccess;
    const orgUnit = React.useMemo(
        () => ({ id: orgUnitId, name: orgUnitName, path: orgUnitPath }),
        [orgUnitId, orgUnitName, orgUnitPath]
    );

    const { currentPeriod } = useCurrentPeriodContext();

    return { orgUnit, year: currentPeriod };
}

export function useQuestionnaires() {
    const { compositionRoot } = useAppContext();
    const module = useGlassModule();
    const [questionnaires, setQuestionnaires] = React.useState<QuestionnaireBase[]>();
    const [questionnairesType, setQuestionnairesType] = React.useState<QuestionnairesType>();
    const snackbar = useSnackbar();
    const { orgUnit, year } = useSelector();
    const hasCurrentUserCaptureAccess = useGlassCaptureAccess() ? true : false;
    const [refresh, setRefresh] = React.useState({});

    React.useEffect(() => {
        if (module.kind !== "loaded") return;
        setQuestionnairesType(module.data.questionnairesType);

        return compositionRoot.questionnaires
            .getList(module.data, { orgUnitId: orgUnit.id, year: year }, hasCurrentUserCaptureAccess)
            .run(
                questionnaires => {
                    setQuestionnaires(questionnaires);
                },
                err => snackbar.error(err)
            );
    }, [compositionRoot.questionnaires, snackbar, module, orgUnit, year, hasCurrentUserCaptureAccess, refresh]);

    const updateQuestionnarie = React.useCallback<QuestionnarieFormProps["onSave"]>(updatedQuestionnaire => {
        setQuestionnaires(prevQuestionnaries =>
            prevQuestionnaries?.map(questionnarire =>
                questionnarire.id === updatedQuestionnaire.id ? updatedQuestionnaire : questionnarire
            )
        );
    }, []);

    return [questionnaires, updateQuestionnarie, questionnairesType, setRefresh] as const;
}

type QuestionnaireFormState =
    | { mode: "closed" }
    | {
          mode: "show";
          id: Id;
          eventId?: Id;
          parentEventId?: Id;
          subQuestionnaires?: NamedRef[];
          aggSubQuestionnaires?: NamedRef[];
      }
    | {
          mode: "edit";
          id: Id;
          eventId?: Id;
          parentEventId?: Id;
          subQuestionnaires?: NamedRef[];
          aggSubQuestionnaires?: NamedRef[];
      };

function useFormState() {
    const [formState, setFormState] = React.useState<QuestionnaireFormState>({ mode: "closed" });

    const goToQuestionnarie = React.useCallback(
        (questionnaire: QuestionnaireBase, options: { mode: "show" | "edit" }) => {
            setFormState({
                mode: options.mode,
                id: questionnaire.id,
                eventId: questionnaire.eventId,
                parentEventId: questionnaire.parentEventId,
                subQuestionnaires: questionnaire.subQuestionnaires,
                aggSubQuestionnaires: questionnaire.aggSubQuestionnaires,
            });
        },
        []
    );

    const closeQuestionnarie = React.useCallback(() => {
        setFormState({ mode: "closed" });
    }, []);

    return [formState, { goToQuestionnarie, closeQuestionnarie }] as const;
}
