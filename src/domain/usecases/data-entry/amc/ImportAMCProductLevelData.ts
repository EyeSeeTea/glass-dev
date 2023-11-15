import { ImportStrategy } from "../../../entities/data-entry/DataValuesSaveSummary";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { Future, FutureData } from "../../../entities/Future";
import { ExcelRepository } from "../../../repositories/ExcelRepository";
import * as templates from "../../../entities/data-entry/program-templates";
import { InstanceDefaultRepository } from "../../../../data/repositories/InstanceDefaultRepository";
import { ExcelReader } from "../../../utils/ExcelReader";
import { Template } from "../../../entities/Template";
import { DataForm } from "../../../entities/DataForm";
import { DataPackage, DataPackageDataValue } from "../../../entities/data-entry/DataPackage";
import { TrackerRepository } from "../../../repositories/TrackerRepository";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { Id } from "../../../entities/Ref";
import { D2TrackerTrackedEntity } from "@eyeseetea/d2-api/api/trackerTrackedEntities";
import { D2TrackerEnrollment, D2TrackerEnrollmentAttribute } from "@eyeseetea/d2-api/api/trackerEnrollments";
import { D2TrackerEvent } from "@eyeseetea/d2-api/api/trackerEvents";
import { mapResponseToImportSummary } from "../amr-individual-funghi/ImportRISIndividualFunghiFile";

export const AMC_PRODUCT_REGISTER_PROGRAM_ID = "G6ChA5zMW9n";
const AMR_RAW_PRODUCT_CONSUMPTION_STAGE_ID = "GmElQHKXLIE";
const AMR_GLASS_AMC_TET_PRODUCT_REGISTER = "uE6bIKLsGYW";
export class ImportAMCProductLevelData {
    constructor(
        private excelRepository: ExcelRepository,
        private instanceRepository: InstanceDefaultRepository,
        private trackerRepository: TrackerRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository
    ) {}

