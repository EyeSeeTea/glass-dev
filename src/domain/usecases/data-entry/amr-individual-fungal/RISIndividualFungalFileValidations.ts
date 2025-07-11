import moment from "moment";
import { CustomDataColumns } from "../../../entities/data-entry/amr-individual-fungal-external/RISIndividualFungalData";

enum RISIndividualFungalFileColumns {
    COUNTRY = "COUNTRY",
    YEAR = "YEAR",
    ADMISSION_DATE = "DATEOFHOSPITALISATION_VISIT",
    SPECIMEN_DATE = "SAMPLE_DATE",
}

/** COUNTRY in each row must be the same as the selected org unit */
export function checkCountry(dataItem: CustomDataColumns, orgUnit: string): string | null {
    const countryValue = dataItem.find(item => item.key === RISIndividualFungalFileColumns.COUNTRY)?.value;
    if (countryValue !== orgUnit) {
        return `Country is different: Selected Data Submission Country : ${orgUnit}, Country in file: ${countryValue}`;
    }
    return null;
}

/** YEAR in each row must be the same as the selected period*/
export function checkPeriod(dataItem: CustomDataColumns, period: string): string | null {
    const yearValue = dataItem.find(item => item.key === RISIndividualFungalFileColumns.YEAR)?.value;
    if (yearValue?.toString() !== period) {
        return `Year is different: Selected Data Submission Year : ${period}, Year in file: ${yearValue}`;
    }
    return null;
}

/**  SAMPLE_DATE must have the same year as YEAR in the same row.
 * If no SAMPLE_DATE is provided, it defaults to 01-01-period */
export function checkSpecimenDate(dataItem: CustomDataColumns, period: string): string | null {
    const specimenDateValue =
        dataItem.find(item => item.key === RISIndividualFungalFileColumns.SPECIMEN_DATE)?.value || `01-01-${period}`;
    const yearValue = dataItem.find(item => item.key === RISIndividualFungalFileColumns.YEAR)?.value;
    if (moment(specimenDateValue).year().toString() !== yearValue?.toString()) {
        return `${RISIndividualFungalFileColumns.SPECIMEN_DATE} year is different from ${
            RISIndividualFungalFileColumns.YEAR
        }: Specimen date is: ${moment(specimenDateValue).format("YYYY-MM-DD")}, Year in file: ${yearValue}`;
    }
    return null;
}

/** DATEOFHOSPITALISATION_VISIT cannot be prior to 2016, and must be before SPECIMEN_DATE */
export function checkAdmissionDate(dataItem: CustomDataColumns): string | null {
    const MIN_ADMISSION_DATE = "2016-01-01";
    const admissionDateValue = dataItem.find(item => item.key === RISIndividualFungalFileColumns.ADMISSION_DATE)?.value;
    const specimenDateValue = dataItem.find(item => item.key === RISIndividualFungalFileColumns.SPECIMEN_DATE)?.value;
    if (admissionDateValue) {
        if (moment(admissionDateValue).isBefore(MIN_ADMISSION_DATE)) {
            return `${RISIndividualFungalFileColumns.ADMISSION_DATE} cannot be prior to ${MIN_ADMISSION_DATE}: ${moment(
                admissionDateValue
            ).format("YYYY-MM-DD")}`;
        }
        if (moment(admissionDateValue).isAfter(moment(specimenDateValue))) {
            return `${RISIndividualFungalFileColumns.ADMISSION_DATE} cannot be after ${
                RISIndividualFungalFileColumns.SPECIMEN_DATE
            }: Admission Date: ${moment(admissionDateValue).format("YYYY-MM-DD")}, Specimen Date: ${moment(
                specimenDateValue
            ).format("YYYY-MM-DD")}`;
        }
    }
    return null;
}
