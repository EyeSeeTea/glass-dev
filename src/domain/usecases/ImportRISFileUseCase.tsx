import { DataValueSetsPostRequest, DataValueSetsPostResponse } from "@eyeseetea/d2-api/api";
import { UseCase } from "../../CompositionRoot";
import { GlassImportRISFileDefaultRepository } from "../../data/repositories/GlassImportRISFileDefaultRepository";
import { FutureData } from "../entities/Future";
import { SpreadsheetXlsxDataSource } from "../repositories/SpreadsheetXlsxRepository";

const AMR_AMR_DS_INPUT_FILES_RIS_ID = "CeQPmXgrhHF";
export class ImportRISFileUseCase implements UseCase {
    constructor(private glassImportRISFile: GlassImportRISFileDefaultRepository) {}

    public async execute(inputFile: File): Promise<FutureData<DataValueSetsPostResponse>[] | undefined> {
        const spreadsheet = await new SpreadsheetXlsxDataSource().read(inputFile);
        const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR RIS

        if (sheet !== undefined) {
            const responses = sheet.rows.map(async row => {
                const request: DataValueSetsPostRequest = {
                    dataSet: AMR_AMR_DS_INPUT_FILES_RIS_ID,
                    period: "",
                    orgUnit: "",
                    attributeOptionCombo: "",
                    dataValues: [],
                };
                let categoryOptionCombo: string | undefined = "";

                if (row.COUNTRY) request.orgUnit = await this.glassImportRISFile.getOrgUnit(row.COUNTRY);
                if (row.YEAR) request.period = row.YEAR;

                const { dataElements, attributeOptionComboList } =
                    await this.glassImportRISFile.getDataElementsAndAttributeCombo(AMR_AMR_DS_INPUT_FILES_RIS_ID);

                const attributeOptionComboCodes = attributeOptionComboList.map(cc => {
                    return row[cc] || "";
                });
                request.attributeOptionCombo = await this.glassImportRISFile.getCategoryOptionCombo(
                    attributeOptionComboCodes
                );

                //TO DO : The same categoryCombo is used for each dataElement.
                //So  making only one call to server. Should we make a call for each dataElement?
                //Is there a better way to do this
                if (row.SPECIMEN && row.GENDER && row.ORIGIN && row.AGEGROUP) {
                    categoryOptionCombo = await this.glassImportRISFile.getCategoryOptionCombo([
                        row.SPECIMEN,
                        row.GENDER,
                        row.ORIGIN,
                        row.AGEGROUP,
                    ]);
                }

                const dataValues = dataElements.map(de => {
                    //There is an conflict in excel. SPECIMEN, PATHOGEN and ANTIBIOTIC are both
                    //category  and data element. For now, hardcode this handling.
                    //Ideally, if both are required, either there should be 2 columns with same value and different column headers
                    //Or category  and data element should have same code.
                    let dataElementCode = de.code;
                    if (dataElementCode === "ANTIBIOTIC_DEA") {
                        dataElementCode = "ANTIBIOTIC";
                    } else if (dataElementCode === "AMR_AMR_DEA_PATHOGEN") {
                        dataElementCode = "PATHOGEN";
                    } else if (dataElementCode === "AMR_AMR_DEA_SPECIMEN_TYPE_RIS") {
                        dataElementCode = "SPECIMEN";
                    }
                    const rowValue = row[dataElementCode];

                    return {
                        dataElement: de.id,
                        categoryOptionCombo: categoryOptionCombo,
                        value: rowValue !== undefined ? rowValue : "",
                    };
                });

                request.dataValues = dataValues;

                const importResult = await this.glassImportRISFile.importRISFile(
                    { importStrategy: "CREATE_AND_UPDATE" },
                    request
                );
                return importResult;
            });

            const resolvedResponses = await Promise.all(responses);
            return resolvedResponses;
        }
    }
}
