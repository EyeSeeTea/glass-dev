import { parseDateStrict } from "../utils/dateValidation";
import { CustomDataColumns } from "../../../entities/data-entry/amr-individual-fungal-external/RISIndividualFungalData";

enum RISIndividualFungalFileColumns {
    COUNTRY = "COUNTRY",
    YEAR = "YEAR",
    ADMISSION_DATE = "DATEOFHOSPITALISATION_VISIT",
    SPECIMEN_DATE = "SAMPLE_DATE",
}

export const AMR_INDIVIDUAL_FUNGAL_DATE_COLUMNS = [
    RISIndividualFungalFileColumns.SPECIMEN_DATE,
    RISIndividualFungalFileColumns.ADMISSION_DATE,
];

/** COUNTRY in each row must be the same as the selected org unit */
export function checkCountry(dataItem: CustomDataColumns, orgUnit: string): string | null {
    const countryValue = dataItem.find(item => item.key === RISIndividualFungalFileColumns.COUNTRY)?.value;
    if (countryValue !== orgUnit) {
        return `Country is different: Selected Data Submission Country : ${orgUnit}, Country in file: ${countryValue}`;
    }
    return null;
}

/** YEAR in each row must be the same as the selected period */
export function checkPeriod(dataItem: CustomDataColumns, period: string): string | null {
    const yearValue = dataItem.find(item => item.key === RISIndividualFungalFileColumns.YEAR)?.value;
    if (yearValue?.toString() !== period) {
        return `Year is different: Selected Data Submission Year : ${period}, Year in file: ${yearValue}`;
    }
    return null;
}

/** SAMPLE_DATE must have the same year as YEAR in the same row.
 * If no SAMPLE_DATE is provided, it defaults to period-01-01 */
export function checkSpecimenDate(dataItem: CustomDataColumns, period: string): string | null {
    const rawSpecimenDate = dataItem
        .find(item => item.key === RISIndividualFungalFileColumns.SPECIMEN_DATE)
        ?.value?.toString();
    // parseDateStrict returns null for wrong-format values; runCustomValidations blocks before
    // reaching here in that case, so the fallback is only used when the field is absent.
    const specimenDate = parseDateStrict(rawSpecimenDate) ?? `${period}-01-01`;
    const yearValue = dataItem.find(item => item.key === RISIndividualFungalFileColumns.YEAR)?.value;
    const specimenYear = specimenDate.split("-")[0];
    if (specimenYear !== yearValue?.toString()) {
        return `${RISIndividualFungalFileColumns.SPECIMEN_DATE} year is different from ${
            RISIndividualFungalFileColumns.YEAR
        }: Specimen date is: ${specimenDate}, Year in file: ${yearValue}`;
    }
    return null;
}

/** DATEOFHOSPITALISATION_VISIT cannot be prior to 2016, and must be before SPECIMEN_DATE */
export function checkAdmissionDate(dataItem: CustomDataColumns): string | null {
    const MIN_ADMISSION_DATE = "2016-01-01";
    const admissionDate = parseDateStrict(
        dataItem.find(item => item.key === RISIndividualFungalFileColumns.ADMISSION_DATE)?.value?.toString()
    );
    if (admissionDate) {
        if (admissionDate < MIN_ADMISSION_DATE) {
            return `${RISIndividualFungalFileColumns.ADMISSION_DATE} cannot be prior to ${MIN_ADMISSION_DATE}: ${admissionDate}`;
        }
        const specimenDate = parseDateStrict(
            dataItem.find(item => item.key === RISIndividualFungalFileColumns.SPECIMEN_DATE)?.value?.toString()
        );
        if (specimenDate && admissionDate > specimenDate) {
            return `${RISIndividualFungalFileColumns.ADMISSION_DATE} cannot be after ${
                RISIndividualFungalFileColumns.SPECIMEN_DATE
            }: Admission Date: ${admissionDate}, Specimen Date: ${specimenDate}`;
        }
    }
    return null;
}
