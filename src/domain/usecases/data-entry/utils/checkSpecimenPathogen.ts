import i18n from "../../../../locales";
import { RISData } from "../../../entities/data-entry/amr-external/RISData";
import { ConsistencyError } from "../../../entities/data-entry/ImportSummary";
import { PATHOGEN_ANTIBIOTIC_MAP } from "../../../entities/GlassModule";

export function checkSpecimenPathogen(
    risData: RISData[],
    specimenPathogenValidations: Record<string, PATHOGEN_ANTIBIOTIC_MAP[]>
): ConsistencyError[] {
    const errors = _(
        risData.map((item, index) => {
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
