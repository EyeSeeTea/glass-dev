import React, { useState } from "react";
import { Button } from "@material-ui/core";
import { BlockingErrors } from "./BlockingErrors";
import styled from "styled-components";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { NonBlockingWarnings } from "./NonBlockingWarnings";

export const ConsistencyChecks: React.FC = () => {
    const [fileType, setFileType] = useState<string>("ris");

    const changeType = (fileType: string) => {
        setFileType(fileType);
    };

    return (
        <ContentWrapper>
            <p className="intro">
                Explaining what consistency checks are: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
                eiusmod tempor incididunt ut labore
            </p>
            <div className="toggles">
                <Button onClick={() => changeType("ris")} className={fileType === "ris" ? "current" : ""}>
                    RIS File
                </Button>
                <Button onClick={() => changeType("sample")} className={fileType === "sample" ? "current" : ""}>
                    Sample File
                </Button>
            </div>
            {renderTypeContent(fileType)}
        </ContentWrapper>
    );
};

const renderTypeContent = (type: string) => {
    switch (type) {
        case "sample":
            return <p>Sample file uploading content/intructions here...</p>;
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
