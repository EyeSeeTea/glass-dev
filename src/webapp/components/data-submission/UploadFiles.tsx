import React from "react";
import { Button, Icon } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import BackupIcon from "@material-ui/icons/Backup";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";

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
                        endIcon={<BackupIcon />}
                    >
                        {i18n.t("select file")}
                    </Button>
                </div>
                <div>
                    <span>Choose RIS File</span>
                    <Button
                        variant="contained"
                        color="primary"
                        className="upload-button"
                        endIcon={<BackupIcon />}
                    >
                        {i18n.t("select file")}
                    </Button>
                </div>
            </div>
            <div className="bottom">
                <Button variant="contained" color="default" endIcon={<ChevronRightIcon />} disableElevation>
                    {i18n.t("Continue")}
                </Button>
            </div>            
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    .file-fields {
        display: flex;
        gap: 20px;
        align-items: center;
        justify-content: center;
        margin: 0 auto 30px auto;
        > div:first-child {
            border-right: 1px solid ${glassColors.grey};
        }
        > div {
            display: flex;
            flex-direction: column;
            padding: 30px 50px;
            gap: 10px;
        }
    }
    .bottom {
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 30px auto;
    }
`;

const StyledButton = styled(Button)`
    margin: 16px;
    background: transparent;
    text-transform: none;
`;
