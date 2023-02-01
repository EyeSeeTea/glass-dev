import React, { useState } from "react";
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

interface DataSubmissionStepsProps {
    moduleName: string;
    currentDataSubmissionStatus: StatusDetails;
}

export const DataSubmissionSteps: React.FC<DataSubmissionStepsProps> = ({
    moduleName,
    currentDataSubmissionStatus,
}) => {
    const [currentStep, setCurrentStep] = useState<number>(0);

    return (
        <ContentWrapper>
            <div className="toggles">
                <Button onClick={() => setCurrentStep(0)} className={currentStep === 0 ? "current" : ""}>
                    {i18n.t("Overview")}
                </Button>
                <Button onClick={() => setCurrentStep(1)} className={currentStep === 1 ? "current" : ""}>
                    {i18n.t("List of Datasets")}
                </Button>
                <Button onClick={() => setCurrentStep(2)} className={currentStep === 2 ? "current" : ""}>
                    {i18n.t("Questionnaires")}
                </Button>
                <Button onClick={() => setCurrentStep(3)} className={currentStep === 3 ? "current" : ""}>
                    {i18n.t("Validation")}
                </Button>
                <Button onClick={() => setCurrentStep(4)} className={currentStep === 4 ? "current" : ""}>
                    {i18n.t("Advanced")}
                </Button>
            </div>
            {renderTypeContent(currentStep, moduleName, currentDataSubmissionStatus)}
        </ContentWrapper>
    );
};

const renderTypeContent = (step: number, moduleName: string, currentDataSubmissionStatus: StatusDetails) => {
    switch (step) {
        case 0:
            // TODO: set module name inside page root content to avoid prop drilling
            return <Overview moduleName={moduleName} currentDataSubmissionStatus={currentDataSubmissionStatus} />;
        case 1:
            return <ListOfDatasets />;
        case 2:
            return <Questionnaires />;
        case 3:
            return <Validations />;
        case 4:
            return <Advanced />;
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
        button {
            color: ${glassColors.greyDisabled};
            padding: 10px 15px;
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
