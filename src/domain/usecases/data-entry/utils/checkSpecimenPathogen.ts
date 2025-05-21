import i18n from "../../../../locales";
import { CustomDataColumns } from "../../../entities/data-entry/amr-individual-fungal-external/RISIndividualFungalData";
import { ConsistencyError } from "../../../entities/data-entry/ImportSummary";
import { PATHOGEN_ANTIBIOTIC_MAP } from "../../../entities/GlassModule";

type SpecimenPathogenChekable = {
    SPECIMEN: string;
    PATHOGEN: string;
    ANTIBIOTIC: string;
};

function mapCustomDataColumnsToSpecimenPathogenAntibiotic(
    customDataColumns: CustomDataColumns[]
): SpecimenPathogenChekable[] {
    const getValue = (row: CustomDataColumns, key: keyof SpecimenPathogenChekable): string => {
        const element = row.find(el => el.key === key);
        if (element && typeof element.value === "string") {
            return element.value;
        }
        return "";
    };
    return customDataColumns.map(row => ({
        SPECIMEN: getValue(row, "SPECIMEN"),
        PATHOGEN: getValue(row, "PATHOGEN"),
        ANTIBIOTIC: getValue(row, "ANTIBIOTIC"),
    }));
}

export function checkSpecimenPathogenFromDataColumns(
    dataColumns: CustomDataColumns[],
    specimenPathogenValidations: Record<string, PATHOGEN_ANTIBIOTIC_MAP[]>
): ConsistencyError[] {
    const data = mapCustomDataColumnsToSpecimenPathogenAntibiotic(dataColumns);
    return checkSpecimenPathogen(data, specimenPathogenValidations);
}

export function checkSpecimenPathogen(
    data: SpecimenPathogenChekable[],
    specimenPathogenValidations: Record<string, PATHOGEN_ANTIBIOTIC_MAP[]>
): ConsistencyError[] {
    const errors = _(
        data.map((item, index) => {
            const allowPathogens = specimenPathogenValidations[item.SPECIMEN];

            const pathogenAntibiotics = allowPathogens?.find(pathogen => pathogen[item.PATHOGEN]);

            if (!pathogenAntibiotics) {
                return {
                    error: i18n.t(
                        `The specimen, pathogen, antibiotic combination you have provided is not allowed. Specimen ${item.SPECIMEN}, Pathogen ${item.PATHOGEN}, Antibiotic ${item.ANTIBIOTIC}`
                    ),
                    line: index + 1,
                };
            } else {
                if (!pathogenAntibiotics?.[item.PATHOGEN]?.includes(item.ANTIBIOTIC)) {
                    return {
                        error: i18n.t(
                            `The specimen, pathogen, antibiotic combination you have provided is not allowed. Specimen ${item.SPECIMEN}, Pathogen ${item.PATHOGEN}, Antibiotic ${item.ANTIBIOTIC}`
                        ),
                        line: index + 1,
                    };
                }
            }
        })
    )
        .omitBy(_.isNil)
        .groupBy(error => error?.error)
        .mapValues(value => value.map(el => el?.line || 0))
        .value();

    return Object.keys(errors).map(error => ({
        error: error,
        count: errors[error]?.length || 0,
        lines: errors[error] || [],
    }));
}
