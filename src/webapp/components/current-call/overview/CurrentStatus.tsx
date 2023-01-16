import React from "react";
import { Box } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { CtaButtons } from "./CtaButtons";
import { StatusCTAs } from "./StatusTypes";

interface StatusProps {
    moduleName: string;
    title: string;
    description: string;
    statusColor: string;
    ctas: StatusCTAs[];
}

export const CurrentStatus: React.FC<StatusProps> = ({ moduleName, title, description, statusColor, ctas }) => {
    return (
        <div>
            <Box sx={{ m: 2 }} />
            <div>
                <StyledCurrentStatusStr>{i18n.t("Current Status")}</StyledCurrentStatusStr>
                <StyledStatus statusColor={statusColor}>{i18n.t(title)}</StyledStatus>
            </div>
            <Box sx={{ m: 2 }} />
            <StyledDescription>{i18n.t(description)}</StyledDescription>
            <CtaButtons moduleName={moduleName} ctas={ctas} />
        </div>
    );
};

const StyledCurrentStatusStr = styled.small`
    text-transform: uppercase;
    font-weight: bold;
    font-size: 13px;
    display: block;
    opacity: 0.7;
`;
const StyledStatus = styled.span<{ statusColor: string }>`
    text-transform: uppercase;
    font-weight: 500;
    color: ${props => props.statusColor};
`;
const StyledDescription = styled.p`
    margin: 0;
    line-height: 1.4;
`;
