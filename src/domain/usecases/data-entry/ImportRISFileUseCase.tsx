import { UseCase } from "../../../CompositionRoot";
import { Future, FutureData } from "../../entities/Future";
import { MetadataRepository } from "../../repositories/MetadataRepository";
import { DataValuesRepository } from "../../repositories/data-entry/DataValuesRepository";
import {
    AMR_SPECIMEN_GENDER_AGE_ORIGIN_CC_ID,
    getCategoryOptionComboByDataElement,
    getCategoryOptionComboByOptionCodes,
} from "./utils/getCategoryOptionCombo";
import { RISData } from "../../entities/data-entry/external/RISData";
import { RISDataRepository } from "../../repositories/data-entry/RISDataRepository";
import { DataValue } from "../../entities/data-entry/DataValue";
import i18n from "../../../locales";
import { mapToImportSummary } from "./utils/mapDhis2Summary";
import { ImportSummary } from "../../entities/data-entry/ImportSummary";
import { checkSpecimenPathogen } from "./utils/checkSpecimenPathogen";
import { GlassModuleRepository } from "../../repositories/GlassModuleRepository";
import { checkASTResults } from "./utils/checkASTResults";
import { checkPathogenAntibiotic } from "./utils/checkPathogenAntibiotic";
import { checkBatchId } from "./utils/checkBatchId";
import { checkYear } from "./utils/checkYear";
import { includeBlokingErrors } from "./utils/includeBlockingErrors";
import { ImportStrategy } from "../../entities/data-entry/DataValuesSaveSummary";
import { D2ValidationResponse } from "../../../data/repositories/MetadataDefaultRepository";
import { checkDhis2Validations } from "./utils/checkDhis2Validations";
import { checkCountry } from "./utils/checkCountry";

const AMR_AMR_DS_INPUT_FILES_RIS_DS_ID = "CeQPmXgrhHF";
const AMR_DATA_PATHOGEN_ANTIBIOTIC_BATCHID_CC_ID = "S427AvQESbw";

export class ImportRISFileUseCase implements UseCase {
    constructor(
        private risDataRepository: RISDataRepository,
        private metadataRepository: MetadataRepository,
        private dataValuesRepository: DataValuesRepository,
        private moduleRepository: GlassModuleRepository
    ) {}

    public execute(
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
                const pathogenAntibioticErrors = module.consistencyChecks
                    ? checkPathogenAntibiotic(risDataItems, module.consistencyChecks.pathogenAntibiotic)
                    : [];

                const specimenPathogenErrors = module.consistencyChecks
                    ? checkSpecimenPathogen(risDataItems, module.consistencyChecks.specimenPathogen)
                    : [];

                const astResultsErrors = checkASTResults(risDataItems);

                const batchIdErrors = checkBatchId(risDataItems, batchId);
                const yearErrors = checkYear(risDataItems, year);
                const countryErrors = checkCountry(risDataItems, countryCode);
                const nonBlockingCategoryOptionErrors: string[] = [];

                const dataValues = risDataItems
                    .map(risData => {
                        return dataSet.dataElements.map(dataElement => {
                            const dataSetCategoryOptionValues = dataSet_CC.categories.map(category =>
                                risData[category.code as keyof RISData].toString()
                            );

                            const { categoryOptionComboId: attributeOptionCombo, error: nonBlockingError } =
                                getCategoryOptionComboByOptionCodes(dataSet_CC, dataSetCategoryOptionValues);

                            if (nonBlockingError !== "") nonBlockingCategoryOptionErrors.push(nonBlockingError);

                            const categoryOptionCombo = getCategoryOptionComboByDataElement(
                                dataElement,
                                dataElement_CC,
                                risData
                            );

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

                /* eslint-disable no-console */

                const finalDataValues: DataValue[] = dataValues.filter(
                    (dv: DataValue) => dv.attributeOptionCombo !== ""
                );

                console.log({ risInitialFileDataValues: dataValues });
                console.log({ risFinalFileDataValues: finalDataValues });

                const uniqueAOCs = _.uniq(finalDataValues.map(el => el.attributeOptionCombo || ""));

                return this.dataValuesRepository.save(finalDataValues, action, dryRun).flatMap(saveSummary => {
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

                                        const importSummary = mapToImportSummary(saveSummary);

                                        const summaryWithConsistencyBlokingErrors = includeBlokingErrors(
                                            importSummary,
                                            [
                                                ...pathogenAntibioticErrors,
                                                ...specimenPathogenErrors,
                                                ...astResultsErrors,
                                                ...batchIdErrors,
                                                ...yearErrors,
                                                ...countryErrors,
                                                ...dhis2ValidationErrors,
                                            ]
                                        );

                                        const finalImportSummary = this.includeDataValuesRemovedWarning(
                                            dataValues,
                                            finalDataValues,
                                            summaryWithConsistencyBlokingErrors,
                                            nonBlockingCategoryOptionErrors
                                        );
                                        finalImportSummary.importTime = saveSummary.importTime;

                                        return finalImportSummary;
                                    });
                            });
                    }
                    //If dry-run, do not run validations
                    else {
                        const importSummary = mapToImportSummary(saveSummary);

                        const summaryWithConsistencyBlokingErrors = includeBlokingErrors(importSummary, [
                            ...pathogenAntibioticErrors,
                            ...specimenPathogenErrors,
                            ...astResultsErrors,
                            ...batchIdErrors,
                            ...yearErrors,
                            ...countryErrors,
                        ]);

                        const finalImportSummary = this.includeDataValuesRemovedWarning(
                            dataValues,
                            finalDataValues,
                            summaryWithConsistencyBlokingErrors,
                            nonBlockingCategoryOptionErrors
                        );
                        finalImportSummary.importTime = saveSummary.importTime;
                        return Future.success(finalImportSummary);
                    }
                });
            });
    }

    private includeDataValuesRemovedWarning(
        dataValues: DataValue[],
        finalDataValues: DataValue[],
        importSummary: ImportSummary,
        nonBlockingCategoryOptionErrors: string[]
    ): ImportSummary {
        const removedDataValues = dataValues.length - finalDataValues.length;

        const nonBlockingErrors =
            removedDataValues > 0
                ? [
                      ...importSummary.nonBlockingErrors,
                      ...Object.entries(_.countBy(nonBlockingCategoryOptionErrors)).map(error => {
                          return { error: i18n.t(`Removed Data Values : ${error[0]}`), count: error[1] };
                      }),
                  ]
                : importSummary.nonBlockingErrors;

        const status = importSummary.status === "SUCCESS" && removedDataValues ? "WARNING" : importSummary.status;

        return { ...importSummary, status, nonBlockingErrors };
    }
}
