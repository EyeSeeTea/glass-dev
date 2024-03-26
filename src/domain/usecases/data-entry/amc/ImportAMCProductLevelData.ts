import { ImportStrategy } from "../../../entities/data-entry/DataValuesSaveSummary";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { Future, FutureData } from "../../../entities/Future";
import { ExcelRepository } from "../../../repositories/ExcelRepository";
import * as templates from "../../../entities/data-entry/program-templates";
import { InstanceDefaultRepository } from "../../../../data/repositories/InstanceDefaultRepository";
import { DataPackage } from "../../../entities/data-entry/DataPackage";
import { TrackerRepository } from "../../../repositories/TrackerRepository";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { Id } from "../../../entities/Ref";
import { D2TrackerTrackedEntity } from "@eyeseetea/d2-api/api/trackerTrackedEntities";
import { D2TrackerEnrollment, D2TrackerEnrollmentAttribute } from "@eyeseetea/d2-api/api/trackerEnrollments";
import { D2TrackerEvent } from "@eyeseetea/d2-api/api/trackerEvents";
import { getStringFromFile } from "../utils/fileToString";
import { mapToImportSummary, readTemplate, uploadIdListFileAndSave } from "../ImportBLTemplateEventProgram";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { ValidationResult } from "../../../entities/program-rules/EventEffectTypes";
import { ProgramRuleValidationForBLEventProgram } from "../../program-rules-processing/ProgramRuleValidationForBLEventProgram";
import { ProgramRulesMetadataRepository } from "../../../repositories/program-rules/ProgramRulesMetadataRepository";
import { CustomValidationsAMCProductData } from "./CustomValidationsAMCProductData";
import { GlassATCDefaultRepository } from "../../../../data/repositories/GlassATCDefaultRepository";
import moment from "moment";
import { AMCProductDataRepository } from "../../../repositories/data-entry/AMCProductDataRepository";

export const AMC_PRODUCT_REGISTER_PROGRAM_ID = "G6ChA5zMW9n";
export const AMC_RAW_PRODUCT_CONSUMPTION_STAGE_ID = "GmElQHKXLIE";
export const AMC_RAW_PRODUCT_CONSUMPTION_CALCULATED_STAGE_ID = "q8cl5qllyjd";
const AMR_GLASS_AMC_TET_PRODUCT_REGISTER = "uE6bIKLsGYW";
export class ImportAMCProductLevelData {
    constructor(
        private excelRepository: ExcelRepository,
        private instanceRepository: InstanceDefaultRepository,
        private trackerRepository: TrackerRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository,
        private metadataRepository: MetadataRepository,
        private programRulesMetadataRepository: ProgramRulesMetadataRepository,
        private atcRepository: GlassATCDefaultRepository,
        private amcProductRepository: AMCProductDataRepository
    ) {}

