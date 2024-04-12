import i18n from "@eyeseetea/d2-ui-components/locales";

import { datasetOptions } from "../../../domain/entities/data-entry/amr-external/DatsetOptions";
import { FormControl, InputLabel, MenuItem, Select } from "@material-ui/core";
import { ChangeEvent } from "react";

interface BatchDropDownProps {
    batchId: string;
    previousUploadsBatchIds: string[];
    changeBatchId: (
        event: ChangeEvent<{
            value: unknown;
        }>
    ) => Promise<void>;
}
export const BatchDropDown: React.FC<BatchDropDownProps> = ({ batchId, previousUploadsBatchIds, changeBatchId }) => {
    return (
        <div className="batch-id">
            <h3>{i18n.t("Batch ID")}</h3>
            <FormControl variant="outlined" style={{ minWidth: 180 }}>
                <InputLabel id="dataset-label">{i18n.t("Choose a Dataset")}</InputLabel>
                <Select
                    value={batchId}
                    onChange={changeBatchId}
                    label={i18n.t("Choose a Dataset")}
                    labelId="dataset-label"
                    MenuProps={{ disableScrollLock: true }}
                >
                    {datasetOptions.map(({ label, value }) => (
                        <MenuItem key={value} value={value} disabled={previousUploadsBatchIds.includes(value)}>
                            {i18n.t(label)}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </div>
    );
};
