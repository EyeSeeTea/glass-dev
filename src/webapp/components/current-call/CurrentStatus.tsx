import React from "react";
import { Box } from "@material-ui/core";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { CtaButtons } from "./CtaButtons";

export const CurrentStatus: React.FC = () => {
    return (
        <ContentWrapper>
            <LinedBox>
                <div className="status-box">
                    <small>{i18n.t("Current Status")}</small>
                    <span className="status not-completed">{i18n.t("Not Completed")}</span>
                </div>
                <Box sx={{ m: 2 }} />
                <p>{i18n.t("At least one dataset is missing")}</p>
                <p>{i18n.t("At least one mandatory questionnaire is not submited")}</p>
                <p>
                    <strong>
                        {i18n.t(
                            "You need to complete the mandatory uploads before validate the submissions for this call"
                        )}
                    </strong>
                </p>

                <CtaButtons />
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
