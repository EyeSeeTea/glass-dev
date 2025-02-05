import React from "react";
import { Paper, Table, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from "@material-ui/core";
import styled from "styled-components";
import { UploadsTableBody } from "./UploadsTableBody";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { glassColors, palette } from "../../pages/app/themes/dhis2.theme";
import { UploadsDataItem } from "../../entities/uploads";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";
import { InfoOutlined } from "@material-ui/icons";
import { DataSubmissionStatusTypes } from "../../../domain/entities/GlassDataSubmission";
import { GlassUploads } from "../../../domain/entities/GlassUploads";
import { GlassAsyncUpload } from "../../../domain/entities/GlassAsyncUploads";

export interface UploadsTableProps {
    title: string;
    items?: UploadsDataItem[];
    allUploads?: GlassUploads[];
    className?: string;
    refreshUploads: React.Dispatch<React.SetStateAction<{}>>;
    refreshAsyncUploads: React.Dispatch<React.SetStateAction<{}>>;
    asyncUploads: GlassAsyncUpload[];
    showComplete?: boolean;
    setIsDatasetMarkAsCompleted?: React.Dispatch<React.SetStateAction<boolean>>;
    setRefetchStatus?: React.Dispatch<React.SetStateAction<DataSubmissionStatusTypes | undefined>>;
}

// TODO: replace Table with MUI Datagrid
export const UploadsTable: React.FC<UploadsTableProps> = ({
    title,
    items,
    allUploads,
    refreshAsyncUploads,
    asyncUploads,
    className,
    refreshUploads,
    showComplete,
    setIsDatasetMarkAsCompleted,
    setRefetchStatus,
}) => {
    const { currentModuleAccess } = useCurrentModuleContext();
    return (
        <ContentWrapper className={className}>
            <Typography variant="h3">{i18n.t(title)}</Typography>

            <TableContainer component={Paper} style={{ minWidth: "1000px", overflowX: "auto" }}>
                <Table className={"blocking-table"} aria-label="simple table">
                    <TableHead>
                        <TableRow>
                            <TableCell>{i18n.t("Uploaded")}</TableCell>
                            <TableCell>{i18n.t("Period")}</TableCell>
                            {currentModuleAccess.moduleName === "AMC" ? (
                                <TableCell>{i18n.t("Products/Substances")}</TableCell>
                            ) : (
                                <TableCell>{i18n.t("Rows")}</TableCell>
                            )}
                            <TableCell>{i18n.t("Type")}</TableCell>
                            {moduleProperties.get(currentModuleAccess.moduleName)?.isbatchReq && (
                                <TableCell>{i18n.t("Batch ID")}</TableCell>
                            )}
                            <TableCell>
                                {i18n.t("Status")}
                                <Tooltip
                                    title={
                                        <>
                                            <Typography variant="caption">
                                                {i18n.t(
                                                    "UPLOADED - The file has been uploaded, but data has not been imported as upload was discarded in Step 1, due to errors in Step 2 or errors in async uploads."
                                                )}
                                                <br />
                                            </Typography>
                                            <Typography variant="caption">
                                                {i18n.t(
                                                    "MARKED TO BE UPLOADED - The file has been uploaded, but data has not been imported as data is waiting to be uploaded asynchronously."
                                                )}
                                                <br />
                                            </Typography>
                                            <Typography variant="caption">
                                                {i18n.t(
                                                    "UPLOADING ASYNC IN PROGRESS - The file has been uploaded, but the data has not been imported because it is being uploaded asynchronously."
                                                )}
                                                <br />
                                            </Typography>
                                            <Typography variant="caption">
                                                {i18n.t(
                                                    "IMPORTED - The data has been imported, but validations(if applicable) were not run successfully in Step 2 or in async uploads."
                                                )}
                                                <br />
                                            </Typography>
                                            <Typography variant="caption">
                                                {i18n.t(
                                                    "VALIDATED - The data has been imported and automatically validated, but the data was not reviewed by user in Step 3 or has been imported asynchronously."
                                                )}
                                                <br />
                                            </Typography>
                                            <Typography variant="caption">
                                                {i18n.t(
                                                    "COMPLETED - The data has been imported, validated and reviewed successfully."
                                                )}
                                                <br />
                                            </Typography>
                                        </>
                                    }
                                >
                                    <InfoOutlined fontSize="small" />
                                </Tooltip>
                            </TableCell>
                            <TableCell>{i18n.t("Download File")}</TableCell>
                            <TableCell>{i18n.t("Delete")}</TableCell>
                            {showComplete && <TableCell>{i18n.t("Complete")}</TableCell>}
                        </TableRow>
                    </TableHead>

                    <UploadsTableBody
                        rows={items}
                        refreshUploads={refreshUploads}
                        showComplete={showComplete}
                        setIsDatasetMarkAsCompleted={setIsDatasetMarkAsCompleted}
                        setRefetchStatus={setRefetchStatus}
                        allUploads={allUploads}
                        refreshAsyncUploads={refreshAsyncUploads}
                        asyncUploads={asyncUploads}
                    />
                </Table>
            </TableContainer>
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    overflow-x: auto;
    h3 {
        font-size: 22px;
        color: ${palette.text.primary};
        font-weight: 500;
    }
    .MuiTableContainer-root {
        border: none;
        box-shadow: none;
        overflow-x: auto;
    }
    thead {
        border-bottom: 3px solid ${glassColors.greyLight};
        th {
            color: ${glassColors.grey};
            font-weight: 400;
            font-size: 15px;
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
            td:nth-child(5) {
                text-transform: uppercase;
            }
            td:nth-child(7) {
                text-transform: uppercase;
            }
        }
    }
    &.error-group {
        tbody {
            td:nth-child(7) {
                color: ${glassColors.red};
                opacity: 1;
            }
        }
    }
`;
