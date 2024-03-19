import { CategoryCombo } from "../../../entities/metadata/CategoryCombo";
import { ExternalData } from "../../../entities/data-entry/amr-external/ExternalData";
import { DataElement } from "../../../entities/metadata/DataSet";

export const AMR_SPECIMEN_GENDER_AGE_ORIGIN_CC_ID = "OwKsZQnHCJu";
export const defaultCategoryCombo = "bjDvmb4bfuf";

export function getCategoryOptionComboByDataElement(
    dataElement: DataElement,
    dataElement_CC: CategoryCombo,
    externalData: ExternalData
) {
    //TODO: for unknown values for gender, origin and ageGroup the files contain de value UKN
    // in the metadata we have a category option separate for every category
    // this funcion map the value in the file to the expected in category option
    return dataElement.categoryCombo.id === defaultCategoryCombo
        ? { categoryOptionComboId: "", error: "" }
        : getCategoryOptionComboByOptionCodes(dataElement_CC, [
              externalData.SPECIMEN.trim(),
              externalData.GENDER.replace("UNK", "UNKG").trim(),
              externalData.ORIGIN.replace("UNK", "UNKO").trim(),
              externalData.AGEGROUP.replace("UNK", "UNKA").trim(),
          ]);
}

export function getCategoryOptionComboByOptionCodes(categoryCombo: CategoryCombo, codes: string[]) {
    const categoryOptionCombo = categoryCombo.categoryOptionCombos.find(
        catOpComb =>
            catOpComb.categoryOptions.filter(catOp => codes.includes(catOp.code.trim())).length === codes.length
    );

    if (!categoryOptionCombo) {
        const errorMessage = `Combination of ${categoryCombo.name} not found for codes: "${codes.join(",")}"`;
        return { categoryOptionComboId: "", error: errorMessage };
    }

    return { categoryOptionComboId: categoryOptionCombo.id, error: "" };
}
