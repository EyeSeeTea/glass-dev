import React, { useState } from "react";
import { Button } from "@material-ui/core";
import { BlockingErrors } from "./BlockingErrors";
import styled from "styled-components";
import { glassColors } from "../../pages/app/themes/dhis2.theme";


export const ConsistencyChecks: React.FC = () => {
    const [fileType, setFileType] = useState<string>("ris");

    const changeType = (fileType: string) => {
        setFileType(fileType);
    };

    return (
        <ContentWrapper>
            <p>Explaining what consistency checks are: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore</p>
            <div className="toggles">
                <Button onClick={() => changeType('ris')} className={fileType === 'ris' ? 'current': '' }>RIS File</Button>
                <Button onClick={() => changeType('sample')} className={fileType === 'sample' ? 'current': '' }>Sample File</Button>
            </div>
            <BlockingErrors />
        </ContentWrapper>
    )

}

const ContentWrapper = styled.div`
    .toggles {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0;
        max-width: 550px;
        margin: 0 auto 40px;
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
`