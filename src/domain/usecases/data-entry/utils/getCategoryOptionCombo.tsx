import { CategoryCombo } from "../../../entities/metadata/CategoryCombo";
import { ExternalData } from "../../../entities/data-entry/external/ExternalData";
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
        ? undefined
        : getCategoryOptionComboByOptionCodes(dataElement_CC, [
              externalData.SPECIMEN,
              externalData.GENDER.replace("UNK", "UNKG"),
              externalData.ORIGIN.replace("UNK", "UNKO"),
              externalData.AGEGROUP.replace("UNK", "UNKA"),
          ]).categoryOptionComboId;
}

export function getCategoryOptionComboByOptionCodes(categoryCombo: CategoryCombo, codes: string[]) {
    const categoryOptionCombo = categoryCombo.categoryOptionCombos.find(
        catOpComb =>
            catOpComb.categoryOptions.filter(catOp => codes.includes(catOp.code.trim())).length === codes.length
    );

    if (!categoryOptionCombo) {
        const errorMessage = `categoryOptionCombos not found in categoryCombo ${
            categoryCombo.name
        } for codes: ${codes.join(",")}`;
        return { categoryOptionComboId: "", error: errorMessage };
    }

    return { categoryOptionComboId: categoryOptionCombo.id, error: "" };
}
