import React from "react";
import { Button, Icon } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import BackupIcon from '@material-ui/icons/Backup';
import { glassColors } from "../../../pages/app/themes/dhis2.theme";


export const UploadFiles: React.FC = () => {
    return (
        <ContentWrapper>
            <div className="file-fields">
                <div>
                    <span>Choose RIS File</span>
                    <Button
                        variant="contained"
                        color="primary"
                        className="upload-button"
                        endIcon={<Icon>{i18n.t("select file")}</Icon>}
                    >
                        {i18n.t("select file")}
                    </Button>
                    <StyledButton
                        variant="contained"
                        color="default"
                        startIcon={<BackupIcon />}
                        disableElevation
                    >
                        {i18n.t("select file")}
                    </StyledButton>
                </div>
                <div>
                    <span>Choose RIS File</span>
                    <StyledButton
                        variant="contained"
                        color="default"
                        startIcon={<BackupIcon />}
                        disableElevation
                    >
                        {i18n.t("Log Out")}
                    </StyledButton>
                </div>
                <StyledButton
                    variant="contained"
                    color="default"
                    startIcon={<BackupIcon />}
                    disableElevation
                >
                    {i18n.t("Log Out")}
                </StyledButton>
            </div>
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    .file-fields {
        display: flex;
        gap: 20px;
        > div:first-child {
            border-right: 1px solid ${glassColors.grey};
        }
    }
`;


const StyledButton = styled(Button)`
    margin: 16px;
    background: transparent;
    text-transform: none;
`;