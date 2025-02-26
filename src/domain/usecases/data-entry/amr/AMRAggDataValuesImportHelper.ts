import { D2ValidationResponse } from "../../../../data/repositories/MetadataDefaultRepository";
import { DataValue } from "../../../entities/data-entry/DataValue";
import { DataValuesSaveSummary, ImportStrategy } from "../../../entities/data-entry/DataValuesSaveSummary";
import { ConsistencyError, ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { GlassModule } from "../../../entities/GlassModule";
import { CategoryCombo } from "../../../entities/metadata/CategoryCombo";
import { DataElement, DataSet } from "../../../entities/metadata/DataSet";
import { GlassModuleRepository } from "../../../repositories/GlassModuleRepository";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { checkDhis2Validations } from "../utils/checkDhis2Validations";
import { checkSpecimenPathogen } from "../utils/checkSpecimenPathogen";
import {
    AMR_SPECIMEN_GENDER_AGE_ORIGIN_CC_ID,
    getCategoryOptionComboByDataElement,
    getCategoryOptionComboByOptionCodes,
} from "../utils/getCategoryOptionCombo";
import { includeBlockingErrors } from "../utils/includeBlockingErrors";
import { mapDataValuesToImportSummary } from "../utils/mapDhis2Summary";
import _ from "lodash";

import { SampleData } from "../../../entities/data-entry/amr-external/SampleData";
import { DataValuesDefaultImportRepository } from "../../../../data/repositories/data-entry/DataValuesDefaultImportRepository";
import { RISData } from "../../../entities/data-entry/amr-external/RISData";
import { ExternalData } from "../../../entities/data-entry/amr-external/ExternalData";
import { DataValuesImportRepository } from "../../../repositories/data-entry/DataValuesImportRepository";

export class AMRAggDataValuesImportHelper {
    protected static metadataCache: {
        dataElement_CC: CategoryCombo;
        module: GlassModule;
    } = {
        dataElement_CC: {} as CategoryCombo,
        module: {} as GlassModule,
    };

    constructor(
        protected metadataRepository: MetadataRepository,
        protected dataValuesRepository: DataValuesImportRepository,
        protected moduleRepository: GlassModuleRepository
    ) {
        this.metadataRepository = metadataRepository;
        this.dataValuesRepository = dataValuesRepository;
        this.moduleRepository = moduleRepository;
    }

    // Initialization method that loads metadata and caches it
    protected async initializeCache(): Promise<void> {
        try {
            const [dataElement_CC, module] = await Promise.all([
                this.metadataRepository.getCategoryCombination(AMR_SPECIMEN_GENDER_AGE_ORIGIN_CC_ID).toPromise(),
                this.moduleRepository.getByName("AMR").toPromise(),
            ]);

            AMRAggDataValuesImportHelper.metadataCache = {
                dataElement_CC,
                module,
            };
        } catch (error) {
            // Provide more context in the error message
            console.error("Error loading AMR metadata in AMRAggDataValuesImportHelper:", error);
            throw error;
        }
    }

    protected async generateDataValues(
        dataItems: RISData[] | SampleData[],
        dataSet: DataSet,
        dataSetAttrCombo: CategoryCombo,
        orgUnitId: string,
        maxConcurrent: 10
    ): Promise<{ values: DataValue[]; blockingErrors: ConsistencyError[] }> {
        const blockingErrors: ConsistencyError[] = [];
        const values: DataValue[] = [];
        // const semaphore = new Semaphore(maxConcurrent);
        const processDataElement = async (
            data: RISData | SampleData,
            dataElement: DataElement,
            index: number
        ): Promise<DataValue> => {
            //console.log("dataElementCC: ", AMRAggDataValuesImportHelper.metadataCache.dataElement_CC);
            try {
                const [attributeOptionCombo, categoryOptionCombo] = await Promise.all([
                    this.getAttributeOptionComboId(data, dataSetAttrCombo, index, blockingErrors),
                    this.getCategoryOptionComboId(
                        data,
                        dataElement,
                        AMRAggDataValuesImportHelper.metadataCache.dataElement_CC,
                        index,
                        blockingErrors
                    ),
                ]);

                const value = data[dataElement.code as keyof ExternalData]?.toString() || "";

                if (!value) {
                    throw new Error(`Invalid value for dataElement: ${dataElement.id} at index: ${index}`);
                }

                return {
                    orgUnit: orgUnitId,
                    period: data.YEAR.toString(),
                    attributeOptionCombo,
                    dataElement: dataElement.id,
                    categoryOptionCombo,
                    value,
                };
            } catch (error) {
                console.error("Error getting dataSetAttrCombo or getCategoryOptionComboId: ", error);
                throw new Error("Error getting dataSetAttrCombo or getCategoryOptionComboId");
            }
        };

        const risDataPromises = dataItems.map(async (risData, risIndex) => {
            const dataElementPromises = dataSet.dataElements.map(async (dataElement, index) => {
                //await semaphore.acquire()
                try {
                    const dataValue = await processDataElement(risData, dataElement, index);
                    values.push(dataValue);
                } catch (error) {
                    const errorMessage = `Error generating data value for dataElement: ${dataElement.id}. Reason: ${
                        error instanceof Error ? error.message : String(error)
                    }`;
                    blockingErrors.push({
                        error: errorMessage,
                        count: 1,
                        lines: [risIndex + 1],
                    });
                    throw new Error(errorMessage);
                } finally {
                    // semaphore.release();
                }
            });
            await Promise.all(dataElementPromises);
        });

        await Promise.all(risDataPromises);

        return { values, blockingErrors };
    }

    protected async runPostSaveValidations(
        saveSummary: DataValuesSaveSummary,
        year: string,
        orgUnitId: string,
        errors: ConsistencyError[],
        dataValues: DataValue[],
        action: ImportStrategy,
        dataSetId: string
    ): Promise<ImportSummary> {
        //const uniqueAOCs = _.uniq(dataValues.map(el => el.attributeOptionCombo || ""));
        //const validationResponse = await this.metadataRepository.validateDataSet(dataSetId, year, orgUnitId, uniqueAOCs).toPromise() as D2ValidationResponse[];
        //const dhis2ValidationErrors = await this.getDHIS2ValidationErrors(validationResponse);
        //const finalSummary = this.finalizeImportSummary(saveSummary, [...errors, ...dhis2ValidationErrors], action);
        const finalSummary = this.finalizeImportSummary(saveSummary, [...errors], action);
        return finalSummary;
    }

    protected getAttributeOptionComboId(
        data: RISData | SampleData,
        dataSet_attr_combo: CategoryCombo,
        index: number,
        blockingErrors: ConsistencyError[]
    ): string {
        try {
            const dataSetCategoryOptionValues = dataSet_attr_combo.categories.map(
                category => data[category.code as keyof typeof data]?.toString() || ""
            );
            const { categoryOptionComboId: attributeOptionComboId, error: aocBlockingError } =
                getCategoryOptionComboByOptionCodes(dataSet_attr_combo, dataSetCategoryOptionValues);

            if (aocBlockingError !== "") {
                blockingErrors.push({ error: aocBlockingError, count: 1, lines: [index + 1] });
            }
            return attributeOptionComboId;
        } catch (error) {
            console.error("Error getting dataSetAttrCombo : ", error);
            throw new Error("Error getting dataSetAttrCombo ");
        }
    }

    protected getCategoryOptionComboId(
        data: RISData | SampleData,
        dataElement: DataElement,
        dataElement_CC: CategoryCombo,
        index: number,
        blockingErrors: ConsistencyError[]
    ): string {
        try {
            const { categoryOptionComboId, error: ccoBlockingError } = getCategoryOptionComboByDataElement(
                dataElement,
                dataElement_CC,
                data
            );

            if (ccoBlockingError !== "") {
                blockingErrors.push({ error: ccoBlockingError, count: 1, lines: [index + 1] });
            }

            return categoryOptionComboId;
        } catch (error) {
            console.error("Error getting  getCategoryOptionComboId: ", error);
            throw new Error("Error getting  getCategoryOptionComboId");
        }
    }

    protected finalizeImportSummary(
        saveSummary: DataValuesSaveSummary,
        errors: ConsistencyError[],
        action: ImportStrategy
    ): ImportSummary {
        const importSummary = mapDataValuesToImportSummary(saveSummary, action);
        const finalErrors = action === "DELETE" ? [] : errors;
        const finalSummary = includeBlockingErrors(importSummary, finalErrors);
        finalSummary.importTime = saveSummary.importTime;

        return finalSummary;
    }

    protected createErrorImportSummary(errors: ConsistencyError[]): ImportSummary {
        return {
            status: "ERROR",
            importCount: { imported: 0, updated: 0, ignored: 0, deleted: 0 },
            nonBlockingErrors: [],
            blockingErrors: errors,
        };
    }

    protected async getDHIS2ValidationErrors(validationResponse: D2ValidationResponse[]): Promise<ConsistencyError[]> {
        const validationRulesIds: string[] = validationResponse.flatMap(({ validationRuleViolations }) =>
            validationRuleViolations.map(ruleViolation => (ruleViolation as any)?.validationRule?.id)
        );

        const rulesInstructions = await this.metadataRepository
            .getValidationRuleInstructions(validationRulesIds)
            .toPromise();
        return checkDhis2Validations(validationResponse, rulesInstructions);
    }
}
