import React from "react";
import { Box } from "@material-ui/core";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { AdvancedButtons } from "./AdvancedButtons";

export const Advanced: React.FC = () => {
    return (
        <ContentWrapper>
            <LinedBox>
                <div className="status-box">
                    <small>{i18n.t("Ask for updating")}</small>
                </div>
                <Box sx={{ m: 2 }} />
                <p>{i18n.t("If for any reason you need to pull this file from the platform to upload a new version of the data you can do it automatically while it is not approved by WHO.")}</p>
                <Box sx={{ m: 2 }} />
                <Box sx={{ m: 2 }} />
                <p>{i18n.t("After it the status is “WHO Aproval” or “WHO PUBLISHED” the revoking process needs to be suppervised by WHO because it can affect ongoing publications")}</p>
                <AdvancedButtons />
            </LinedBox>
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    h3,
    h4 {
        margin: 0;
    }
    p {
        margin: 0;
        line-height: 1.4;
    }
    .status-box {
        text-transform: uppercase;
        small {
            font-weight: bold;
            font-size: 13px;
            display: block;
            opacity: 0.7;
        }
        .status {
            font-weight: 500;
            &.not-completed {
                color: ${glassColors.orange};
            }
        }
    }
    .cta-buttons {
        margin: 40px auto 0;
        justify-content: center;
        gap: 10%;
    }
`;

const LinedBox = styled.div`
    margin: -15px;
    border: 1px solid ${glassColors.grey};
    padding: 20px 30px;
    border-radius: 15px;
`;