    public importAMCProductFile(
        file: File,
        action: ImportStrategy,
        eventListId: string | undefined,
        orgUnitId: string,
        orgUnitName: string,
        period: string
    ): FutureData<ImportSummary> {
        return this.excelRepository.loadTemplate(file, AMC_PRODUCT_REGISTER_PROGRAM_ID).flatMap(_templateId => {
            const amcTemplate = _.values(templates)
                .map(TemplateClass => new TemplateClass())
                .filter(t => t.id === "TRACKER_PROGRAM_GENERATED_v3")[0];

            return this.instanceRepository.getProgram(AMC_PRODUCT_REGISTER_PROGRAM_ID).flatMap(amcProgram => {
                if (amcTemplate) {
                    return this.readTemplate(amcTemplate, amcProgram).flatMap(dataPackage => {
                        if (dataPackage) {
                            if (action === "CREATE_AND_UPDATE") {
                                //TO DO : Validate data  - Org unit, period , any other ?

                                return this.mapAMCProductDataToTrackedEntities(
                                    dataPackage,
                                    orgUnitId,
                                    orgUnitName
                                ).flatMap(entities => {
                                    return this.trackerRepository
                                        .import({ trackedEntities: entities }, action)
                                        .flatMap(response => {
                                            const { summary, entityIdsList } = mapResponseToImportSummary(response);

                                            const primaryUploadId = localStorage.getItem("primaryUploadId");
                                            if (entityIdsList.length > 0 && primaryUploadId) {
                                                //Enrollments were imported successfully, so create and uplaod a file with enrollments ids
                                                // and associate it with the upload datastore object
                                                const enrollmentIdListBlob = new Blob([JSON.stringify(entityIdsList)], {
                                                    type: "text/plain",
                                                });

                                                const enrollmentIdsListFile = new File(
                                                    [enrollmentIdListBlob],
                                                    `${primaryUploadId}_enrollmentIdsFile`
                                                );

                                                return this.glassDocumentsRepository
                                                    .save(enrollmentIdsListFile, "AMR")
                                                    .flatMap(fileId => {
                                                        return this.glassUploadsRepository
                                                            .setEventListFileId(primaryUploadId, fileId)
                                                            .flatMap(() => {
                                                                return Future.success(summary);
                                                            });
                                                    });
                                            } else {
                                                return Future.success(summary);
                                            }
                                        });
                                });
                            } else {
                                //TO DO: Handle AMC file deletiom
                            }

                            const testSummary: ImportSummary = {
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
                            return Future.success(testSummary);
                        } else {
                            return Future.error("Cannot find data package");
                        }
                    });
                } else {
                    return Future.error("Cannot find template");
                }
            });
        });
    }

    private mapAMCProductDataToTrackedEntities(
        amcProductData: DataPackage,
        orgUnitId: Id,
        orgUnitName: string
    ): FutureData<D2TrackerTrackedEntity[]> {
        return this.trackerRepository
            .getAMRIProgramMetadata(AMC_PRODUCT_REGISTER_PROGRAM_ID, AMR_RAW_PRODUCT_CONSUMPTION_STAGE_ID)
            .flatMap(metadata => {
                const trackedEntities = amcProductData.dataEntries.map(dataItem => {
                    const attributes: D2TrackerEnrollmentAttribute[] = metadata.programAttributes.map(
                        (attr: { id: string; name: string; code: string }) => {
                            return {
                                attribute: attr.id,
                                // @ts-ignore
                                value: Object.keys(dataItem).includes(attr.code) ? dataItem[attr.code] : "",
                            };
                        }
                    );
                    const AMCRawProductConsumptionStage: { dataElement: string; value: string }[] =
                        metadata.programStageDataElements.map((de: { id: string; name: string; code: string }) => {
                            return {
                                dataElement: de.id,
                                // @ts-ignore
                                value: Object.keys(dataItem).includes(de.code) ? dataItem[de.code] : "",
                            };
                        });

                    const events: D2TrackerEvent[] = [
                        {
                            program: AMC_PRODUCT_REGISTER_PROGRAM_ID,
                            event: "",
                            programStage: AMR_RAW_PRODUCT_CONSUMPTION_STAGE_ID,
                            orgUnit: orgUnitId,
                            dataValues: AMCRawProductConsumptionStage,
                            occurredAt: new Date().getTime().toString(),
                            status: "ACTIVE",
                        },
                    ];
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
                        attributes: [
                            // {
                            //     attribute: PATIENT_COUNTER_ID,
                            //     value:
                            //         attributes.find(at => at.attribute === PATIENT_COUNTER_ID)?.value.toString() ?? "",
                            // },
                            // {
                            //     attribute: PATIENT_ID,
                            //     value: attributes.find(at => at.attribute === PATIENT_ID)?.value.toString() ?? "",
                            // },
                        ],
                    };
                    return entity;
                });
                return Future.success(trackedEntities);
            });
    }

    private readTemplate(template: Template, dataForm: DataForm): FutureData<DataPackage | undefined> {
        const reader = new ExcelReader(this.excelRepository, this.instanceRepository);
        return Future.fromPromise(reader.readTemplate(template, AMC_PRODUCT_REGISTER_PROGRAM_ID)).map(
            excelDataValues => {
                if (!excelDataValues) return undefined;

                return {
                    ...excelDataValues,
                    dataEntries: excelDataValues.dataEntries.map(({ dataValues, ...dataEntry }) => {
                        return {
                            ...dataEntry,
                            dataValues: _.compact(dataValues.map(value => this.formatDhis2Value(value, dataForm))),
                        };
                    }),
                };
            }
        );
    }

    private formatDhis2Value(item: DataPackageDataValue, dataForm: DataForm): DataPackageDataValue | undefined {
        const dataElement = dataForm.dataElements.find(({ id }) => item.dataElement === id);
        const booleanValue = String(item.value) === "true" || item.value === "true";

        if (dataElement?.valueType === "BOOLEAN") {
            return { ...item, value: booleanValue };
        }

        if (dataElement?.valueType === "TRUE_ONLY") {
            return booleanValue ? { ...item, value: true } : undefined;
        }

        const selectedOption = dataElement?.options?.find(({ id }) => item.value === id);
        const value = selectedOption?.code ?? item.value;
        return { ...item, value };
    }
}
