import { ImportStrategy } from "../../../entities/data-entry/DataValuesSaveSummary";
import { ConsistencyError, ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { GlassModule } from "../../../entities/GlassModule";
import { CategoryCombo } from "../../../entities/metadata/CategoryCombo";
import { DataSet } from "../../../entities/metadata/DataSet";
import { RISDataRepository } from "../../../repositories/data-entry/RISDataRepository";
import { GlassModuleRepository } from "../../../repositories/GlassModuleRepository";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { checkSpecimenPathogen } from "../utils/checkSpecimenPathogen";
import _ from 'lodash';
import { AMRAggDataValuesImportHelper } from "./AMRAggDataValuesImportHelper";

import { DataValuesImportRepository } from "../../../../data/repositories/data-entry/DataValuesImportRepository";
import { RISData } from "../../../entities/data-entry/amr-external/RISData";


const AMR_AMR_DS_INPUT_FILES_RIS_DS_ID = "CeQPmXgrhHF";
const AMR_DATA_PATHOGEN_ANTIBIOTIC_BATCHID_CC_ID = "S427AvQESbw";


export class RISDataSetImportHelper extends AMRAggDataValuesImportHelper {

    private static risMetadataCache: {
        risDataSet: DataSet;
        risDataSetAttrCombo: CategoryCombo;
    } = {
            ...AMRAggDataValuesImportHelper.metadataCache,
            risDataSet: {} as DataSet,
            risDataSetAttrCombo: {} as CategoryCombo
        };

    constructor(
        private risDataRepository: RISDataRepository, 
        metadataRepository: MetadataRepository,
        dataValuesRepository: DataValuesImportRepository,
        moduleRepository: GlassModuleRepository
    ) {

        super(metadataRepository, dataValuesRepository, moduleRepository);
        this.risDataRepository = risDataRepository;
    }

    // Static method to create and initialize an instance
    static async initialize(
        risDataRepository: RISDataRepository,
        metadataRepository: MetadataRepository,
        dataValuesRepository: DataValuesImportRepository,
        moduleRepository: GlassModuleRepository
    ): Promise<RISDataSetImportHelper> {

        const instance = new RISDataSetImportHelper(risDataRepository, metadataRepository, dataValuesRepository, moduleRepository);

        await instance.initializeCache();
        return instance;
    }

    protected async initializeCache(): Promise<void> {
        await super.initializeCache();
        try {
            const [risDataSet, risDataSetAttrCombo] = await Promise.all([
                this.metadataRepository.getDataSet(AMR_AMR_DS_INPUT_FILES_RIS_DS_ID).toPromise(),
                this.metadataRepository.getCategoryCombination(AMR_DATA_PATHOGEN_ANTIBIOTIC_BATCHID_CC_ID).toPromise(),
            ]);

            RISDataSetImportHelper.risMetadataCache = {
                risDataSet,
                risDataSetAttrCombo
            };
        } catch (error) {
            console.error('Error during RISDataSetImportHelper initialization:', error);
            throw error;
        }
    }

    public async importRISDataValues(
        {
            inputFile,
            year,
            action,
            dryRun,
            orgUnitId
        }: { inputFile: File; year: string; action: ImportStrategy; dryRun: boolean; orgUnitId: string; }): Promise<ImportSummary> {
        try {
            const risDataItems = await this.risDataRepository.get(inputFile).toPromise();
            const [dataValuesResult, consistencyErrors] = await Promise.all([
                this.generateDataValues(risDataItems, RISDataSetImportHelper.risMetadataCache.risDataSet, RISDataSetImportHelper.risMetadataCache.risDataSetAttrCombo, orgUnitId, 10),
                this.runPreImportConsistencyChecks(risDataItems, AMRAggDataValuesImportHelper.metadataCache.module)
            ]);

            const { values, blockingErrors } = dataValuesResult;
            const allBlockingErrors = [...consistencyErrors, ...blockingErrors];

            if (allBlockingErrors.length > 0) {
                return this.createErrorImportSummary(allBlockingErrors);
            }

            const saveSummary = await this.dataValuesRepository.save(values, action, dryRun);
            
            return await this.runPostSaveValidations(saveSummary, year, orgUnitId, allBlockingErrors, values, action, AMR_AMR_DS_INPUT_FILES_RIS_DS_ID);

        } catch (error) {
            const errorMessage = `Error during RIS data values import for file ${inputFile.name}: ${error}`;
            throw new Error(errorMessage);
        }
    }

    private runPreImportConsistencyChecks(
        risDataItems: RISData[],
        module: GlassModule,
    ): ConsistencyError[] {
        const errors: ConsistencyError[] = [];
        const specimenPathogenErrors = module?.consistencyChecks?.specimenPathogen
            ? checkSpecimenPathogen(risDataItems, module.consistencyChecks.specimenPathogen)
            : [];
        /*const astResultsErrors = checkASTResults(risDataItems);
        const batchIdErrors = checkBatchId(risDataItems, batchId);
        const yearErrors = checkYear(risDataItems, year);
        const countryErrors = checkCountry(risDataItems, countryCode);
        const duplicateRowErrors = checkDuplicateRowsRIS(risDataItems);*/
        const astResultsErrors = errors;
        const batchIdErrors = errors;
        const yearErrors = errors;
        const countryErrors = errors;
        const duplicateRowErrors = errors;


        return [...specimenPathogenErrors, ...astResultsErrors, ...batchIdErrors, ...yearErrors, ...countryErrors, ...duplicateRowErrors];
    }



}