import React from "react";
import { TableBody, TableCell, TableRow } from "@material-ui/core";
import styled from "styled-components";
import { CallsHistoryItemProps } from "./CallsTable";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { StatusCapsule } from "./StatusCapsule";
import { useHistory, useLocation } from "react-router-dom";
import i18n from "@eyeseetea/d2-ui-components/locales";

export interface CallsTableBodyProps {
    rows?: CallsHistoryItemProps[];
}

export const CallsTableBody: React.FC<CallsTableBodyProps> = ({ rows }) => {
    const history = useHistory();
    // TODO: remove the next two lines and create a global hook to get current module
    const location = useLocation().pathname.slice(1);
    const moduleName = location.substring(location.indexOf("/") + 1);

    const click = () => {
        history.push(`/current-call/${moduleName}`);
    };

    return (
        <>
            {rows && rows.length ? (
                <StyledTableBody>
                    {rows.map((row: CallsHistoryItemProps) => (
                        <TableRow key={row.id} onClick={click}>
                            <TableCell>{row.year}</TableCell>
                            <TableCell>{row.open_status}</TableCell>
                            <TableCell>
                                <StatusCapsule status={row.status} />
                            </TableCell>
                            <TableCell className="cta">
                                <ChevronRightIcon />
                            </TableCell>
                        </TableRow>
                    ))}
                </StyledTableBody>
            ) : (
                <p>{i18n.t("No data found...")}</p>
            )}
        </>
    );
};

const StyledTableBody = styled(TableBody)`
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
