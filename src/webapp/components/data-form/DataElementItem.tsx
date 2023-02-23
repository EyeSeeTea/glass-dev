import { makeStyles } from "@material-ui/core";
import React from "react";
import { DataElement } from "../../../domain/entities/DataElement";
import { DataFormInfo } from "./DataFormComponent";
import DataFormWidget from "./DataFormWidget";

export interface DataElementItemProps {
    dataElement: DataElement;
    dataFormInfo: DataFormInfo;
}

export const DataElementItem: React.FC<DataElementItemProps> = React.memo(props => {
    const { dataElement, dataFormInfo } = props;
    const classes = useStyles();

    return (
        <div id={`de-${dataElement.id}`} className={classes.valueWrapper}>
            <div className={classes.valueInput}>
                <DataFormWidget
                    dataElement={dataElement}
                    dataFormInfo={dataFormInfo}
                    onValueChange={dataFormInfo.data.save}
                />
            </div>
        </div>
    );
});

const useStyles = makeStyles({
    valueInput: { flexGrow: 1 },
    valueWrapper: { display: "flex" },
});
