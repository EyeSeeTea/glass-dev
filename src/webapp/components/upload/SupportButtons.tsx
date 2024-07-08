import React, { useCallback } from "react";
import { Button, Typography } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { ImportSummary } from "../../../domain/entities/data-entry/ImportSummary";
import InfoIcon from "@material-ui/icons/Info";
import { EffectFn } from "../../hooks/use-callback-effect";

interface SupportButtonsProps {
    primaryFileImportSummary: ImportSummary | undefined;
    secondaryFileImportSummary: ImportSummary | undefined;
    onCancelUpload: EffectFn<[event: React.MouseEvent<HTMLButtonElement, MouseEvent>]>;
}

interface ContentWrapperProps {
    isVisible: boolean;
}

export const SupportButtons: React.FC<SupportButtonsProps> = ({
    primaryFileImportSummary,
    secondaryFileImportSummary,
    onCancelUpload,
}) => {
    const onHelpClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        const helpWidgetButton = document.querySelector(
            ".feedback-btn.feedback-init-btn.feedback-btn-bottom"
        ) as HTMLElement | null;
        helpWidgetButton?.click();
    }, []);

    const handleCancelUpload = useCallback(
        (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
            onCancelUpload(event);
        },
        [onCancelUpload]
    );

    return (
        <ContentWrapper
            isVisible={
                (primaryFileImportSummary && primaryFileImportSummary.blockingErrors.length > 0) ||
                (secondaryFileImportSummary && secondaryFileImportSummary.blockingErrors.length > 0)
                    ? true
                    : false
            }
        >
            <div>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={onHelpClick}
                    disabled={
                        (primaryFileImportSummary && primaryFileImportSummary.blockingErrors.length > 0) ||
                        (secondaryFileImportSummary && secondaryFileImportSummary.blockingErrors.length > 0)
                            ? false
                            : true
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
                    onClick={handleCancelUpload}
                    disabled={
                        (primaryFileImportSummary && primaryFileImportSummary.blockingErrors.length > 0) ||
                        (secondaryFileImportSummary && secondaryFileImportSummary.blockingErrors.length > 0)
                            ? false
                            : true
                    }
                >
                    {i18n.t("Cancel upload")}
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
