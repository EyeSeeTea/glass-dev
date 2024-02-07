import i18n from "@eyeseetea/d2-ui-components/locales";
import { Button, ButtonProps, Typography } from "@material-ui/core";
import React from "react";
import styled from "styled-components";
import { palette } from "../../pages/app/themes/dhis2.theme";
import CloudDownloadIcon from "@material-ui/icons/CloudDownload";

export const DownloadButton = ({
    title,
    onClick,
    buttonProps,
    helperText,
    disabled,
}: {
    title: string;
    onClick: React.MouseEventHandler<HTMLButtonElement> | undefined;
    buttonProps?: ButtonProps;
    helperText?: string;
    disabled?: boolean;
}) => {
    return (
        <ButtonWrapper>
            <StyledDownloadButton
                variant="outlined"
                onClick={onClick}
                endIcon={<StyledCloudDownloadIcon />}
                disabled={disabled}
                {...buttonProps}
            >
                {i18n.t(title)}
            </StyledDownloadButton>
            {helperText && (
                <HelperText color="textSecondary" variant="caption">
                    {i18n.t(helperText)}
                </HelperText>
            )}
        </ButtonWrapper>
    );
};

const ButtonWrapper = styled.div`
    display: flex;
    flex-direction: column;
`;

const StyledDownloadButton = styled(Button)`
    color: ${palette.action.active};
    font-weight: 400;
`;

const HelperText = styled(Typography)`
    text-align: right;
    font-size: 11px;
`;

const StyledCloudDownloadIcon = styled(CloudDownloadIcon)`
    fill: ${palette.action.active};
`;
