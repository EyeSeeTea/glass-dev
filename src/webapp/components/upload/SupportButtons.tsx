import React from "react";
import { Button, Typography } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { ImportSummary } from "../../../domain/entities/data-entry/ImportSummary";
import InfoIcon from "@material-ui/icons/Info";

interface SupportButtonsProps {
    changeStep: (step: number) => void;
    primaryFileImportSummary: ImportSummary | undefined;
}

interface ContentWrapperProps {
    isVisible: boolean;
}

export const SupportButtons: React.FC<SupportButtonsProps> = ({ changeStep, primaryFileImportSummary }) => {
    const onHelpClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        const helpWidgetButton = document.querySelector(
            ".feedback-btn.feedback-init-btn.feedback-btn-bottom"
        ) as HTMLElement | null;
        helpWidgetButton?.click();
    };

    return (
        <ContentWrapper
            isVisible={(primaryFileImportSummary && primaryFileImportSummary.blockingErrors.length > 0) || false}
        >
            <div>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={onHelpClick}
                    disabled={
                        primaryFileImportSummary && primaryFileImportSummary.blockingErrors.length > 0 ? false : true
                    }
                >
                    {i18n.t("Submit Help Ticket")}
                </Button>
                <HelperWrapper>
                    <InfoIcon fontSize={"small"} color="disabled" />
                    <Typography color="textSecondary" variant="caption">
                        {i18n.t("App support ticket")}
                    </Typography>
                </HelperWrapper>
            </div>
            <div>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => changeStep(1)}
                    disabled={
                        primaryFileImportSummary && primaryFileImportSummary.blockingErrors.length > 0 ? false : true
                    }
                >
                    {i18n.t("Upload New Data Files")}
                </Button>
                <HelperWrapper>
                    <InfoIcon fontSize={"small"} color="disabled" />
                    <Typography color="textSecondary" variant="caption">
                        {i18n.t("Fix upload data")}
                    </Typography>
                </HelperWrapper>
            </div>
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div<ContentWrapperProps>`
    display: flex;
    gap: 20px;
    > div {
        display: flex;
        flex-direction: column;
        gap: 5px;
        button {
            font-weight: 400;
        }
    }
    ${props =>
        !props.isVisible && {
            visibility: "hidden",
        }}
`;

const HelperWrapper = styled.div`
    display: flex;
    margin-left: 5px;
    gap: 4px;
`;
