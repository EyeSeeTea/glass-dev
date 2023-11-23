import React from "react";
import styled from "styled-components";
import { DialogContent, Typography } from "@material-ui/core";
import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import i18n from "@eyeseetea/d2-ui-components/locales";

import { ImportSummaryErrors } from "../../../domain/entities/data-entry/ImportSummary";
import { BlockingErrors } from "../upload/BlockingErrors";
import { NonBlockingWarnings } from "../upload/NonBlockingWarnings";
import { glassColors, palette } from "../../pages/app/themes/dhis2.theme";

interface ImportSummaryErrorsDialogProps {
    importSummaryErrorsToShow: ImportSummaryErrors | null;
    onClose: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export const ImportSummaryErrorsDialog: React.FC<ImportSummaryErrorsDialogProps> = ({
    importSummaryErrorsToShow,
    onClose,
}) => {
    return (
        <ConfirmationDialog
            isOpen={!!importSummaryErrorsToShow}
            title={i18n.t("Import summary errors")}
            onCancel={onClose}
            cancelText={i18n.t("Close")}
            maxWidth={
                !importSummaryErrorsToShow?.blockingErrors?.length &&
                !importSummaryErrorsToShow?.nonBlockingErrors?.length
                    ? "xs"
                    : "lg"
            }
            fullWidth={true}
            disableEnforceFocus
        >
            <StyledDialogContent>
                {!importSummaryErrorsToShow?.blockingErrors?.length &&
                !importSummaryErrorsToShow?.nonBlockingErrors?.length ? (
                    <Typography>{i18n.t("Data imported without errors")}</Typography>
                ) : null}
                {importSummaryErrorsToShow?.blockingErrors?.length ? (
                    <BlockingErrors rows={importSummaryErrorsToShow.blockingErrors} showAllLines />
                ) : null}
                {importSummaryErrorsToShow?.nonBlockingErrors?.length ? (
                    <NonBlockingWarnings rows={importSummaryErrorsToShow.nonBlockingErrors} />
                ) : null}
            </StyledDialogContent>
        </ConfirmationDialog>
    );
};

export const StyledDialogContent = styled(DialogContent)`
    h3 {
        font-size: 22px;
        color: ${palette.text.primary};
        font-weight: 500;
    }
    .MuiTableContainer-root {
        border: none;
        box-shadow: none;
    }
    thead {
        border-bottom: 3px solid ${glassColors.greyLight};
        th {
            color: ${glassColors.grey};
            font-weight: 400;
            font-size: 15px;

            vertical-align: bottom;
            position: relative;
            &:after {
                content: "";
                height: 25px;
                position: absolute;
                right: 0;
                top: 30px;
            }
        }
    }
    tbody {
        tr {
            border: none;
            &:hover {
                background-color: ${glassColors.greyLight};
            }
            td {
                border-bottom: 1px solid ${glassColors.greyLight};
            }
        }
    }
    tr {
        td:first-child {
            color: ${glassColors.red};
            opacity: 1;
        }
    }
`;
