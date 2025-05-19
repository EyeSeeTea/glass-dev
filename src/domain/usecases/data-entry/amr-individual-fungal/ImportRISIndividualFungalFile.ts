import { Future, FutureData } from "../../../entities/Future";
import { ImportStrategy } from "../../../entities/data-entry/DataValuesSaveSummary";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { TrackerRepository } from "../../../repositories/TrackerRepository";
import { RISIndividualFungalDataRepository } from "../../../repositories/data-entry/RISIndividualFungalDataRepository";
import { mapToImportSummary, uploadIdListFileAndSave } from "../ImportBLTemplateEventProgram";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { GlassModuleRepository } from "../../../repositories/GlassModuleRepository";
import { CustomDataColumns } from "../../../entities/data-entry/amr-individual-fungal-external/RISIndividualFungalData";
import { ProgramRulesMetadataRepository } from "../../../repositories/program-rules/ProgramRulesMetadataRepository";
import { downloadIdsAndDeleteTrackedEntities } from "../utils/downloadIdsAndDeleteTrackedEntities";
import { Country } from "../../../entities/Country";
import { mapIndividualFungalDataItemsToEntities, runCustomValidations, runProgramRuleValidations } from "./common";
import { checkSpecimenPathogenFromDataColumns } from "../utils/checkSpecimenPathogen";

export const AMRIProgramID = "mMAj6Gofe49";
export const AMR_GLASS_AMR_TET_PATIENT = "CcgnfemKr5U";
export const AMRDataProgramStageId = "KCmWZD8qoAk";
export const AMRCandidaProgramStageId = "ysGSonDq9Bc";

export class ImportRISIndividualFungalFile {
    constructor(
        private risIndividualFungalRepository: RISIndividualFungalDataRepository,
        private trackerRepository: TrackerRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository,
        private metadataRepository: MetadataRepository,
        private programRulesMetadataRepository: ProgramRulesMetadataRepository,
        private moduleRepository: GlassModuleRepository
    ) {}

    public importRISIndividualFungalFile(
        inputFile: File,
        action: ImportStrategy,
        orgUnit: string,
        countryCode: string,
        period: string,
        eventListId: string | undefined,
        program:
            | {
                  id: string;
                  programStageId: string;
              }
            | undefined,
        moduleName: string,
        dataColumns: CustomDataColumns,
        allCountries: Country[]
    ): FutureData<ImportSummary> {
        if (action === "CREATE_AND_UPDATE") {
            return this.risIndividualFungalRepository
                .get(dataColumns, inputFile)
                .flatMap(risIndividualFungalDataItems => {
                    return Future.joinObj({
                        risIndividualFungalDataItems: Future.success(risIndividualFungalDataItems),
                        module: this.moduleRepository.getByName(moduleName),
                    });
                })
                .flatMap(({ risIndividualFungalDataItems, module }) => {
                    const specimenPathogenAntibioticErrors = module.consistencyChecks
                        ? checkSpecimenPathogenFromDataColumns(
                              risIndividualFungalDataItems,
                              module.consistencyChecks.specimenPathogen
                          )
                        : [];
                    if (specimenPathogenAntibioticErrors.length > 0) {
                        const errorSummary: ImportSummary = {
                            status: "ERROR",
                            importCount: {
                                ignored: 0,
                                imported: 0,
                                deleted: 0,
                                updated: 0,
                                total: 0,
                            },
                            nonBlockingErrors: [],
                            blockingErrors: specimenPathogenAntibioticErrors,
                        };
                        return Future.success(errorSummary);
                    }
                    return runCustomValidations(risIndividualFungalDataItems, countryCode, period).flatMap(
                        validationSummary => {
                            //If there are blocking errors on custom validation, do not import. Return immediately.
                            if (validationSummary.blockingErrors.length > 0) {
                                return Future.success(validationSummary);
                            }
                            //Import RIS data
                            const AMRIProgramIDl = program ? program.id : AMRIProgramID;

                            const AMRDataProgramStageIdl = () => {
                                if (program) {
                                    return program.programStageId;
                                } else {
                                    return moduleName === "AMR - Individual"
                                        ? AMRDataProgramStageId
                                        : AMRCandidaProgramStageId;
                                }
                            };

                            return mapIndividualFungalDataItemsToEntities(
                                risIndividualFungalDataItems,
                                orgUnit,
                                AMRIProgramIDl,
                                AMRDataProgramStageIdl(),
                                countryCode,
                                period,
                                allCountries,
                                this.trackerRepository
                            ).flatMap(entities => {
                                return runProgramRuleValidations(
                                    AMRIProgramIDl,
                                    entities,
                                    AMRDataProgramStageIdl(),
                                    this.programRulesMetadataRepository
                                ).flatMap(validationResult => {
                                    if (validationResult.blockingErrors.length > 0) {
                                        const errorSummary: ImportSummary = {
                                            status: "ERROR",
                                            importCount: {
                                                ignored: 0,
                                                imported: 0,
                                                deleted: 0,
                                                updated: 0,
                                                total: 0,
                                            },
                                            nonBlockingErrors: validationResult.nonBlockingErrors,
                                            blockingErrors: validationResult.blockingErrors,
                                        };
                                        return Future.success(errorSummary);
                                    }

                                    return this.trackerRepository
                                        .import(
                                            {
                                                trackedEntities:
                                                    validationResult.teis && validationResult.teis.length > 0
                                                        ? validationResult.teis
                                                        : [],
                                            },
                                            action
                                        )
                                        .flatMap(response => {
                                            return mapToImportSummary(
                                                response,
                                                "trackedEntity",
                                                this.metadataRepository
                                            ).flatMap(summary => {
                                                return uploadIdListFileAndSave(
                                                    "primaryUploadId",
                                                    summary,
                                                    moduleName,
                                                    this.glassDocumentsRepository,
                                                    this.glassUploadsRepository
                                                );
                                            });
                                        });
                                });
                            });
                        }
                    );
                });
        } else {
            // NOTICE: check also DeleteRISIndividualFungalFileUseCase.ts that contains same code adapted for node environment (only DELETE)
            return downloadIdsAndDeleteTrackedEntities(
                eventListId,
                orgUnit,
                action,
                AMR_GLASS_AMR_TET_PATIENT,
                this.glassDocumentsRepository,
                this.trackerRepository,
                this.metadataRepository
            );
        }
    }
}
