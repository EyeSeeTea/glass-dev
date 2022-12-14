import React, { useState } from "react";
import styled from "styled-components";
import { CtaButtons } from "./CtaButtons";
import { glassColors } from "../../../pages/app/themes/dhis2.theme";
import { CurrentStatus } from "./CurrentStatus";
import { UploadFiles } from "./UploadFiles";

export const Overview: React.FC = () => {
    const [screen, setScreen] = useState<string>('status');

    const handleScreenChange = (val:string) => {
        setScreen(val);
    }
    return (
        <LinedBox>
            {renderScreen(screen)}

            {screen === 'status' &&
                <CtaButtons changeScreen={handleScreenChange}/>
            }
        </LinedBox>
    );
};

const renderScreen = (screen: string) => {
    switch (screen) {
        case 'status':
            return <CurrentStatus />;
        case 'upload':
            return <UploadFiles />;
        case 'error':
            return <p>Uploaded file has errrors...</p>;
        default:
            return <CurrentStatus />;
    }
};

const LinedBox = styled.div`
    margin: -15px;
    border: 1px solid ${glassColors.grey};
    padding: 20px 30px;
    border-radius: 15px;
`;
