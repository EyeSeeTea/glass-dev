import { TableCell, TableContainer, Typography } from "@material-ui/core";
import styled from "styled-components";
import { glassColors } from "../../pages/app/themes/dhis2.theme";

export const StyledHeadTableCell = styled(TableCell)`
    color: ${glassColors.grey};
    font-size: 18px;
    border-bottom: 4px solid #e0e0e0;
    padding: 8px;
`;

export const StyledTableCell = styled(TableCell)`
    font-size: 18px;
    border-bottom: 1px solid #e0e0e0;
`;

export const SideTitle = styled(Typography)`
    font-size: 28px;
    font-weight: 450;
`;

export const StyledTableContainer = styled(TableContainer)`
    margin-top: 16px;
`;
