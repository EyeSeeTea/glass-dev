import React from "react";
import { Section } from "../../../domain/entities/DataForm";
import { DataFormInfo } from "./DataFormComponent";

// @ts-ignore
import { DataTable, TableHead, DataTableRow, DataTableColumnHeader, TableBody, DataTableCell } from "@dhis2/ui";
import { makeStyles } from "@material-ui/core";
import { DataElementItem } from "./DataElementItem";

export interface TableFormProps {
    dataFormInfo: DataFormInfo;
    section: Section;
}

const TableForm: React.FC<TableFormProps> = React.memo(props => {
    const { section, dataFormInfo } = props;
    const classes = useStyles();

    return (
        <div key={`table-${section.id}`} className={classes.wrapper}>
            <DataTable>
                <TableHead>
                    <DataTableRow>
                        <DataTableColumnHeader colSpan="2">
                            <span className={classes.header}>{section.name}</span>
                        </DataTableColumnHeader>
                    </DataTableRow>
                </TableHead>

                <TableBody>
                    {props.section.dataElements.map(dataElement => (
                        <DataTableRow key={dataElement.id}>
                            <DataTableCell>
                                <span>{dataElement.name}</span>
                            </DataTableCell>

                            <DataTableCell key={dataElement.id}>
                                <DataElementItem dataElement={dataElement} dataFormInfo={dataFormInfo} />
                            </DataTableCell>
                        </DataTableRow>
                    ))}
                </TableBody>
            </DataTable>
        </div>
    );
});

const useStyles = makeStyles({
    wrapper: { margin: 10 },
    header: { fontWeight: "bold" as const },
    center: { display: "table", margin: "0 auto" },
});

export default React.memo(TableForm);