    public importAMCProductFile(
        file: File,
        action: ImportStrategy,
        eventListId: string | undefined,
        orgUnitId: string,
        orgUnitName: string,
        moduleName: string,
        period: string
    ): FutureData<ImportSummary> {
        return this.excelRepository.loadTemplate(file, AMC_PRODUCT_REGISTER_PROGRAM_ID).flatMap(_templateId => {
            const amcTemplate = _.values(templates)
                .map(TemplateClass => new TemplateClass())
                .filter(t => t.id === "TRACKER_PROGRAM_GENERATED_v3")[0];
            return this.instanceRepository.getProgram(AMC_PRODUCT_REGISTER_PROGRAM_ID).flatMap(amcProgram => {
                if (!amcTemplate) return Future.error("Cannot find template");

                return readTemplate(
                    amcTemplate,
                    amcProgram,
                    this.excelRepository,
                    this.instanceRepository,
                    AMC_PRODUCT_REGISTER_PROGRAM_ID
                ).flatMap(dataPackage => {
                    if (!dataPackage) return Future.error("Cannot find data package");

                    if (action === "CREATE_AND_UPDATE") {
                        return this.mapAMCProductDataToTrackedEntities(
                            dataPackage,
                            orgUnitId,
                            orgUnitName,
                            period
                        ).flatMap(entities => {
                            return this.validateTEIsAndEvents(
                                entities,
                                orgUnitId,
                                orgUnitName,
                                period,
                                AMC_PRODUCT_REGISTER_PROGRAM_ID
                            ).flatMap(validationResults => {
                                if (validationResults.blockingErrors.length > 0) {
                                    const errorSummary: ImportSummary = {
                                        status: "ERROR",
                                        importCount: {
                                            ignored: 0,
                                            imported: 0,
                                            deleted: 0,
                                            updated: 0,
                                        },
                                        nonBlockingErrors: validationResults.nonBlockingErrors,
                                        blockingErrors: validationResults.blockingErrors,
                                    };
                                    return Future.success(errorSummary);
                                }

                                return this.trackerRepository
                                    .import(
                                        {
                                            trackedEntities:
                                                validationResults.teis && validationResults.teis.length > 0
                                                    ? validationResults.teis
                                                    : [],
                                        },
                                        action
                                    )
                                    .flatMap(response => {
                                        return mapToImportSummary(
                                            response,
                                            "trackedEntity",
                                            this.metadataRepository,
                                            validationResults.nonBlockingErrors
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
                    } else {
                        return downloadIdsAndDeleteTrackedEntities(
                            eventListId,
                            orgUnitId,
                            action,
                            AMR_GLASS_AMC_TET_PRODUCT_REGISTER,
                            this.glassDocumentsRepository,
                            this.trackerRepository,
                            this.metadataRepository
                        );
                    }
                });
            });
        });
    }

    private mapAMCProductDataToTrackedEntities(
        amcProductData: DataPackage,
        orgUnitId: Id,
        orgUnitName: string,
        period: string
    ): FutureData<D2TrackerTrackedEntity[]> {
        return this.trackerRepository
            .getProgramMetadata(AMC_PRODUCT_REGISTER_PROGRAM_ID, AMC_RAW_PRODUCT_CONSUMPTION_STAGE_ID)
            .flatMap(metadata => {
                if (amcProductData.type !== "trackerPrograms") return Future.error("Incorrect data package");
                const trackedEntities = amcProductData.trackedEntityInstances.map(tei => {
                    const attributes: D2TrackerEnrollmentAttribute[] = metadata.programAttributes.map(
                        (attr: {
                            id: string;
                            name: string;
                            code: string;
                            valueType: string;
                            optionSetValue: boolean;
                            optionSet: { options: { name: string; code: string }[] };
                        }) => {
                            const currentAttribute = tei.attributeValues.find(at => at.attribute.id === attr.id);
                            let currentAttrVal = attr.optionSetValue
                                ? attr.optionSet.options.find(option => option.name === currentAttribute?.value)?.code
                                : currentAttribute?.value;

                            if (attr.valueType === "BOOLEAN") {
                                currentAttrVal = currentAttrVal?.toLowerCase() === "yes" ? "true" : "false";
                            } else if (attr.valueType === "ORGANISATION_UNIT") {
                                currentAttrVal = currentAttribute?.value;
                            }
                            return {
                                attribute: attr.id,
                                // @ts-ignore
                                value: currentAttrVal ? currentAttrVal : "",
                            };
                        }
                    );

                    const currentDataEntryRows = amcProductData.dataEntries.filter(
                        de => de.trackedEntityInstance === tei.id
                    );

                    const events: D2TrackerEvent[] = currentDataEntryRows.map(dataEntry => {
                        const rawProductConsumptionStageDataValues: { dataElement: string; value: string }[] =
                            metadata.programStageDataElements.map((de: { id: string; name: string; code: string }) => {
                                const currentDataElement = dataEntry.dataValues.find(
                                    dataEntry => dataEntry.dataElement === de.id
                                )?.value;
                                return {
                                    dataElement: de.id,
                                    // @ts-ignore
                                    value: currentDataElement ? currentDataElement : "",
                                };
                            });

                        //Validation rule : Set to 1st Jan of corresponding year
                        const occurredAt =
                            moment(new Date(`${period}-01-01`))
                                .toISOString()
                                .split("T")
                                .at(0) ?? period;

                        return {
                            program: AMC_PRODUCT_REGISTER_PROGRAM_ID,
                            event: "",
                            programStage: AMC_RAW_PRODUCT_CONSUMPTION_STAGE_ID,
                            orgUnit: dataEntry.orgUnit,
                            dataValues: rawProductConsumptionStageDataValues,
                            occurredAt: occurredAt,
                            status: "COMPLETED",
                        };
                    });

                    const enrollments: D2TrackerEnrollment[] = [
                        {
                            orgUnit: tei.orgUnit.id,
                            program: AMC_PRODUCT_REGISTER_PROGRAM_ID,
                            enrollment: "",
                            trackedEntityType: AMR_GLASS_AMC_TET_PRODUCT_REGISTER,
                            notes: [],
                            relationships: [],
                            attributes: attributes,
                            events: events,
                            enrolledAt: tei.enrollment?.enrollmentDate ?? new Date().getTime().toString(),
                            occurredAt: tei.enrollment?.incidentDate ?? new Date().getTime().toString(),
                            createdAt: new Date().getTime().toString(),
                            createdAtClient: new Date().getTime().toString(),
                            updatedAt: new Date().getTime().toString(),
                            updatedAtClient: new Date().getTime().toString(),
                            status: "COMPLETED",
                            orgUnitName: "",
                            followUp: false,
                            deleted: false,
                            storedBy: "",
                        },
                    ];
                    const entity: D2TrackerTrackedEntity = {
                        orgUnit: tei.orgUnit.id,
                        trackedEntity: "",
                        trackedEntityType: AMR_GLASS_AMC_TET_PRODUCT_REGISTER,
                        enrollments: enrollments,
                        attributes: attributes.map(attr => {
                            return {
                                attribute: attr.attribute,
                                value: attr.value.toString(),
                            };
                        }),
                    };

                    return entity;
                });
                return Future.success(trackedEntities);
            });
    }

    private validateTEIsAndEvents(
        teis: D2TrackerTrackedEntity[],
        orgUnitId: string,
        orgUnitName: string,
        period: string,
        programId: string
    ): FutureData<ValidationResult> {
        //1. Before running validations, add ids to tei, enrollement and event so thier relationships can be processed.
        const teisWithId = teis?.map((tei, teiIndex) => {
            const enrollmentsWithId = tei.enrollments?.map((enrollment, enrollmentIndex) => {
                const eventsWithIds = enrollment.events.map((ev, eventIndex) => {
                    return {
                        ...ev,
                        event: eventIndex.toString(),
                        enrollment: enrollmentIndex.toString(),
                        trackedEntity: teiIndex.toString(),
                    };
                });
                return { ...enrollment, enrollment: enrollmentIndex.toString(), events: eventsWithIds };
            });

            return { ...tei, enrollments: enrollmentsWithId, trackedEntity: teiIndex.toString() };
        });

        //2. Run Program Rule Validations
        const programRuleValidations = new ProgramRuleValidationForBLEventProgram(this.programRulesMetadataRepository);

        //3. Run Custom AMC Product Validations
        const customValidations = new CustomValidationsAMCProductData(this.atcRepository, this.amcProductRepository);

        return Future.joinObj({
            programRuleValidationResults: programRuleValidations.getValidatedTeisAndEvents(programId, [], teis),
            customRuleValidationsResults: customValidations.getValidatedEvents(
                teisWithId,
                orgUnitId,
                orgUnitName,
                period
            ),
        }).flatMap(({ programRuleValidationResults, customRuleValidationsResults }) => {
            //4. After processing, remove ids to tei, enrollement and events so that they can be imported
            const teisWithoutId = programRuleValidationResults.teis?.map(tei => {
                const enrollementsWithoutId = tei.enrollments?.map(enrollment => {
                    const eventsWithoutIds = enrollment.events.map(ev => {
                        return {
                            ...ev,
                            event: "",
                            enrollment: "",
                            trackedEntity: "",
                        };
                    });

                    return { ...enrollment, enrollment: "", events: eventsWithoutIds };
                });
                return { ...tei, enrollments: enrollementsWithoutId, trackedEntity: "" };
            });

            const consolidatedValidationResults: ValidationResult = {
                teis: teisWithoutId,
                blockingErrors: [
                    ...programRuleValidationResults.blockingErrors,
                    ...customRuleValidationsResults.blockingErrors,
                ],
                nonBlockingErrors: [
                    ...programRuleValidationResults.nonBlockingErrors,
                    ...customRuleValidationsResults.nonBlockingErrors,
                ],
            };
            return Future.success(consolidatedValidationResults);
        });
    }
}
export const downloadIdsAndDeleteTrackedEntities = (
    eventListId: string | undefined,
    orgUnitId: string,
    action: ImportStrategy,
    trackedEntityType: string,
    glassDocumentsRepository: GlassDocumentsRepository,
    trackerRepository: TrackerRepository,
    metadataRepository: MetadataRepository
): FutureData<ImportSummary> => {
    if (eventListId) {
        return glassDocumentsRepository.download(eventListId).flatMap(file => {
            return Future.fromPromise(getStringFromFile(file)).flatMap(_enrollments => {
                const enrollmemtIdList: [] = JSON.parse(_enrollments);
                const trackedEntities = enrollmemtIdList.map(id => {
                    const trackedEntity: D2TrackerTrackedEntity = {
                        orgUnit: orgUnitId,
                        trackedEntity: id,
                        trackedEntityType: trackedEntityType,
                    };
                    return trackedEntity;
                });
                return trackerRepository.import({ trackedEntities: trackedEntities }, action).flatMap(response => {
                    return mapToImportSummary(response, "trackedEntity", metadataRepository).flatMap(
                        ({ importSummary }) => {
                            return Future.success(importSummary);
                        }
                    );
                });
            });
        });
    } else {
        //No enrollments were created during import, so no events to delete.
        const summary: ImportSummary = {
            status: "SUCCESS",
            importCount: {
                ignored: 0,
                imported: 0,
                deleted: 0,
                updated: 0,
            },
            nonBlockingErrors: [],
            blockingErrors: [],
        };
        return Future.success(summary);
    }
};
