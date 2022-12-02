import React from "react";
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@material-ui/core";
import { glassColors, palette } from "../../pages/app/themes/dhis2.theme";
import styled from "styled-components";
import VisibilityIcon from "@material-ui/icons/Visibility";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { CtaButtons } from "./CtaButtons";

function createData(name: string, count: number) {
    return { name, count };
}

export const CurrentStatus: React.FC = () => {
    return (
        <ContentWrapper>
            <h4>{i18n.t("Current Status")}</h4>
            <h3 style={{ color: glassColors.yellow }}>{i18n.t("Not Completed")}</h3>

            <p>{i18n.t("At least one dataset is missing")}</p>
            <p>{i18n.t("At least one mandatory questionnaire is not submited")}</p>
            <p>
                <strong>
                    {i18n.t("You need to complete the mandatory uploads before validate the submissions for this call")}
                </strong>
            </p>

            <CtaButtons />
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    p {
        margin: 0;
    }
    .cta-buttons {
        margin: 40px auto 0;
        justify-content: center;
        gap: 10%;
    }
`;
