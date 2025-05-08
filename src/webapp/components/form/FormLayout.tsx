import React from "react";
import styled from "styled-components";
import { Button, Typography } from "@material-ui/core";

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
    showFormButtons?: boolean;
};

export const FormLayout: React.FC<FormLayoutProps> = React.memo(
    ({ title, saveLabel, cancelLabel, children, onSave, onCancel, disableSave = false, showFormButtons = true }) => {
        return (
            <StyledFormLayout>
                <Header>
                    <Title variant="h5" gutterBottom data-test={"page-header-title"}>
                        {title}
                    </Title>

                    <RequiredText>{i18n.t("Indicates required")}</RequiredText>
                </Header>

                <Content>{children}</Content>

                {showFormButtons ? (
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
                ) : null}
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

const ButtonsFooter = styled.div`
    margin-block-start: 48px;
    display: flex;
    justify-content: flex-start;
    gap: 16px;
`;

const Title = styled(Typography)`
    display: inline-block;
    font-weight: 300;
    color: black;
    margin-block-end: 5px;
`;

const RequiredText = styled.span`
    font-size: 0.875rem;
    font-weight: 700;
    &::before {
        content: "*";
        margin-inline-end: 4px;
    }
`;
