import React from "react";
import styled from "styled-components";
import { Button, Icon, IconButton, Typography } from "@material-ui/core";

import i18n from "../../../locales";

type FormLayoutProps = {
    title?: string;
    subtitle?: string;
    saveLabel?: string;
    cancelLabel?: string;
    children: React.ReactNode;
    onSave: () => void;
    onCancel?: () => void;
    disableSave?: boolean;
    onBackClick?: () => void;
};

export const FormLayout: React.FC<FormLayoutProps> = React.memo(
    ({ title, onBackClick, saveLabel, cancelLabel, children, onSave, onCancel, disableSave = false }) => {
        return (
            <StyledFormLayout>
                <Header>
                    {!!onBackClick && (
                        <BackButton
                            onClick={onBackClick}
                            color="secondary"
                            aria-label={i18n.t("Back")}
                            data-test={"page-header-back"}
                        >
                            <Icon color="primary">arrow_back</Icon>
                        </BackButton>
                    )}

                    <Title variant="h5" gutterBottom data-test={"page-header-title"}>
                        {title}
                    </Title>

                    <RequiredText>{i18n.t("Indicates required")}</RequiredText>
                </Header>

                <Content>{children}</Content>

                <Footer>
                    <ButtonsFooter>
                        <Button onClick={onSave} disabled={disableSave} variant="contained" color="primary">
                            {saveLabel || i18n.t("Save")}
                        </Button>
                        {onCancel && (
                            <Button onClick={onCancel} variant="text" color="primary">
                                {cancelLabel || i18n.t("Cancel")}
                            </Button>
                        )}
                    </ButtonsFooter>
                </Footer>
            </StyledFormLayout>
        );
    }
);

const StyledFormLayout = styled.div`
    width: 100%;
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
`;

const Content = styled.div`
    width: 100%;
`;

const Footer = styled.div``;

const ButtonsFooter = styled.div`
    margin-block-start: 48px;
    display: flex;
    justify-content: flex-start;
    gap: 16px;
`;

const Title = styled(Typography)`
    display: inline-block;
    font-weight: 300;
`;

const RequiredText = styled.span`
    font-size: 0.875rem;
    font-weight: 700;
    &::before {
        content: "*";
        margin-inline-end: 4px;
    }
`;

const BackButton = styled(IconButton)`
    padding-top: 10px;
    margin-bottom: 5x;
`;
