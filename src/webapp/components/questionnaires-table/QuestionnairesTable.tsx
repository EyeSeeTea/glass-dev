import React from "react";
import styled from "styled-components";
import { Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@material-ui/core";
import { Create } from "@material-ui/icons";

import i18n from "../../../locales";
import { IconButton } from "../icon-button/IconButton";
import { glassColors } from "../../pages/app/themes/dhis2.theme";

export type QuestionnairesTableRow = {
    name: string;
};

export type QuestionnairesTableProps = {
    title: string;
    rows: QuestionnairesTableRow[];
    onClickEdit: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    onClickAddNew: () => void;
    disabledAddNew?: boolean;
};

export const QuestionnairesTable: React.FC<QuestionnairesTableProps> = props => {
    const { title, rows, onClickEdit, onClickAddNew, disabledAddNew = false } = props;

    return (
        <Container>
            <TableContainer component={Paper}>
                <Table aria-label={`${i18n.t("Questionnaires table")}: ${title}`}>
                    <StyledTableHead>
                        <TableRow>
                            <StyledTH>{title}</StyledTH>
                            <StyledTH>{i18n.t("Edit")}</StyledTH>
                        </TableRow>
                    </StyledTableHead>
                    <TableBody>
                        {rows.map(row => (
                            <StyledTableRow key={row.name}>
                                <StyledTextCell component="th" scope="row">
                                    {row.name}
                                </StyledTextCell>
                                <StyledIconCell>
                                    <StyledIconButton
                                        ariaLabel={i18n.t("Edit questionnaire")}
                                        icon={<Create />}
                                        onClick={onClickEdit}
                                    />
                                </StyledIconCell>
                            </StyledTableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <ButtonContainer>
                <Button onClick={onClickAddNew} disabled={disabledAddNew} variant="contained" color="primary">
                    {i18n.t("Add New")}
                </Button>
            </ButtonContainer>
        </Container>
    );
};

const Container = styled.div`
    flex: 1;
`;

const ButtonContainer = styled.div`
    margin-block-start: 8px;
`;

const StyledTableHead = styled(TableHead)`
    border-bottom: 3px solid ${glassColors.greyLight};
`;

const StyledTH = styled(TableCell)`
    color: ${glassColors.grey};
    font-weight: 400;
    font-size: 15px;
`;

const StyledTableRow = styled(TableRow)`
    border: none;
`;

const StyledTextCell = styled(TableCell)`
    width: auto;
    border-bottom: 1px solid ${glassColors.greyLight};
`;

const StyledIconCell = styled(TableCell)`
    width: 50px;
    border-bottom: 1px solid ${glassColors.greyLight};
`;

const StyledIconButton = styled(IconButton)`
    opacity: 0.5;
`;
