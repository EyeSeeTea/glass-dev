import { useCallback, useEffect, useState } from "react";
import { useCurrentDataSubmissionId } from "../../../hooks/useCurrentDataSubmissionId";
import { useCurrentModuleContext } from "../../../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../../../contexts/current-orgUnit-context";
import { useCurrentPeriodContext } from "../../../contexts/current-period-context";
import { QuestionnaireBase } from "../../../../domain/entities/Questionnaire";
import { useQuestionnaires } from "../../current-data-submission/Questionnaires";
import { useGetLastSuccessfulAnalyticsRunTime } from "../../../hooks/useGetLastSuccessfulAnalyticsRunTime";
import { ImportSummary } from "../../../../domain/entities/data-entry/ImportSummary";
import { useAppContext } from "../../../contexts/app-context";
import { moduleProperties } from "../../../../domain/utils/ModuleProperties";
import { useCurrentUserGroupsAccess } from "../../../hooks/useCurrentUserGroupsAccess";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import i18n from "@eyeseetea/d2-ui-components/locales";

const COMPLETED_STATUS = "COMPLETED";

export function useReviewDataSummary(
    changeStep: (step: number) => void,
    primaryFileImportSummary: ImportSummary | undefined
) {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const { currentModuleAccess } = useCurrentModuleContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const { currentPeriod } = useCurrentPeriodContext();

    const dataSubmissionId = useCurrentDataSubmissionId(
        currentModuleAccess.moduleId,
        currentModuleAccess.moduleName,
        currentOrgUnitAccess.orgUnitId,
        currentPeriod
    );
    const [questionnaires] = useQuestionnaires();
    const { lastSuccessfulAnalyticsRunTime, setRefetch } = useGetLastSuccessfulAnalyticsRunTime();
    const { captureAccessGroup } = useCurrentUserGroupsAccess();

    const [currentDataSubmissionId, setCurrentDataSubmissionId] = useState<string>("");
    const [currentQuestionnaires, setCurrentQuestionnaires] = useState<QuestionnaireBase[]>();
    const [isReportReady, setIsReportReady] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [fileType, setFileType] = useState<string>("primary");

    const changeType = (fileType: string) => {
        setFileType(fileType);
    };

    useEffect(() => {
        if (dataSubmissionId !== "" && currentDataSubmissionId === "") {
            setCurrentDataSubmissionId(dataSubmissionId);
        }

        if (questionnaires && !currentQuestionnaires) {
            setCurrentQuestionnaires(questionnaires);
        }
        if (lastSuccessfulAnalyticsRunTime.kind === "loaded") {
            const lastAnalyticsRunTime = new Date(lastSuccessfulAnalyticsRunTime.data);

            console.debug(
                `Last Analytics Run time : ${lastAnalyticsRunTime}, Import time: ${primaryFileImportSummary?.importTime} `
            );
            if (primaryFileImportSummary?.importTime) {
                if (lastAnalyticsRunTime > primaryFileImportSummary.importTime) {
                    setIsReportReady(true);
                }
            }
        }
    }, [
        setIsReportReady,
        lastSuccessfulAnalyticsRunTime,
        primaryFileImportSummary?.importTime,
        dataSubmissionId,
        currentDataSubmissionId,
        currentQuestionnaires,
        questionnaires,
    ]);

    useEffect(() => {
        const timer = setInterval(() => {
            setRefetch({});
        }, 3000);
        return () => {
            clearInterval(timer);
        };
    }, [setRefetch]);

    const setCompleteStatus = useCallback(() => {
        if (
            moduleProperties.get(currentModuleAccess.moduleName)?.completeStatusChange === "DATASET" ||
            (moduleProperties.get(currentModuleAccess.moduleName)?.completeStatusChange ===
                "QUESTIONNAIRE_AND_DATASET" &&
                currentQuestionnaires?.every(q => q.isMandatory && q.isCompleted))
        ) {
            compositionRoot.glassDataSubmission.setStatus(currentDataSubmissionId, "COMPLETE").run(
                () => {
                    if (captureAccessGroup.kind === "loaded") {
                        const userGroupsIds = captureAccessGroup.data.map(cag => {
                            return cag.id;
                        });
                        const notificationText = `The data submission for ${currentModuleAccess.moduleName} module for year ${currentPeriod} and country ${currentOrgUnitAccess.orgUnitName} has changed to DATA TO BE APPROVED BY COUNTRY`;

                        compositionRoot.notifications
                            .send(notificationText, notificationText, userGroupsIds, currentOrgUnitAccess.orgUnitPath)
                            .run(
                                () => {},
                                () => {}
                            );
                    }
                },
                error => {
                    console.debug("Error occurred when setting data submission status, error: " + error);
                }
            );
        }
    }, [
        captureAccessGroup,
        compositionRoot.glassDataSubmission,
        compositionRoot.notifications,
        currentDataSubmissionId,
        currentModuleAccess.moduleName,
        currentOrgUnitAccess.orgUnitName,
        currentOrgUnitAccess.orgUnitPath,
        currentPeriod,
        currentQuestionnaires,
    ]);

    const updatePrimaryFileStatusAndNotify = useCallback(
        (primaryUploadId: string, secondaryUploadId: string | null) => {
            return compositionRoot.glassUploads.setStatus({ id: primaryUploadId, status: COMPLETED_STATUS }).run(
                () => {
                    if (!secondaryUploadId) {
                        changeStep(4);
                        setIsLoading(false);
                        //If Questionnaires are not applicable to a module, then set status as COMPLETE on
                        //completion of dataset.
                        setCompleteStatus();
                    } else {
                        return compositionRoot.glassUploads
                            .setStatus({ id: secondaryUploadId, status: COMPLETED_STATUS })
                            .run(
                                () => {
                                    changeStep(4);
                                    setIsLoading(false);
                                },
                                errorMessage => {
                                    snackbar.error(i18n.t(errorMessage));
                                    setIsLoading(false);
                                }
                            );
                    }
                },
                errorMessage => {
                    snackbar.error(i18n.t(errorMessage));
                    setIsLoading(false);
                }
            );
        },
        [changeStep, compositionRoot.glassUploads, setCompleteStatus, snackbar]
    );

    const updateSecondaryFileStatusAndNotify = useCallback(
        (secondaryUploadId: string) => {
            return compositionRoot.glassUploads.setStatus({ id: secondaryUploadId, status: COMPLETED_STATUS }).run(
                () => {
                    setCompleteStatus();
                    changeStep(4);
                    setIsLoading(false);
                },
                errorMessage => {
                    snackbar.error(i18n.t(errorMessage));
                    setIsLoading(false);
                }
            );
        },
        [changeStep, compositionRoot.glassUploads, setCompleteStatus, snackbar]
    );

    const goToFinalStep = useCallback(() => {
        const primaryUploadId = localStorage.getItem("primaryUploadId");
        const secondaryUploadId = localStorage.getItem("secondaryUploadId");
        setIsLoading(true);
        if (primaryUploadId) {
            updatePrimaryFileStatusAndNotify(primaryUploadId, secondaryUploadId);
        } else if (secondaryUploadId) {
            updateSecondaryFileStatusAndNotify(secondaryUploadId);
        }
    }, [updatePrimaryFileStatusAndNotify, updateSecondaryFileStatusAndNotify]);

    return {
        goToFinalStep,
        isReportReady,
        isLoading,
        fileType,
        changeType,
    };
}
