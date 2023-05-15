import React, { useEffect } from "react";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { CompleteButtons } from "./CompleteButtons";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useCurrentPeriodContext } from "../../contexts/current-period-context";

export const Completed: React.FC = () => {
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const { currentPeriod } = useCurrentPeriodContext();
    useEffect(() => {
        localStorage.removeItem("primaryUploadId");
        localStorage.removeItem("secondaryUploadId");
    }, []);

    return (
        <ContentWrapper>
            <p className="intro">{i18n.t("Thank you! your data for now is uploaded in our system")}</p>
            <div className="ds-name">
                <span>{currentPeriod}</span>
                <span>{i18n.t(currentOrgUnitAccess.orgUnitName)}</span>
            </div>
            <CompleteButtons />
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 40px;

    .bottom {
        display: flex;
        align-items: baseline;
        justify-content: center;
        margin: 0 auto 30px auto;
        align-items: flex-end;
        width: 100%;
    }
    .ds-name {
        display: flex;
        gap: 40px;
        align-items: center;
        justify-content: center;
        font-weight: 500;
    }
`;
