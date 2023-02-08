import React from "react";
import { Button } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { NavLink } from "react-router-dom";
import { StatusCTAs } from "./StatusDetails";

export interface CtaButtonsProps {
    moduleName: string;
    ctas: StatusCTAs[];
}

export const CtaButtons: React.FC<CtaButtonsProps> = ({ moduleName, ctas }) => {
    const getCTAButton = (cta: StatusCTAs) => {
        // TODO : Button click event handlers to be added as corresponding feature developed.
        switch (cta) {
            case "Display full status history":
                return (
                    <StyledDisplayHistoryContainer key={0}>
                        <StyledDisplayHistoryButton color="primary">
                            {i18n.t("Display full status history >")}
                        </StyledDisplayHistoryButton>
                    </StyledDisplayHistoryContainer>
                );
            case "Go to questionnaire":
                return (
                    <Button variant="contained" color="primary" key={1}>
                        {i18n.t("Go to questionnaires")}
                    </Button>
                );
            case "Send to WHO for revision":
                return (
                    <Button variant="contained" color="primary" key={2}>
                        {i18n.t("Send to WHO for revision")}
                    </Button>
                );
            case "Upload dataset":
                return (
                    <Button
                        key={3}
                        variant="contained"
                        color="primary"
                        component={NavLink}
                        to={`/upload/?module=${moduleName}`}
                        exact={true}
                    >
                        {i18n.t("Upload dataset")}
                    </Button>
                );
        }
    };

    return (
        <ContentWrapper>
            {ctas.map(cta => {
                return getCTAButton(cta);
            })}
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    margin: 40px auto 0;
    justify-content: center;
    gap: 10%;
    > div {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }
`;

const StyledDisplayHistoryButton = styled(Button)`
    text-transform: none;
    padding: 0;
`;

const StyledDisplayHistoryContainer = styled.div`
    width: 100%;
    align-items: baseline;
`;
