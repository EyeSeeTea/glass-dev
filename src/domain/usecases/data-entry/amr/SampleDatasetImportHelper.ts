import { ImportStrategy } from "../../../entities/data-entry/DataValuesSaveSummary";
import { ConsistencyError, ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { DataValuesRepository } from "../../../repositories/data-entry/DataValuesRepository";
import { SampleDataRepository } from "../../../repositories/data-entry/SampleDataRepository";
import { SampleData } from "../../../entities/data-entry/amr-external/SampleData";
import { CategoryCombo } from "../../../entities/metadata/CategoryCombo";
import { GlassModule } from "../../../entities/GlassModule";
import { GlassModuleRepository } from "../../../repositories/GlassModuleRepository";
import _ from 'lodash';
import { AMRAggDataValuesImportHelper } from "./AMRAggDataValuesImportHelper";
import { DataSet } from "../../../entities/metadata/DataSet";
import { DataValuesImportRepository } from "../../../../data/repositories/data-entry/DataValuesImportRepository";

const AMR_AMR_DS_Input_files_Sample_DS_ID = "OcAB7oaC072";
const AMR_BATCHID_CC_ID = "rEMx3WFeLcU";

export class SampleDatasetImportHelper extends AMRAggDataValuesImportHelper {

    private static sampleMetadataCache: {
        dataSet: DataSet;
        dataSet_attr_combo: CategoryCombo ;
    } = {
            ...AMRAggDataValuesImportHelper.metadataCache, 
            dataSet: {} as DataSet,
            dataSet_attr_combo: {} as CategoryCombo
        };


    constructor(
        private sampleDataRepository: SampleDataRepository,
        metadataRepository: MetadataRepository,
        dataValuesRepository: DataValuesImportRepository,
        moduleRepository: GlassModuleRepository
    ) {
        super(metadataRepository, dataValuesRepository, moduleRepository);
        this.sampleDataRepository = sampleDataRepository;
    }

    static async initialize(
        sampleDataRepository: SampleDataRepository,
        metadataRepository: MetadataRepository,
        dataValuesRepository: DataValuesImportRepository,
        moduleRepository: GlassModuleRepository
    ): Promise<SampleDatasetImportHelper> {
        const instance = new SampleDatasetImportHelper(sampleDataRepository, metadataRepository, dataValuesRepository, moduleRepository);
        await instance.initializeCache(); 
        return instance;
    }


    protected async initializeCache(): Promise<void> {
        await super.initializeCache();
        try {
            const [dataSet, dataSet_attr_combo] = await Promise.all([
                this.metadataRepository.getDataSet(AMR_AMR_DS_Input_files_Sample_DS_ID).toPromise(),
                this.metadataRepository.getCategoryCombination(AMR_BATCHID_CC_ID).toPromise(),
            ]);

            SampleDatasetImportHelper.sampleMetadataCache = {
                dataSet,
                dataSet_attr_combo,
            };
         } catch (error) {
            console.error('Error loading sample metadata:', error);
            throw error; 
        }
    }


    public async importSampleDataValues(
        inputFile: File,
        year: string,
        action: ImportStrategy,
        orgUnitId: string,
        dryRun: boolean
    ): Promise<ImportSummary> {
        try {
            const sampleDataItems = await this.sampleDataRepository.get(inputFile).toPromise();
            //console.log("sampleDataItems: ", sampleDataItems);
            //console.log("SampleDatasetImportHelper.metadataCache.dataSet: ", SampleDatasetImportHelper.metadataCache.dataSet);
            //console.log("SampleDatasetImportHelper.metadataCache.dataSet_attr_combo: ", SampleDatasetImportHelper.metadataCache.dataSet_attr_combo);
            //console.log("SampleDatasetImportHelper.metadataCache.dataElement_CC: ", SampleDatasetImportHelper.metadataCache.dataElement_CC);
            // Run data value generation and consistency checks in parallel
            const [dataValuesResult, consistencyErrors] = await Promise.all([
                this.generateDataValues(
                    sampleDataItems,
                    SampleDatasetImportHelper.sampleMetadataCache.dataSet,
                    SampleDatasetImportHelper.sampleMetadataCache.dataSet_attr_combo,
                    orgUnitId, 
                    10
                ),
                this.runPreImportConsistencyChecks(sampleDataItems, AMRAggDataValuesImportHelper.metadataCache.module)
            ]);

            const { values, blockingErrors } = dataValuesResult;
            const allBlockingErrors = [...consistencyErrors, ...blockingErrors];

            if (allBlockingErrors.length > 0) {
                console.error("Pre upload Consistency check error for data values for sample file: ", inputFile.name);
                return this.createErrorImportSummary(allBlockingErrors);
            }
            // Save data values in DHIS2
            const saveSummary = await this.dataValuesRepository.save(values, action, dryRun);
            // Run post-save validations
            const finalSummary = await this.runPostSaveValidations(saveSummary, year, orgUnitId, allBlockingErrors, values, action, AMR_AMR_DS_Input_files_Sample_DS_ID);
            return finalSummary;
        } catch (error) {
            const errorMessage = `Error during SAMPLE data values import for file ${inputFile.name} : ${error}`;
            console.error(errorMessage);
            throw new Error(errorMessage);
        }
    }


    //sync
  /*  private async generateDataValues(
        sampleDataItems: SampleData[],
        dataSet: DataSet,
        dataSet_attr_combo: CategoryCombo,
        dataElement_CC: CategoryCombo,
        orgUnitId: string
    ): Promise<{ values: DataValue[]; blockingErrors: ConsistencyError[]; }> {
        const blockingErrors: ConsistencyError[] = [];
        const values = sampleDataItems.flatMap((sampleData, index) => {
            return dataSet.dataElements.map(dataElement => {
                const attributeOptionCombo = this.getAttributeOptionComboId(sampleData, dataSet_attr_combo, index, blockingErrors);
                const categoryOptionCombo = this.getCategoryOptionComboId(sampleData, dataElement, dataElement_CC, index, blockingErrors);
                const value = sampleData[dataElement.code as keyof SampleData]?.toString() || "";

                const dataValue: DataValue = {
                    orgUnit: orgUnitId,
                    period: sampleData.YEAR.toString(),
                    attributeOptionCombo,
                    dataElement: dataElement.id,
                    categoryOptionCombo,
                    value,
                };
                return dataValue;
            }).flat();
        });

        return { values, blockingErrors };
    }


    private async generateAsyncDataValues(
        sampleDataItems: SampleData[],
        dataSet: DataSet,
        dataSetAttrCombo: CategoryCombo,
        dataElementCC: CategoryCombo,
        orgUnitId: string,
        maxConcurrent =  10
    ): Promise<{ values: DataValue[], blockingErrors: ConsistencyError[] }> {
        const blockingErrors: ConsistencyError[] = [];
        const values: DataValue[] = [];
        // const semaphore = new Semaphore(maxConcurrent);

        const processDataElement = async (
            sampleData: SampleData,
            dataElement: DataElement,
            index: number
        ): Promise<DataValue> => {
            
            const [attributeOptionComboId, categoryOptionComboId] = await Promise.all([
                this.getAttributeOptionComboId(sampleData, dataSetAttrCombo, index, blockingErrors),
                this.getCategoryOptionComboId(sampleData, dataElement, dataElementCC, index, blockingErrors)
            ]);

            
            //console.log("dataElement: ", dataElement);
           // console.log("attributeOptionCombo: ",attributeOptionComboId);
           // console.log("categoryOptionCombo: ",categoryOptionComboId);
            
            const value = sampleData[dataElement.code as keyof SampleData]?.toString() || "";
            //console.log("sampleData: ", sampleData);
            //console.log("dataElement.code: ", dataElement);
            if (!value) {
                throw new Error(`Invalid value for dataElement: ${dataElement.id} at index: ${index}`);
            }

            return {
                orgUnit: orgUnitId,
                period: sampleData.YEAR.toString(),
                attributeOptionCombo: attributeOptionComboId,
                dataElement: dataElement.id,
                categoryOptionCombo: categoryOptionComboId,
                value,
            };
        };

        //console.log("sampleDataItems in process: ", sampleDataItems);
        const sampleDataPromises = sampleDataItems.map(async (sampleData, risIndex) => {
            //console.log("sampleData in map: ", sampleData);
            const dataElementPromises = dataSet.dataElements.map(async (dataElement, index) => {
                //await semaphore.acquire()
                try {
                   // console.log("dataElement in map: ", dataElement);
                    const dataValue = await processDataElement(sampleData, dataElement, index);
                   // console.log("dataValue in map: ", dataValue);
                    values.push(dataValue);
                } catch (error) {
                    const errorMessage = `Error generating data value for dataElement: ${dataElement.id}. Reason: ${error instanceof Error ? error.message : String(error)}`;
                    blockingErrors.push({
                        error: errorMessage,
                        count: 1,
                        lines: [risIndex + 1]
                    });
                    throw new Error(errorMessage);
                } finally {
                    // semaphore.release(); 
                }
            });
            await Promise.all(dataElementPromises);
        });

        await Promise.all(sampleDataPromises);

        return { values, blockingErrors };
    }
    */



    private async runPreImportConsistencyChecks(
        sampleDataItems: SampleData[],
        module: GlassModule,
    ): Promise<ConsistencyError[]> {
        const errors: ConsistencyError[] = [];

        /*const batchIdErrors = checkBatchId(sampleDataItems, batchId);
        const yearErrors = checkYear(sampleDataItems, year);
        const countryErrors = checkCountry(sampleDataItems, countryCode);
        const duplicateRowErrors = checkDuplicateRowsSAMPLE(sampleDataItems);*/

        const batchIdErrors = errors;
        const yearErrors = errors;
        const countryErrors = errors;
        const duplicateRowErrors = errors;
        const allErrors = [...batchIdErrors, ...yearErrors, ...countryErrors, ...duplicateRowErrors]
        return allErrors;
    }


}
