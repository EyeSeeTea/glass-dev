import { D2ValidationResponse } from "../../../../data/repositories/MetadataDefaultRepository";
import { Future, FutureData } from "../../../entities/Future";
import { ImportStrategy } from "../../../entities/data-entry/DataValuesSaveSummary";
import { ConsistencyError, ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { GlassModuleRepository } from "../../../repositories/GlassModuleRepository";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { DataValuesRepository } from "../../../repositories/data-entry/DataValuesRepository";
import { RISDataRepository } from "../../../repositories/data-entry/RISDataRepository";
import { checkASTResults } from "../utils/checkASTResults";
import { checkBatchId } from "../utils/checkBatchId";
import { checkCountry } from "../utils/checkCountry";
import { checkDhis2Validations } from "../utils/checkDhis2Validations";
import { checkSpecimenPathogen } from "../utils/checkSpecimenPathogen";
import { checkYear } from "../utils/checkYear";
import {
    AMR_SPECIMEN_GENDER_AGE_ORIGIN_CC_ID,
    getCategoryOptionComboByDataElement,
    getCategoryOptionComboByOptionCodes,
} from "../utils/getCategoryOptionCombo";
import { includeBlockingErrors } from "../utils/includeBlockingErrors";
import { mapDataValuesToImportSummary } from "../utils/mapDhis2Summary";
import { RISData } from "../../../entities/data-entry/amr-external/RISData";
import { checkDuplicateRowsRIS } from "../utils/checkDuplicateRows";

export const AMR_AMR_DS_INPUT_FILES_RIS_DS_ID = "CeQPmXgrhHF";
export const AMR_DATA_PATHOGEN_ANTIBIOTIC_BATCHID_CC_ID = "S427AvQESbw";

export class ImportRISFile {
    constructor(
        private risDataRepository: RISDataRepository,
        private metadataRepository: MetadataRepository,
        private dataValuesRepository: DataValuesRepository,
        private moduleRepository: GlassModuleRepository
    ) {}

    // NOTICE: check also DeleteRISDatasetUseCase.ts that contains same code adapted for node environment (only DELETE)
    public importRISFile(
        inputFile: File,
        batchId: string,
        year: string,
        action: ImportStrategy,
        orgUnit: string,
        countryCode: string,
        dryRun: boolean
    ): FutureData<ImportSummary> {
        return this.risDataRepository
            .get(inputFile)
            .flatMap(risDataItems => {
                return Future.joinObj({
                    risDataItems: Future.success(risDataItems),
                    dataSet: this.metadataRepository.getDataSet(AMR_AMR_DS_INPUT_FILES_RIS_DS_ID),
                    dataSet_CC: this.metadataRepository.getCategoryCombination(
                        AMR_DATA_PATHOGEN_ANTIBIOTIC_BATCHID_CC_ID
                    ),
                    dataElement_CC: this.metadataRepository.getCategoryCombination(
                        AMR_SPECIMEN_GENDER_AGE_ORIGIN_CC_ID
                    ),
                    orgUnits: this.metadataRepository.getOrgUnitsByCode([
                        ...new Set(risDataItems.map(item => item.COUNTRY)),
                    ]),
                    module: this.moduleRepository.getByName("AMR"),
                });
            })
            .flatMap(({ risDataItems, dataSet, dataSet_CC, dataElement_CC, orgUnits, module }) => {
                const specimenPathogenAntibioticErrors = module.consistencyChecks
                    ? checkSpecimenPathogen(risDataItems, module.consistencyChecks.specimenPathogen)
                    : [];
                const astResultsErrors = checkASTResults(risDataItems);
                const batchIdErrors = checkBatchId(risDataItems, batchId);
                const yearErrors = checkYear(risDataItems, year);
                const countryErrors = checkCountry(risDataItems, countryCode);
                const blockingCategoryOptionErrors: { error: string; line: number }[] = [];
                const duplicateRowErrors = checkDuplicateRowsRIS(risDataItems);

                const dataValues = risDataItems
                    .map((risData, index) => {
                        return dataSet.dataElements.map(dataElement => {
                            const dataSetCategoryOptionValues = dataSet_CC.categories.map(category =>
                                risData[category.code as keyof RISData].toString()
                            );

                            const { categoryOptionComboId: attributeOptionCombo, error: aocBlockingError } =
                                getCategoryOptionComboByOptionCodes(dataSet_CC, dataSetCategoryOptionValues);

                            if (aocBlockingError !== "")
                                blockingCategoryOptionErrors.push({ error: aocBlockingError, line: index + 1 });

                            const { categoryOptionComboId: categoryOptionCombo, error: ccoBlockingError } =
                                getCategoryOptionComboByDataElement(dataElement, dataElement_CC, risData);

                            if (ccoBlockingError !== "")
                                blockingCategoryOptionErrors.push({ error: ccoBlockingError, line: index + 1 });

                            const value = risData[dataElement.code as keyof RISData]?.toString() || "";

                            const dataValue = {
                                orgUnit: orgUnits.find(ou => ou.code === risData.COUNTRY)?.id || "",
                                period: risData.YEAR.toString(),
                                attributeOptionCombo: attributeOptionCombo,
                                dataElement: dataElement.id,
                                categoryOptionCombo: categoryOptionCombo,
                                value,
                            };

                            return dataValue;
                        });
                    })
                    .flat();

                const blockingCategoryOptionConsistencyErrors: ConsistencyError[] = _(
                    blockingCategoryOptionErrors.map(error => {
                        return { error: error.error, count: 1, lines: [error.line] };
                    })
                )
                    .uniqBy("error")
                    .value();

                const allBlockingErrors =
                    action === "DELETE" //If delete, ignore consistency checks
                        ? []
                        : [
                              ...blockingCategoryOptionConsistencyErrors,
                              ...specimenPathogenAntibioticErrors,
                              ...astResultsErrors,
                              ...batchIdErrors,
                              ...yearErrors,
                              ...countryErrors,
                              ...duplicateRowErrors,
                          ];

                if (allBlockingErrors.length > 0) {
                    const errorImportSummary: ImportSummary = {
                        status: "ERROR",
                        importCount: {
                            imported: 0,
                            updated: 0,
                            ignored: 0,
                            deleted: 0,
                        },
                        nonBlockingErrors: [],
                        blockingErrors: allBlockingErrors,
                    };

                    return Future.success(errorImportSummary);
                }

                /* eslint-disable no-console */

                console.log({ risInitialFileDataValues: dataValues });
                console.log({ risFinalFileDataValues: dataValues });

                const uniqueAOCs = _.uniq(dataValues.map(el => el.attributeOptionCombo || ""));

                return this.dataValuesRepository.save(dataValues, action, dryRun).flatMap(saveSummary => {
                    //Run validations only on actual import
                    if (!dryRun) {
                        return this.metadataRepository
                            .validateDataSet(AMR_AMR_DS_INPUT_FILES_RIS_DS_ID, year.toString(), orgUnit, uniqueAOCs)
                            .flatMap(validationResponse => {
                                const validations = validationResponse as D2ValidationResponse[];

                                const validationRulesIds: string[] = validations.flatMap(
                                    ({ validationRuleViolations }) =>
                                        validationRuleViolations.map(
                                            ruleViolation => (ruleViolation as any)?.validationRule?.id
                                        )
                                );

                                return this.metadataRepository
                                    .getValidationRuleInstructions(validationRulesIds)
                                    .map(rulesInstructions => {
                                        const dhis2ValidationErrors = checkDhis2Validations(
                                            validations,
                                            rulesInstructions
                                        );

                                        const importSummary = mapDataValuesToImportSummary(saveSummary, action);

                                        const blockingErrorsWithDHISValidation =
                                            action === "DELETE" ? [] : [...allBlockingErrors, ...dhis2ValidationErrors];

                                        const summaryWithConsistencyBlokingErrors = includeBlockingErrors(
                                            importSummary,
                                            blockingErrorsWithDHISValidation
                                        );

                                        summaryWithConsistencyBlokingErrors.importTime = saveSummary.importTime;

                                        return summaryWithConsistencyBlokingErrors;
                                    });
                            });
                    }
                    //If dry-run, do not run validations
                    else {
                        const importSummary = mapDataValuesToImportSummary(saveSummary, action);

                        const summaryWithConsistencyBlokingErrors = includeBlockingErrors(importSummary, [
                            ...allBlockingErrors,
                        ]);

                        summaryWithConsistencyBlokingErrors.importTime = saveSummary.importTime;
                        return Future.success(summaryWithConsistencyBlokingErrors);
                    }
                });
            });
    }
}
