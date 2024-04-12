import React from "react";
import { Backdrop, TableBody, TableCell, TableRow, Button, DialogContent, Typography } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import dayjs from "dayjs";
import { DeleteOutline } from "@material-ui/icons";
import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import { CircularProgress } from "material-ui";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { isEditModeStatus } from "../../../utils/editModeStatus";
import { useStatusDataSubmission } from "../../hooks/useStatusDataSubmission";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useGlassCaptureAccess } from "../../hooks/useGlassCaptureAccess";
import { StyledLoaderContainer } from "../upload/ConsistencyChecks";
import { useCurrentPeriodContext } from "../../contexts/current-period-context";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";
import { ImportSummaryErrorsDialog } from "../import-summary-errors-dialog/ImportSummaryErrorsDialog";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { UploadsDataItem } from "../../entities/uploads";
import { useDatasets } from "./hooks/useDatasets";

export interface UploadsTableBodyProps {
    rows?: UploadsDataItem[];
    refreshUploads: React.Dispatch<React.SetStateAction<{}>>;
}

export const UploadsTableBody: React.FC<UploadsTableBodyProps> = ({ rows, refreshUploads }) => {
    const { currentModuleAccess } = useCurrentModuleContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const { currentPeriod } = useCurrentPeriodContext();

    const currentDataSubmissionStatus = useStatusDataSubmission(
        { id: currentModuleAccess.moduleId, name: currentModuleAccess.moduleName },
        currentOrgUnitAccess.orgUnitId,
        currentPeriod
    );
    const hasCurrentUserCaptureAccess = useGlassCaptureAccess();

    const {
        loading,
        open,
        importSummaryErrorsToShow,
        showConfirmationDialog,
        downloadFile,
        deleteDataset,
        handleShowImportSummaryErrors,
        hideConfirmationDialog,
        setImportSummaryErrorsToShow,
    } = useDatasets(refreshUploads, rows);

    return (
        <>
            {rows && (
                <StyledTableBody>
                    <TableRow>
                        <TableCell style={{ border: "none", padding: 0 }}>
                            <>
                                <Backdrop open={loading} style={{ color: "#fff", zIndex: 1 }}>
                                    <StyledLoaderContainer>
                                        <CircularProgress color="#fff" size={50} />
                                        <Typography variant="h6">{i18n.t("Deleting Files")}</Typography>
                                        <Typography variant="h5">
                                            {i18n.t(
                                                "This might take several minutes, do not refresh the page or press back."
                                            )}
                                        </Typography>
                                    </StyledLoaderContainer>
                                </Backdrop>
                                <ConfirmationDialog
                                    isOpen={open}
                                    title={
                                        moduleProperties.get(currentModuleAccess.moduleName)?.deleteConfirmation.title
                                    }
                                    onSave={deleteDataset}
                                    onCancel={hideConfirmationDialog}
                                    saveText={i18n.t("Ok")}
                                    cancelText={i18n.t("Cancel")}
                                    fullWidth={true}
                                    disableEnforceFocus
                                >
                                    <DialogContent>
                                        <Typography>
                                            {
                                                moduleProperties.get(currentModuleAccess.moduleName)?.deleteConfirmation
                                                    .description
                                            }
                                        </Typography>
                                    </DialogContent>
                                </ConfirmationDialog>
                                <ImportSummaryErrorsDialog
                                    importSummaryErrorsToShow={importSummaryErrorsToShow}
                                    onClose={() => setImportSummaryErrorsToShow(null)}
                                />
                            </>
                        </TableCell>
                    </TableRow>
                    {rows.map((row: UploadsDataItem) => (
                        <TableRow key={row.id} onClick={() => handleShowImportSummaryErrors(row)}>
                            <TableCell>{dayjs(row.uploadDate).format("DD-MM-YYYY")}</TableCell>
                            <TableCell>{row.period}</TableCell>
                            <TableCell>{row?.records || row?.rows}</TableCell>
                            <TableCell>{row.fileType}</TableCell>
                            {moduleProperties.get(currentModuleAccess.moduleName)?.isbatchReq && (
                                <TableCell style={{ opacity: 0.5 }}>{row.batchId}</TableCell>
                            )}
                            <TableCell>{i18n.t(row.status).toUpperCase()}</TableCell>
                            <TableCell style={{ opacity: 0.5 }}>
                                <Button
                                    onClick={event => {
                                        event.stopPropagation();
                                        downloadFile(row.fileId, row.fileName);
                                    }}
                                >
                                    <StyledUnderLineType title={row.fileName}>{row.fileName}</StyledUnderLineType>
                                </Button>
                            </TableCell>
                            <TableCell style={{ opacity: 0.5 }}>
                                {currentDataSubmissionStatus.kind === "loaded" ? (
                                    <Button
                                        onClick={e => {
                                            e.stopPropagation();
                                            showConfirmationDialog(row);
                                        }}
                                        disabled={
                                            !hasCurrentUserCaptureAccess ||
                                            !isEditModeStatus(currentDataSubmissionStatus.data.title)
                                        }
                                    >
                                        <DeleteOutline />
                                    </Button>
                                ) : (
                                    <CircularProgress size={20} />
                                )}
                            </TableCell>
                            <StyledCTACell className="cta">{row.importSummary && <ChevronRightIcon />}</StyledCTACell>
                        </TableRow>
                    ))}
                </StyledTableBody>
            )}
        </>
    );
};

const StyledTableBody = styled(TableBody)``;

const StyledCTACell = styled(TableCell)`
    text-align: center;
    svg {
        color: ${glassColors.grey};
    }
    &:hover {
        svg {
            color: ${glassColors.greyBlack};
        }
    }
`;

const StyledUnderLineType = styled(Typography)`
    max-width: 250px;
    text-overflow: ellipsis;
    overflow: hidden;
    &:hover {
        text-decoration: underline;
    }
`;
