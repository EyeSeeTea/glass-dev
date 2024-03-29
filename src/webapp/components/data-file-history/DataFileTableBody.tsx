import React, { useCallback } from "react";
import { Button, TableBody, TableCell, TableRow } from "@material-ui/core";
import styled from "styled-components";
import { DataFileHistoryItemProps } from "./DataFileTable";
import CloudDownloadIcon from "@material-ui/icons/CloudDownload";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import dayjs from "dayjs";
import { useAppContext } from "../../contexts/app-context";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { ImportSummaryErrors } from "../../../domain/entities/data-entry/ImportSummary";
import { ImportSummaryErrorsDialog } from "../import-summary-errors-dialog/ImportSummaryErrorsDialog";

export interface DataFileTableBodyProps {
    rows?: DataFileHistoryItemProps[];
}

export const DataFileTableBody: React.FC<DataFileTableBodyProps> = ({ rows }) => {
    const [importSummaryErrorsToShow, setImportSummaryErrorsToShow] = React.useState<ImportSummaryErrors | null>(null);

    const { compositionRoot } = useAppContext();
    const { currentModuleAccess } = useCurrentModuleContext();

    const download = (fileId: string, fileName: string) => {
        compositionRoot.glassDocuments.download(fileId).run(
            file => {
                //download file automatically
                const downloadSimulateAnchor = document.createElement("a");
                downloadSimulateAnchor.href = URL.createObjectURL(file);
                downloadSimulateAnchor.download = fileName;
                // simulate link click
                document.body.appendChild(downloadSimulateAnchor);
                downloadSimulateAnchor.click();
            },
            () => {}
        );
    };

    const handleShowImportSummaryErrors = useCallback((row: DataFileHistoryItemProps) => {
        if (row.importSummary) {
            setImportSummaryErrorsToShow(row.importSummary);
        }
    }, []);

    return (
        <>
            {rows && rows.length ? (
                <StyledTableBody>
                    {rows.map((row: DataFileHistoryItemProps) => (
                        <TableRow key={row.id} onClick={() => handleShowImportSummaryErrors(row)}>
                            <TableCell>{row.fileType}</TableCell>
                            <TableCell>{row.countryCode.toUpperCase()}</TableCell>
                            {moduleProperties.get(currentModuleAccess.moduleName)?.isbatchReq && (
                                <TableCell>{row.batchId}</TableCell>
                            )}
                            <TableCell>{row.period}</TableCell>
                            {moduleProperties.get(currentModuleAccess.moduleName)?.isSpecimenReq && (
                                <TableCell style={{ maxWidth: "150px", wordWrap: "break-word" }}>
                                    {row.specimens.join(", ")}
                                </TableCell>
                            )}
                            <TableCell>{row.status}</TableCell>
                            <TableCell>{dayjs(row.uploadDate).format("YYYY-MM-DD HH:mm:ss")}</TableCell>
                            <TableCell>{row.fileName}</TableCell>
                            <TableCell>
                                <Button
                                    onClick={event => {
                                        event.stopPropagation();
                                        download(row.fileId, row.fileName);
                                    }}
                                >
                                    <CloudDownloadIcon color="error" />
                                </Button>
                            </TableCell>
                            <TableCell>{row?.records || row?.rows}</TableCell>
                            <StyledCTACell className="cta">{row.importSummary && <ChevronRightIcon />}</StyledCTACell>
                        </TableRow>
                    ))}
                </StyledTableBody>
            ) : (
                <StyledTableBody>
                    <TableRow>
                        <TableCell>No data found...</TableCell>
                    </TableRow>
                </StyledTableBody>
            )}
            <ImportSummaryErrorsDialog
                importSummaryErrorsToShow={importSummaryErrorsToShow}
                onClose={() => setImportSummaryErrorsToShow(null)}
            />
        </>
    );
};

export const StyledTableBody = styled(TableBody)`
    td.cta {
        text-align: center;
        svg {
            color: ${glassColors.grey};
        }
        &:hover {
            svg {
                color: ${glassColors.greyBlack};
            }
        }
    }
`;

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
