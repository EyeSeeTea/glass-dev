import React from "react";
import { Button } from "@material-ui/core";
import { glassColors, palette } from "../../pages/app/themes/dhis2.theme";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";

export const CtaButtons: React.FC = () => {
    return (
        <ContentWrapper className="cta-buttons">
            <div>
                <Button variant="contained" color="primary">
                    {i18n.t("Upload dataset")}
                </Button>
            </div>
            <div>
                <Button variant="contained" color="primary">
                    {i18n.t("Go to Questionnaires")}
                </Button>
            </div>
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    gap: 20px;
    > div {
        display: flex;
        flex-direction: column;
        gap: 15px;
        span {
            font-weight: 300;
        }
        button {
            font-weight: 400;
        }
    }
`;
