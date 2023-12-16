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

export const AMC_PRODUCT_REGISTER_PROGRAM_ID = "G6ChA5zMW9n";
const AMR_RAW_PRODUCT_CONSUMPTION_STAGE_ID = "GmElQHKXLIE";
const AMR_GLASS_AMC_TET_PRODUCT_REGISTER = "uE6bIKLsGYW";
export class ImportAMCProductLevelData {
    constructor(
        private excelRepository: ExcelRepository,
        private instanceRepository: InstanceDefaultRepository,
        private trackerRepository: TrackerRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository,
        private metadataRepository: MetadataRepository
    ) {}

    public importAMCProductFile(
        file: File,
        action: ImportStrategy,
        eventListId: string | undefined,
        orgUnitId: string,
        orgUnitName: string,
        moduleName: string
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
                        return this.mapAMCProductDataToTrackedEntities(dataPackage, orgUnitId, orgUnitName).flatMap(
                            entities => {
                                //TO DO : Validate data  - Org unit, period , any other?

                                return this.trackerRepository
                                    .import({ trackedEntities: entities }, action)
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
                            }
                        );
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
        orgUnitName: string
    ): FutureData<D2TrackerTrackedEntity[]> {
        return this.trackerRepository
            .getProgramMetadata(AMC_PRODUCT_REGISTER_PROGRAM_ID, AMR_RAW_PRODUCT_CONSUMPTION_STAGE_ID)
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
                                currentAttrVal = currentAttribute?.optionId;
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

                        return {
                            program: AMC_PRODUCT_REGISTER_PROGRAM_ID,
                            event: "",
                            programStage: AMR_RAW_PRODUCT_CONSUMPTION_STAGE_ID,
                            orgUnit: orgUnitId,
                            dataValues: rawProductConsumptionStageDataValues,
                            occurredAt: new Date().getTime().toString(),
                            status: "ACTIVE",
                        };
                    });

                    const enrollments: D2TrackerEnrollment[] = [
                        {
                            orgUnit: orgUnitId,
                            program: AMC_PRODUCT_REGISTER_PROGRAM_ID,
                            enrollment: "",
                            trackedEntityType: AMR_GLASS_AMC_TET_PRODUCT_REGISTER,
                            notes: [],
                            relationships: [],
                            attributes: attributes,
                            events: events,
                            enrolledAt: new Date().getTime().toString(),
                            occurredAt: new Date().getTime().toString(),
                            createdAt: new Date().getTime().toString(),
                            createdAtClient: new Date().getTime().toString(),
                            updatedAt: new Date().getTime().toString(),
                            updatedAtClient: new Date().getTime().toString(),
                            status: "ACTIVE",
                            orgUnitName: orgUnitName,
                            followUp: false,
                            deleted: false,
                            storedBy: "",
                        },
                    ];
                    const entity: D2TrackerTrackedEntity = {
                        orgUnit: orgUnitId,
                        trackedEntity: "",
                        trackedEntityType: AMR_GLASS_AMC_TET_PRODUCT_REGISTER,
                        enrollments: enrollments,
                        attributes: [],
                    };
                    return entity;
                });
                return Future.success(trackedEntities);
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
