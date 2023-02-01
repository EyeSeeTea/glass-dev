import React from "react";
import { Button } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { NavLink, useLocation } from "react-router-dom";

export const CompleteButtons: React.FC = () => {
    const location = useLocation().pathname.slice(1);
    const moduleName = location.substring(location.indexOf("/") + 1);

    return (
        <ContentWrapper>
            <div>
                <Button
                    variant="contained"
                    color="primary"
                    component={NavLink}
                    to={`/current-call/?module=${moduleName}`}
                    exact={true}
                >
                    {i18n.t("Back to Module")}
                </Button>
            </div>
            <div>
                <Button variant="contained" color="primary">
                    {i18n.t("Go to Validation Report")}
                </Button>
            </div>
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    gap: 20%;
    align-items: center;
    justify-content: center;
    > div {
        display: flex;
        flex-direction: column;
        gap: 15px;
        button {
            font-weight: 400;
        }
    }
`;
