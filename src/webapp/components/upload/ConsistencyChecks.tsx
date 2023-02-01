import React, { useState } from "react";
import { Button } from "@material-ui/core";
import { BlockingErrors } from "./BlockingErrors";
import styled from "styled-components";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { NonBlockingWarnings } from "./NonBlockingWarnings";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import i18n from "@eyeseetea/d2-ui-components/locales";
interface ConsistencyChecksProps {
    changeStep: (step: number) => void;
}

export const ConsistencyChecks: React.FC<ConsistencyChecksProps> = ({ changeStep }) => {
    const [fileType, setFileType] = useState<string>("ris");

    const changeType = (fileType: string) => {
        setFileType(fileType);
    };

    return (
        <ContentWrapper>
            <p className="intro">
                {i18n.t(
                    "Explaining what consistency checks are: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed doeiusmod tempor incididunt ut labore"
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
                    endIcon={<ChevronRightIcon />}
                    onClick={() => changeStep(4)}
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
