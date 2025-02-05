import _ from "lodash";
import i18n from "../../../../locales";
import { RISData } from "../../../entities/data-entry/amr-external/RISData";
import { SampleData } from "../../../entities/data-entry/amr-external/SampleData";
import { ConsistencyError } from "../../../entities/data-entry/ImportSummary";

export function checkDuplicateRowsRIS(fileData: RISData[]): ConsistencyError[] {
    const concantRowIdentifiers = fileData.map((item, index) => {
        return {
            line: index + 1,
            rowIdentifier: `${item.SPECIMEN}, ${item.PATHOGEN}, ${item.GENDER}, ${item.ORIGIN}, ${item.AGEGROUP}, ${item.ANTIBIOTIC}, ${item.BATCHIDDS}`,
        };
    });

    const duplicateRows = _(concantRowIdentifiers)
        .groupBy("rowIdentifier")
        .filter(group => group.length > 1)
        .value();

    const errors = duplicateRows.map(duplicateRow => ({
        error: i18n.t(`Duplicate rows found for combination : ${duplicateRow[0]?.rowIdentifier}`),
        count: duplicateRow.length,
        lines: duplicateRow.map(row => row.line),
    }));

    return errors;
}

export function checkDuplicateRowsSAMPLE(fileData: SampleData[]): ConsistencyError[] {
    const concantRowIdentifiers = fileData.map((item, index) => {
        return {
            line: index + 1,
            rowIdentifier: `${item.SPECIMEN}, ${item.GENDER}, ${item.ORIGIN}, ${item.AGEGROUP}, ${item.BATCHIDDS}`,
        };
    });

    const duplicateRows = _(concantRowIdentifiers)
        .groupBy("rowIdentifier")
        .filter(group => group.length > 1)
        .value();

    const errors = duplicateRows.map(duplicateRow => ({
        error: i18n.t(`Duplicate rows found for combination : ${duplicateRow[0]?.rowIdentifier}`),
        count: duplicateRow.length,
        lines: duplicateRow.map(row => row.line),
    }));

    return errors;
}
