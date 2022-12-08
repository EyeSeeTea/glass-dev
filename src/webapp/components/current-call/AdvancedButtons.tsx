import React from "react";
import { Button } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { glassColors } from "../../pages/app/themes/dhis2.theme";

export const AdvancedButtons: React.FC = () => {
    return (
        <ContentWrapper className="cta-buttons">
            <div>
                <Button variant="contained" color="primary">
                    {i18n.t("Request Dataset update")}
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
    button {
        background-color: ${glassColors.red};
    }
`;
