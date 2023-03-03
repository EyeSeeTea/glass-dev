import { CategoryCombo } from "../../../entities/metadata/CategoryCombo";
import _ from "lodash";
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
          ]);
}

export function getCategoryOptionComboByOptionCodes(categoryCombo: CategoryCombo, codes: string[]) {
    const categoryOptions = categoryCombo.categories
        .map(cat => cat.categoryOptions)
        .flat()
        .filter(catOp => codes.includes(catOp.code.trim()));

    const uniqueCategoryOptions = _.unionBy(categoryOptions, catOption => catOption.code);

    if (uniqueCategoryOptions.length !== codes.length) {
        /* eslint-disable no-console */
        console.error(
            `All codes not found as category combination in categoryCombo ${categoryCombo.name}. codes: ${codes.join(
                ","
            )}`
        );
        return "";
    }

    //TODO: this is a code brought from old repository written by sneha, we need improve it without to use let

    //The categoryOptionComboId will be common between both category options.

    let commonCategoryOptionCombos = uniqueCategoryOptions[0]?.categoryOptionCombos;
    uniqueCategoryOptions.map(co => {
        return (commonCategoryOptionCombos = co.categoryOptionCombos.filter(co =>
            commonCategoryOptionCombos?.some(c => c === co)
        ));
    });

    if (commonCategoryOptionCombos?.length === 1) {
        return commonCategoryOptionCombos[0];
    } else return "";
}
