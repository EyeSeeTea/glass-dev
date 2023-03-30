import React, { useState } from "react";
import {
    Button,
    DialogContent,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { ConsistencyError } from "../../../domain/entities/data-entry/ImportSummary";
import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";

interface BlockingErrorsProps {
    rows: ConsistencyError[];
}

const RowLines = ({
    row,
    setIsOpen,
    setCurrentRowLines,
}: {
    row: ConsistencyError;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setCurrentRowLines: React.Dispatch<React.SetStateAction<number[]>>;
}): JSX.Element => {
    if (row.lines) {
        if (row.lines.length > 5) {
            return (
                <Typography>
                    {row.lines?.slice(0, 5).join(", ")}
                    {", "}
                    <Button
                        key={row.error}
                        onClick={() => {
                            setIsOpen(true);
                            setCurrentRowLines(row.lines || []);
                        }}
                        variant="text"
                        style={{ minWidth: "17px", padding: "3px 0px" }}
                    >
                        ...
                    </Button>
                </Typography>
            );
        } else {
            return <Typography>{row.lines?.join(", ")}</Typography>;
        }
    } else return <Typography>-</Typography>;
};

export const BlockingErrors: React.FC<BlockingErrorsProps> = ({ rows }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentRowLines, setCurrentRowLines] = useState<number[]>([]);
    return (
        <ContentWrapper>
            <Typography variant="h3">{i18n.t("Blocking Errors")}</Typography>

            <TableContainer component={Paper}>
                <Table className={"blocking-table"} aria-label="simple table">
                    <TableHead>
                        <TableRow>
                            <TableCell>{i18n.t("Name")}</TableCell>
                            <TableCell>{i18n.t("Count")}</TableCell>
                            <TableCell>{i18n.t("Lines")}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map(row => {
                            return (
                                <TableRow key={row.error}>
                                    <TableCell align="left">{row.error}</TableCell>
                                    <TableCell>{row.count}</TableCell>
                                    <TableCell>
                                        <RowLines
                                            row={row}
                                            setIsOpen={setIsOpen}
                                            setCurrentRowLines={setCurrentRowLines}
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
            <ConfirmationDialog
                isOpen={isOpen}
                title={i18n.t("Blocked Lines")}
                onCancel={() => setIsOpen(false)}
                cancelText={i18n.t("Done")}
                fullWidth={true}
                disableEnforceFocus
            >
                <DialogContent>
                    <Typography>{currentRowLines.join(", ")}</Typography>
                </DialogContent>
            </ConfirmationDialog>
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div``;
