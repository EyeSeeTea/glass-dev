import React, { useState } from "react";
import { Button } from "@material-ui/core";
import { BlockingErrors } from "./BlockingErrors";
import styled from "styled-components";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { NonBlockingWarnings } from "./NonBlockingWarnings";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { useAppContext } from "../../contexts/app-context";
interface ConsistencyChecksProps {
    changeStep: (step: number) => void;
}

const COMPLETED_STATUS = "COMPLETED";

export const ConsistencyChecks: React.FC<ConsistencyChecksProps> = ({ changeStep }) => {
    const { compositionRoot } = useAppContext();
    const [fileType, setFileType] = useState<string>("ris");

    const changeType = (fileType: string) => {
        setFileType(fileType);
    };

    const goToFinalStep = async () => {
        const risUploadId = localStorage.getItem("risUploadId");
        const sampleUploadId = localStorage.getItem("sampleUploadId");
        if (risUploadId) {
            await compositionRoot.glassUploads.setStatus({ id: risUploadId, status: COMPLETED_STATUS }).toPromise();
        }
        if (sampleUploadId) {
            await compositionRoot.glassUploads.setStatus({ id: sampleUploadId, status: COMPLETED_STATUS }).toPromise();
        }
        changeStep(3);
    };

    return (
        <ContentWrapper>
            <p className="intro">
                {i18n.t(
                    "Explaining what consistency checks are: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed doeiusmod tempor incididunt ut labore",
                    { nsSeparator: false }
                )}
            </p>
            <div className="toggles">
                <Button onClick={() => changeType("ris")} className={fileType === "ris" ? "current" : ""}>
                    {i18n.t("RIS File")}
                </Button>
                <Button onClick={() => changeType("sample")} className={fileType === "sample" ? "current" : ""}>
                    {i18n.t("Sample File")}
                </Button>
            </div>
            {renderTypeContent(fileType)}

            <div className="bottom">
                <Button
                    variant="contained"
                    color="primary"
                    endIcon={<ChevronRightIcon />}
                    onClick={goToFinalStep}
                    disableElevation
                >
                    {i18n.t("Continue")}
                </Button>
            </div>
        </ContentWrapper>
    );
};

const renderTypeContent = (type: string) => {
    switch (type) {
        case "sample":
            return <p>{i18n.t("Sample file uploading content/intructions here...")}</p>;
        default:
            return (
                <>
                    <BlockingErrors />
                    <NonBlockingWarnings />
                </>
            );
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
        max-width: 550px;
        margin: 0 auto;
        button {
            color: ${glassColors.greyDisabled};
            padding: 10px 20px;
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
