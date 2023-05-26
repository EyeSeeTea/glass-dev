import React, { Dispatch, SetStateAction, useState } from "react";
import { Button } from "@material-ui/core";
import styled from "styled-components";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { ListOfDatasets } from "./ListOfDatasets";
import { Questionnaires } from "./Questionnaires";
import { Advanced } from "./Advanced";
import { Validations } from "./Validations";
import { Overview } from "./overview/Overview";
import { StatusDetails } from "./overview/StatusDetails";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { DataSubmissionStatusTypes } from "../../../domain/entities/GlassDataSubmission";
import { useGlassCaptureAccess } from "../../hooks/useGlassCaptureAccess";
import { isEditModeStatus } from "../../../utils/editModeStatus";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";
import { Submission } from "./Submission";

interface UploadStepsProps {
    moduleName: string;
    currentDataSubmissionStatus: StatusDetails;
    setRefetchStatus: Dispatch<SetStateAction<DataSubmissionStatusTypes | undefined>>;
    step: number;
}

export const UploadSteps: React.FC<UploadStepsProps> = ({
    moduleName,
    currentDataSubmissionStatus,
    setRefetchStatus,
    step,
}) => {
    const [currentStep, setCurrentStep] = useState<number>(step);
    const hasCurrentUserCaptureAccess = useGlassCaptureAccess();

    return (
        <ContentWrapper>
            <div className="toggles">
                <Button onClick={() => setCurrentStep(0)} className={currentStep === 0 ? "current" : ""}>
                    {i18n.t("Overview")}
                </Button>
                {moduleProperties.get(moduleName)?.isQuestionnaireReq && (
                    <Button onClick={() => setCurrentStep(1)} className={currentStep === 1 ? "current" : ""}>
                        {i18n.t("Questionnaires")}
                    </Button>
                )}
                <Button onClick={() => setCurrentStep(2)} className={currentStep === 2 ? "current" : ""}>
                    {i18n.t("Datasets")}
                </Button>
                <Button onClick={() => setCurrentStep(3)} className={currentStep === 3 ? "current" : ""}>
                    {i18n.t("Validation Report")}
                </Button>
                {/* Do not show Advanced tab, if the user does not have capture access or if the current status is not in edit mode */}
                {hasCurrentUserCaptureAccess &&
                    !isEditModeStatus(currentDataSubmissionStatus.title) &&
                    currentDataSubmissionStatus.title !== "WAITING for WHO TO ACCEPT THE DATA UPDATE REQUEST" && (
                        <Button onClick={() => setCurrentStep(4)} className={currentStep === 4 ? "current" : ""}>
                            {i18n.t("Advanced")}
                        </Button>
                    )}
                {/* Do not show Submission tab, unless the current status is a submission status */}
                {hasCurrentUserCaptureAccess && currentDataSubmissionStatus.isSubmissionStatus && (
                    <Button onClick={() => setCurrentStep(5)} className={currentStep === 5 ? "current" : ""}>
                        {i18n.t("Submission")}
                    </Button>
                )}
            </div>
            {renderTypeContent(currentStep, moduleName, currentDataSubmissionStatus, setRefetchStatus, setCurrentStep)}
        </ContentWrapper>
    );
};

const renderTypeContent = (
    step: number,
    moduleName: string,
    currentDataSubmissionStatus: StatusDetails,
    setRefetchStatus: Dispatch<SetStateAction<DataSubmissionStatusTypes | undefined>>,
    setCurrentStep: React.Dispatch<React.SetStateAction<number>>
) => {
    switch (step) {
        case 0:
            // TODO: set module name inside page root content to avoid prop drilling
            return (
                <Overview
                    moduleName={moduleName}
                    currentDataSubmissionStatus={currentDataSubmissionStatus}
                    setRefetchStatus={setRefetchStatus}
                    setCurrentStep={setCurrentStep}
                />
            );
        case 1:
            return <Questionnaires setRefetchStatus={setRefetchStatus} />;
        case 2:
            return <ListOfDatasets setRefetchStatus={setRefetchStatus} />;
        case 3:
            return <Validations />;
        case 4:
            return <Advanced setRefetchStatus={setRefetchStatus} setCurrentStep={setCurrentStep} />;
        case 5:
            return <Submission setRefetchStatus={setRefetchStatus} setCurrentStep={setCurrentStep} />;
        default:
            return <p>{i18n.t("No Data uploaded...")}</p>;
    }
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 40px;
    .toggles {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0;
        width: 100%;
        max-width: 800px;
        margin: 0 auto;
        white-space: nowrap;
        overflow-x: auto;
        button {
            color: ${glassColors.greyDisabled};
            padding: 10px 74px;
            border-radius: 0;
            border: none;
            flex: 1;
            border-bottom: 2px solid ${glassColors.greyLight};
            &.current {
                color: ${glassColors.mainPrimary};
                border-bottom: 4px solid ${glassColors.mainPrimary};
            }
        }
    }
`;
