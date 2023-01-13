import React, { useState } from "react";
import styled from "styled-components";
import { CtaButtons } from "./CtaButtons";
import { glassColors } from "../../../pages/app/themes/dhis2.theme";
import { CurrentStatus } from "./CurrentStatus";

interface OverviewProps {
    moduleName: string;
}

type Status = "status" | "error";

export const Overview: React.FC<OverviewProps> = ({ moduleName }) => {
    const [screen, setScreen] = useState<Status>("status");

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleScreenChange = (val: Status) => {
        setScreen(val);
    };

    return (
        <LinedBox>
            {renderScreen(screen)}
            {screen === "status" && <CtaButtons moduleName={moduleName} />}
        </LinedBox>
    );
};

const renderScreen = (screen: string) => {
    switch (screen) {
        case "status":
            return <CurrentStatus />;
        case "error":
            return <p>Uploaded file has errors...</p>;
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
