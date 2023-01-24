import React from "react";
import { Button } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { NavLink } from "react-router-dom";

export interface CtaButtonsProps {
    moduleName: string;
}

export const CtaButtons: React.FC<CtaButtonsProps> = ({ moduleName }) => {
    return (
        <ContentWrapper>
            <Button
                variant="contained"
                color="primary"
                component={NavLink}
                to={`/data-submission/${moduleName}`}
                exact={true}
            >
                {i18n.t("Upload dataset")}
            </Button>
            <Button variant="contained" color="primary">
                {i18n.t("Go to Questionnaires")}
            </Button>
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
    button {
        padding: 6px 16px;
    }
`;
