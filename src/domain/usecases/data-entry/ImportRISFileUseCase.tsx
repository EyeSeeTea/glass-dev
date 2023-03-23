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
import { ConsistencyError, ImportSummary } from "../../entities/data-entry/ImportSummary";
import { checkSpecimenPathogen } from "./utils/checkSpecimenPathogen";
import { GlassModuleRepository } from "../../repositories/GlassModuleRepository";
import { checkASTResults } from "./utils/checkASTResults";
import { checkPathogenAntibiotic } from "./utils/checkPathogenAntibiotic";
import { checkBatchId } from "./utils/checkBatchId";
import { checkYear } from "./utils/checkYear";
import { includeBlokingErrors } from "./utils/includeBlockingErrors";
import { ImportStrategy } from "../../entities/data-entry/DataValuesSaveSummary";
import { D2ValidationResponse } from "../../../data/repositories/MetadataDefaultRepository";

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
        year: number,
        action: ImportStrategy,
        orgUnit: string
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

                const dataValues = risDataItems
                    .map(risData => {
                        return dataSet.dataElements.map(dataElement => {
                            const dataSetCategoryOptionValues = dataSet_CC.categories.map(category =>
                                risData[category.code as keyof RISData].toString()
                            );

                            const attributeOptionCombo = getCategoryOptionComboByOptionCodes(
                                dataSet_CC,
                                dataSetCategoryOptionValues
                            );

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

                return this.dataValuesRepository.save(finalDataValues, action).flatMap(saveSummary => {
                    return this.metadataRepository
                        .validateDataSet(AMR_AMR_DS_INPUT_FILES_RIS_DS_ID, year.toString(), orgUnit, uniqueAOCs)
                        .map(validationResponse => {
                            const validations = validationResponse as D2ValidationResponse[];
                            const d2ValidationErrors: ConsistencyError[] = [];
                            validations.forEach(({ validationRuleViolations }) => {
                                if (validationRuleViolations.length) {
                                    validationRuleViolations.forEach(rulesViolation => {
                                        d2ValidationErrors.push({
                                            error: i18n.t(
                                                `Validation rule '${
                                                    (rulesViolation as any).validationRule.name
                                                }' violated. Left side value: '${
                                                    (rulesViolation as any).leftsideValue
                                                }', right side value: '${(rulesViolation as any).rightsideValue}'`
                                            ),
                                            count: 1,
                                        });
                                    });
                                }
                            });
                            const importSummary = mapToImportSummary(saveSummary);

                            const summaryWithConsistencyBlokingErrors = includeBlokingErrors(importSummary, [
                                ...pathogenAntibioticErrors,
                                ...specimenPathogenErrors,
                                ...astResultsErrors,
                                ...batchIdErrors,
                                ...yearErrors,
                                ...d2ValidationErrors,
                            ]);

                            const finalImportSummary = this.includeDataValuesRemovedWarning(
                                dataValues,
                                finalDataValues,
                                summaryWithConsistencyBlokingErrors
                            );

                            return finalImportSummary;
                        });
                });
            });
    }

    private includeDataValuesRemovedWarning(
        dataValues: DataValue[],
        finalDataValues: DataValue[],
        importSummary: ImportSummary
    ): ImportSummary {
        const removedDataValues = dataValues.length - finalDataValues.length;

        const nonBlockingErrors =
            removedDataValues > 0
                ? [
                      ...importSummary.nonBlockingErrors,
                      {
                          count: dataValues.length - finalDataValues.length,
                          error: i18n.t(`Removed dataValues to import because attributeOptionCombo not found`),
                      },
                  ]
                : importSummary.nonBlockingErrors;

        const status = importSummary.status === "SUCCESS" && removedDataValues ? "WARNING" : importSummary.status;

        return { ...importSummary, status, nonBlockingErrors };
    }
}
