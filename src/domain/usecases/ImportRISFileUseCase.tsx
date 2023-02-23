import { DataValueSetsPostRequest, DataValueSetsPostResponse } from "@eyeseetea/d2-api/api";
import { UseCase } from "../../CompositionRoot";
import { GlassImportRISFileDefaultRepository } from "../../data/repositories/GlassImportRISFileDefaultRepository";
import { FutureData } from "../entities/Future";
import { SpreadsheetXlsxDataSource } from "../repositories/SpreadsheetXlsxRepository";

const AMR_AMR_DS_INPUT_FILES_RIS_ID = "CeQPmXgrhHF";
export class ImportRISFileUseCase implements UseCase {
    constructor(private glassImportRISFile: GlassImportRISFileDefaultRepository) {}

    public async execute(inputFile: File): Promise<Promise<FutureData<DataValueSetsPostResponse>>[]> {
        const spreadsheet = await new SpreadsheetXlsxDataSource().read(inputFile);

        return await spreadsheet.sheets.flatMap(sheet => {
            return sheet.rows.flatMap(async row => {
                const request: DataValueSetsPostRequest = {
                    dataSet: AMR_AMR_DS_INPUT_FILES_RIS_ID,
                    period: "",
                    orgUnit: "",
                    attributeOptionCombo: "",
                    dataValues: [],
                };
                let categoryOptionCombo: string | undefined = "";

                //TO DO : instead of using fixed column index, get the column number from header
                if (row.COUNTRY) request.orgUnit = await this.glassImportRISFile.getOrgUnit(row.COUNTRY);
                if (row.YEAR) request.period = row.YEAR;
                if (row.PATHOGEN && row.ANTIBIOTIC)
                    request.attributeOptionCombo = await this.glassImportRISFile.getCategoryOptionCombo([
                        row.PATHOGEN,
                        row.ANTIBIOTIC,
                    ]);
                if (row.SPECIMEN && row.GENDER && row.ORIGIN && row.AGEGROUP) {
                    categoryOptionCombo = await this.glassImportRISFile.getCategoryOptionCombo([
                        row.SPECIMEN,
                        row.GENDER,
                        row.ORIGIN,
                        row.AGEGROUP,
                    ]);
                }

                if (row.ANTIBIOTIC !== undefined) {
                    const dataElementId = await this.glassImportRISFile.getDataElementId("Antibiotic (DEA)"); //TO DO : get from header
                    request.dataValues.push({
                        dataElement: dataElementId || "",
                        value: row.ANTIBIOTIC,
                        categoryOptionCombo: categoryOptionCombo,
                    });
                }

                if (row.PATHOGEN !== undefined) {
                    const dataElementId = await this.glassImportRISFile.getDataElementId("Pathogen (DEA)"); //TO DO : get from header
                    request.dataValues.push({
                        dataElement: dataElementId || "",
                        value: row.PATHOGEN,
                        categoryOptionCombo: categoryOptionCombo,
                    });
                }

                if (row.SPECIMEN !== undefined) {
                    const dataElementId = await this.glassImportRISFile.getDataElementId("Specimen type RIS"); //TO DO : get from header
                    request.dataValues.push({
                        dataElement: dataElementId || "",
                        value: row.SPECIMEN,
                        categoryOptionCombo: categoryOptionCombo,
                    });
                }

                if (row.RESISTANT !== undefined) {
                    const dataElementId = await this.glassImportRISFile.getDataElementId("RESISTANT"); //TO DO : get from header
                    request.dataValues.push({
                        dataElement: dataElementId || "",
                        value: row.RESISTANT,
                        categoryOptionCombo: categoryOptionCombo,
                    });
                }

                if (row.INTERMEDIATE !== undefined) {
                    const dataElementId = await this.glassImportRISFile.getDataElementId("INTERMEDIATE"); //TO DO : get from header
                    request.dataValues.push({
                        dataElement: dataElementId || "",
                        value: row.INTERMEDIATE,
                        categoryOptionCombo: categoryOptionCombo,
                    });
                }

                if (row.NONSUSCEPTIBLE !== undefined) {
                    const dataElementId = await this.glassImportRISFile.getDataElementId("NON-SUSCEPTIBLE"); //TO DO : get from header
                    request.dataValues.push({
                        dataElement: dataElementId || "",
                        value: row.NONSUSCEPTIBLE,
                        categoryOptionCombo,
                    });
                }

                if (row.SUSCEPTIBLE !== undefined) {
                    const dataElementId = await this.glassImportRISFile.getDataElementId("SUSCEPTIBLE"); //TO DO : get from header
                    request.dataValues.push({
                        dataElement: dataElementId || "",
                        value: row.SUSCEPTIBLE,
                        categoryOptionCombo,
                    });
                }

                if (row.UNKNOWN_NO_AST !== undefined) {
                    const dataElementId = await this.glassImportRISFile.getDataElementId("Unknown no AST"); //TO DO : get from header
                    request.dataValues.push({
                        dataElement: dataElementId || "",
                        value: row.UNKNOWN_NO_AST,
                        categoryOptionCombo,
                    });
                }

                if (row.UNKNOWN_NO_BREAKPOINTS !== undefined) {
                    const dataElementId = await this.glassImportRISFile.getDataElementId("UNKNOWN_NO_BREAKPOINTS"); //TO DO : get from header
                    request.dataValues.push({
                        dataElement: dataElementId || "",
                        value: row.UNKNOWN_NO_BREAKPOINTS,
                        categoryOptionCombo,
                    });
                }

                return await this.glassImportRISFile.importRISFile({ importStrategy: "CREATE_AND_UPDATE" }, request);
            });
        });
    }
}
