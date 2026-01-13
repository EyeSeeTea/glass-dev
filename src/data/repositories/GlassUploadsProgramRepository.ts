import _ from "lodash";

import { Future, FutureData } from "../../domain/entities/Future";
import { GlassUploads, GlassUploadsStatus } from "../../domain/entities/GlassUploads";
import { Id } from "../../domain/entities/Ref";
import { ImportSummary, ImportSummaryErrors } from "../../domain/entities/data-entry/ImportSummary";
import { GetUploadsByModuleOuParams, GlassUploadsRepository } from "../../domain/repositories/GlassUploadsRepository";
import {
    D2Api,
    D2TrackerEventSchema,
    D2TrackerEventToPost,
    DataValue,
    SelectedPick,
    TrackedPager,
    TrackerEventsResponse,
} from "../../types/d2-api";
import { apiToFuture } from "../../utils/futures";
import { Maybe } from "../../utils/ts-utils";
import { UploadsFormData, UploadsFormDataBuilder } from "./utils/builders/UploadsFormDataBuilder";
import { periodToYearMonthDay } from "../../utils/currentPeriodHelper";

export const AMR_GLASS_PROE_UPLOADS_PROGRAM_ID = "yVFQpwmCX0D";
export const AMR_GLASS_PROE_UPLOADS_PROGRAM_STAGE_ID = "a6s7mVGkZZF";

const DEFAULT_CHUNK_SIZE = 100;
const DEFAULT_PAGE_SIZE = 250;

export const uploadsDHIS2Ids = {
    batchId: "dt3jH8M0dlX",
    countryCode: "ZUK2qYEqfhU",
    documentFileType: "iuKX7DEQmJs",
    documentId: "NAPcnttbh33",
    documentName: "EFVhW2HGCX0",
    specimens: "v9WVtKfMied",
    status: "hj79iVAy2QK",
    dataSubmissionId: "KUd8yXbyaoU",
    moduleId: "NKDNpVn5FJA",
    rows: "Br9BBTl7kOA",
    correspondingRisUploadId: "iUkQ1e94K0S",
    eventListDocumentId: "mRF7Eb7FZvR",
    calculatedEventListDocumentId: "jkQyTqUonDr",
    importSummary: "XEbwd14zCHJ",
    eventListDataDeleted: "oGt5jYsrCzp",
    calculatedEventListDataDeleted: "gSjqXdpjeAa",
    errorAsyncDeleting: "lIHM2QXWwUK",
    errorAsyncUploading: "O7EFyS16DBg",
    asyncImportSummaries: "rV0d3FQC8Jp",
    period: "BXvUeQEf9bT",
} as const;

export function getValueById(dataValues: DataValue[], dataElement: string): Maybe<string> {
    return dataValues.find(dataValue => dataValue.dataElement === dataElement)?.value;
}

export class GlassUploadsProgramRepository implements GlassUploadsRepository {
    constructor(private api: D2Api, private uploadsFormDataBuilder: UploadsFormDataBuilder) {}

    getById(id: Id): FutureData<GlassUploads> {
        return apiToFuture(
            this.api.tracker.events.getById(id, {
                fields: eventFields,
                program: AMR_GLASS_PROE_UPLOADS_PROGRAM_ID,
            })
        ).flatMap((d2Event: D2TrackerEvent) => {
            if (!d2Event) {
                return Future.error("Upload not found");
            }

            return this.buildGlassUploadFromEvent(d2Event);
        });
    }

    getByIds(ids: Id[], options?: { chunkSize: number }): FutureData<GlassUploads[]> {
        const { chunkSize = DEFAULT_CHUNK_SIZE } = options || {};
        return this.getEventsIdsChunked(ids, chunkSize).flatMap(d2Events => {
            return Future.sequential(d2Events.map(event => this.buildGlassUploadFromEvent(event)));
        });
    }

    save(upload: GlassUploads): FutureData<void> {
        return this.saveUploads([upload]);
    }

    delete(id: Id): FutureData<{
        fileId: Id;
        eventListFileId: Id | undefined;
        calculatedEventListFileId: Id | undefined;
    }> {
        return this.getById(id).flatMap(upload => {
            // DELETE strategy requires only the event id to be sent
            const d2TrackerEvent = {
                event: upload.id,
            } as D2TrackerEventToPost;

            return apiToFuture(
                this.api.tracker.post({ importStrategy: "DELETE" }, { events: [d2TrackerEvent] })
            ).flatMap(response => {
                if (response.status !== "OK") {
                    return Future.error(`Error deleting upload: ${response.message}`);
                } else {
                    return Future.success({
                        fileId: upload.fileId,
                        eventListFileId: upload.eventListFileId,
                        calculatedEventListFileId: upload.calculatedEventListFileId,
                    });
                }
            });
        });
    }

    getUploadsByModuleOU(module: Id, orgUnit: Id): FutureData<GlassUploads[]> {
        return this.getUploadsByFilters({
            orgUnit: orgUnit,
            orgUnitMode: "SELECTED",
            filter: `${uploadsDHIS2Ids.moduleId}:eq:${module}`,
        });
    }

    getUploadsByModuleOUPeriod(props: GetUploadsByModuleOuParams): FutureData<GlassUploads[]> {
        const { moduleId, orgUnit, period, additionalFilters } = props;

        const modulesToQuery = new Set([...(additionalFilters?.moduleIds ?? []), moduleId]);

        return this.getUploadsByFilters({
            orgUnit: orgUnit,
            orgUnitMode: "SELECTED",
            filter: `${uploadsDHIS2Ids.period}:eq:${period}`,
        }).map(uploads =>
            uploads.filter(
                upload =>
                    modulesToQuery.has(upload.module) &&
                    (!additionalFilters?.fileTypes || additionalFilters.fileTypes.includes(upload.fileType))
            )
        );
    }

    getUploadsByDataSubmission(dataSubmissionId: Id): FutureData<GlassUploads[]> {
        return this.getUploadsByFilters({
            filter: `${uploadsDHIS2Ids.dataSubmissionId}:eq:${dataSubmissionId}`,
        });
    }

    getByDataSubmissionIds(dataSubmissionIds: Id[]): FutureData<GlassUploads[]> {
        const filterValues = dataSubmissionIds.join(";");

        return this.getUploadsByFilters({
            filter: `${uploadsDHIS2Ids.dataSubmissionId}:in:${filterValues}`,
        });
    }

    private getUploadsByFilters(filters: {
        orgUnit?: Id;
        occurredAfter?: string;
        occurredBefore?: string;
        pageSize?: number;
        filter?: string;
        orgUnitMode?: "SELECTED" | "CHILDREN" | "DESCENDANTS" | "ACCESSIBLE" | "CAPTURE" | "ALL";
    }): FutureData<GlassUploads[]> {
        return this.getEventsWithFilters(filters).flatMap(d2Events =>
            Future.sequential(d2Events.map(event => this.buildGlassUploadFromEvent(event)))
        );
    }

    getByCorrespondingRisUploadId(correspondingRisUploadId: Id): FutureData<GlassUploads> {
        return this.getEventsWithFilters({
            filter: `${uploadsDHIS2Ids.correspondingRisUploadId}:eq:${correspondingRisUploadId}`,
        }).flatMap(d2Events => {
            const event = d2Events[0];
            if (event) {
                return this.buildGlassUploadFromEvent(event).flatMap(glassUpload => {
                    return Future.success(glassUpload);
                });
            } else {
                return Future.error("No event found");
            }
        });
    }

    getEventListFileIdByUploadId(id: Id): FutureData<Id> {
        return this.getById(id).flatMap(upload => {
            if (upload.eventListFileId) {
                return Future.success(upload.eventListFileId);
            } else {
                return Future.error("Upload does not exist or does not have eventListFileId");
            }
        });
    }

    setStatus(id: Id, status: GlassUploadsStatus): FutureData<void> {
        return this.updateUpload(id, { status: status });
    }

    setBatchId(id: Id, batchId: string): FutureData<void> {
        return this.updateUpload(id, { batchId: batchId });
    }

    setEventListDataDeleted(id: Id): FutureData<void> {
        return this.updateUpload(id, { eventListDataDeleted: true });
    }

    setCalculatedEventListDataDeleted(id: Id): FutureData<void> {
        return this.updateUpload(id, { calculatedEventListDataDeleted: true });
    }

    updateSampleUploadWithRisId(sampleUploadId: Id, risUploadId: Id): FutureData<void> {
        return this.updateUpload(sampleUploadId, { correspondingRisUploadId: risUploadId });
    }

    setEventListFileId(id: Id, eventListFileId: Id): FutureData<void> {
        return this.updateUpload(id, { eventListFileId: eventListFileId });
    }

    saveImportSummaryErrorsOfFilesInUploads(params: {
        primaryUploadId: Id;
        primaryImportSummaryErrors: ImportSummaryErrors;
        secondaryUploadId?: Id;
        secondaryImportSummaryErrors?: ImportSummaryErrors;
    }): FutureData<void> {
        const { primaryUploadId, primaryImportSummaryErrors, secondaryUploadId, secondaryImportSummaryErrors } = params;

        const ids = [primaryUploadId, ...(secondaryUploadId ? [secondaryUploadId] : [])];

        return this.getByIds(ids).flatMap(uploads => {
            const primaryUpload = uploads.find(upload => upload.id === primaryUploadId);

            if (!primaryUpload) {
                return Future.error("Upload does not exist");
            }

            const primaryUpdated: GlassUploads = {
                ...primaryUpload,
                importSummary: primaryImportSummaryErrors,
            };

            const secondaryUpload =
                secondaryUploadId && secondaryImportSummaryErrors
                    ? uploads.find(upload => upload.id === secondaryUploadId)
                    : undefined;

            const secondaryUpdated: GlassUploads | undefined =
                secondaryUpload && secondaryImportSummaryErrors
                    ? {
                          ...secondaryUpload,
                          importSummary: secondaryImportSummaryErrors,
                      }
                    : undefined;

            const updatedUploads: GlassUploads[] = [primaryUpdated, ...(secondaryUpdated ? [secondaryUpdated] : [])];

            return Future.sequential<string, GlassUploadsWithFileResourceIds>(
                updatedUploads.map(upload => {
                    if (!upload.importSummary) {
                        return Future.success({
                            ...upload,
                            importSummaryId: undefined,
                        });
                    }

                    return this.saveEventDataValueFile(
                        this.uploadsFormDataBuilder.createImportSummaryFormData(upload.importSummary)
                    ).flatMap(importSummaryId => {
                        const updatedUpload: GlassUploadsWithFileResourceIds = {
                            ...upload,
                            importSummaryId: importSummaryId,
                        };
                        return Future.success(updatedUpload);
                    });
                })
            ).flatMap(uploadsWithFileResourceIds => {
                return this.saveUploadsWithFileResourceIds(uploadsWithFileResourceIds);
            });
        });
    }

    setCalculatedEventListFileId(id: Id, calculatedEventListFileId: Id): FutureData<void> {
        return this.updateUpload(id, { calculatedEventListFileId: calculatedEventListFileId });
    }

    setMultipleErrorAsyncDeleting(ids: Id[]): FutureData<void> {
        return this.updateMultipleUploads(ids, { errorAsyncDeleting: true });
    }

    setMultipleErrorAsyncUploading(ids: Id[]): FutureData<void> {
        return this.updateMultipleUploads(ids, { errorAsyncUploading: true });
    }

    saveImportSummaries(params: { uploadId: Id; importSummaries: ImportSummary[] }): FutureData<void> {
        const { uploadId, importSummaries } = params;
        const mergedImportSummaryErrors: ImportSummaryErrors = importSummaries.reduce(
            (acc: ImportSummaryErrors, summary: ImportSummary) => {
                return {
                    nonBlockingErrors: [...acc.nonBlockingErrors, ...summary.nonBlockingErrors],
                    blockingErrors: [...acc.blockingErrors, ...summary.blockingErrors],
                };
            },
            { nonBlockingErrors: [], blockingErrors: [] }
        );

        return this.updateUpload(uploadId, {
            asyncImportSummaries: importSummaries,
            importSummary: mergedImportSummaryErrors,
        });
    }

    private buildGlassUploadFromEvent(event: D2TrackerEvent): FutureData<GlassUploads> {
        const areAsyncImportSummariesPresent = getValueById(event.dataValues, uploadsDHIS2Ids.asyncImportSummaries);
        const isImportSummariesPresent = getValueById(event.dataValues, uploadsDHIS2Ids.importSummary);

        return Future.joinObj({
            importSummary: isImportSummariesPresent
                ? this.getImportSummary(event.event, uploadsDHIS2Ids.importSummary)
                : Future.success(undefined),
            asyncImportSummaries: areAsyncImportSummariesPresent
                ? this.getAsyncImportSummaries(event.event, uploadsDHIS2Ids.asyncImportSummaries)
                : Future.success(undefined),
        }).map(({ importSummary, asyncImportSummaries }) => {
            return {
                id: event.event,
                batchId: getValueById(event.dataValues, uploadsDHIS2Ids.batchId) || "",
                countryCode: getValueById(event.dataValues, uploadsDHIS2Ids.countryCode) || "",
                fileType: getValueById(event.dataValues, uploadsDHIS2Ids.documentFileType) || "",
                fileId: getValueById(event.dataValues, uploadsDHIS2Ids.documentId) || "",
                fileName: getValueById(event.dataValues, uploadsDHIS2Ids.documentName) || "",
                period: getValueById(event.dataValues, uploadsDHIS2Ids.period) || "",
                specimens: (getValueById(event.dataValues, uploadsDHIS2Ids.specimens) || "").split(","),
                status: (getValueById(event.dataValues, uploadsDHIS2Ids.status) as GlassUploadsStatus) || "UPLOADED",
                uploadDate: event.createdAt || "",
                dataSubmission: getValueById(event.dataValues, uploadsDHIS2Ids.dataSubmissionId) || "",
                module: getValueById(event.dataValues, uploadsDHIS2Ids.moduleId) || "",
                orgUnit: event.orgUnit,
                records: parseInt(getValueById(event.dataValues, uploadsDHIS2Ids.rows) || "0", 10),
                rows: parseInt(getValueById(event.dataValues, uploadsDHIS2Ids.rows) || "0", 10),
                correspondingRisUploadId:
                    getValueById(event.dataValues, uploadsDHIS2Ids.correspondingRisUploadId) || "",
                eventListFileId: getValueById(event.dataValues, uploadsDHIS2Ids.eventListDocumentId) || undefined,
                calculatedEventListFileId:
                    getValueById(event.dataValues, uploadsDHIS2Ids.calculatedEventListDocumentId) || undefined,
                eventListDataDeleted: this.getBooleanValue(event.dataValues, uploadsDHIS2Ids.eventListDataDeleted),
                calculatedEventListDataDeleted: this.getBooleanValue(
                    event.dataValues,
                    uploadsDHIS2Ids.calculatedEventListDataDeleted
                ),
                errorAsyncDeleting: this.getBooleanValue(event.dataValues, uploadsDHIS2Ids.errorAsyncDeleting),
                errorAsyncUploading: this.getBooleanValue(event.dataValues, uploadsDHIS2Ids.errorAsyncUploading),
                importSummary: importSummary,
                asyncImportSummaries: asyncImportSummaries,
                inputLineNb: 0,
                outputLineNb: 0,
            };
        });
    }

    private getBooleanValue(dataValues: DataValue[], dataElement: string): boolean {
        return getValueById(dataValues, dataElement) === "true";
    }

    private mapUploadToEvent(
        upload: GlassUploads,
        importSummaryId?: Id,
        asyncImportSummariesId?: Id
    ): D2TrackerEventToPost {
        const dataValues = [
            { dataElement: uploadsDHIS2Ids.batchId, value: upload.batchId },
            { dataElement: uploadsDHIS2Ids.countryCode, value: upload.countryCode },
            { dataElement: uploadsDHIS2Ids.documentFileType, value: upload.fileType },
            { dataElement: uploadsDHIS2Ids.documentId, value: upload.fileId },
            { dataElement: uploadsDHIS2Ids.documentName, value: upload.fileName },
            { dataElement: uploadsDHIS2Ids.specimens, value: upload.specimens.join(",") },
            { dataElement: uploadsDHIS2Ids.status, value: upload.status },
            { dataElement: uploadsDHIS2Ids.dataSubmissionId, value: upload.dataSubmission },
            { dataElement: uploadsDHIS2Ids.moduleId, value: upload.module },
            { dataElement: uploadsDHIS2Ids.rows, value: upload.rows?.toString() || "0" },
            { dataElement: uploadsDHIS2Ids.period, value: upload.period },
            { dataElement: uploadsDHIS2Ids.correspondingRisUploadId, value: upload.correspondingRisUploadId || "" },
            { dataElement: uploadsDHIS2Ids.eventListDocumentId, value: upload.eventListFileId || "" },
            {
                dataElement: uploadsDHIS2Ids.calculatedEventListDocumentId,
                value: upload.calculatedEventListFileId || "",
            },
            {
                dataElement: uploadsDHIS2Ids.eventListDataDeleted,
                value: upload.eventListDataDeleted ? "true" : null,
            },
            {
                dataElement: uploadsDHIS2Ids.calculatedEventListDataDeleted,
                value: upload.calculatedEventListDataDeleted ? "true" : null,
            },
            {
                dataElement: uploadsDHIS2Ids.errorAsyncDeleting,
                value: upload.errorAsyncDeleting ? "true" : null,
            },
            {
                dataElement: uploadsDHIS2Ids.errorAsyncUploading,
                value: upload.errorAsyncUploading ? "true" : null,
            },
            // FIX: null needed to remove the value in DHIS2 if a yes-only field is set to false
        ] as D2TrackerEventToPost["dataValues"];

        const importSummariesDataValues: D2TrackerEventToPost["dataValues"] = [
            ...(importSummaryId ? [{ dataElement: uploadsDHIS2Ids.importSummary, value: importSummaryId }] : []),
            ...(asyncImportSummariesId
                ? [
                      {
                          dataElement: uploadsDHIS2Ids.asyncImportSummaries,
                          value: asyncImportSummariesId,
                      },
                  ]
                : []),
        ];

        const allDataValues: D2TrackerEventToPost["dataValues"] = [...dataValues, ...importSummariesDataValues];

        return {
            event: upload.id,
            program: AMR_GLASS_PROE_UPLOADS_PROGRAM_ID,
            programStage: AMR_GLASS_PROE_UPLOADS_PROGRAM_STAGE_ID,
            orgUnit: upload.orgUnit,
            occurredAt: periodToYearMonthDay(upload.period),
            dataValues: allDataValues,
        };
    }

    private getImportSummary(eventId: Id, dataElementId: Id): FutureData<ImportSummaryErrors> {
        return apiToFuture(
            this.api.get<ImportSummaryErrors>(`/tracker/events/${eventId}/dataValues/${dataElementId}/file`)
        );
    }

    private getAsyncImportSummaries(eventId: Id, dataElementId: Id): FutureData<ImportSummary[]> {
        return apiToFuture(
            this.api.get<ImportSummary[]>(`/tracker/events/${eventId}/dataValues/${dataElementId}/file`)
        );
    }

    private saveEventDataValueFile(payload: UploadsFormData): FutureData<Id> {
        return apiToFuture(
            this.api.post<PartialSaveFileResourceResponse>("/fileResources", undefined, payload, {
                requestBodyType: "raw",
            })
        ).flatMap(fileUploadResult => {
            const fileResourceId = fileUploadResult.response?.fileResource?.id;

            if (!fileResourceId) {
                return Future.error("Error when saving event data value file");
            }

            return Future.success(fileResourceId);
        });
    }

    private getEventsIdsChunked(ids: Id[], chunkSize: number): FutureData<D2TrackerEvent[]> {
        const chunkedIds = _(ids).chunk(chunkSize).value();

        return Future.sequential(
            chunkedIds.flatMap(idsChunk => {
                const idsString = idsChunk.join(";");

                return apiToFuture(
                    this.api.tracker.events.get({
                        fields: eventFields,
                        program: AMR_GLASS_PROE_UPLOADS_PROGRAM_ID,
                        event: idsString,
                        skipPaging: true,
                    })
                ).flatMap((eventsResponse: { instances: D2TrackerEvent[] }) => {
                    return Future.success(eventsResponse.instances);
                });
            })
        ).flatMap(listOfEvents => Future.success(_(listOfEvents).flatten().value()));
    }

    private getEventsWithFilters(filters: {
        orgUnit?: Id;
        occurredAfter?: string;
        occurredBefore?: string;
        pageSize?: number;
        filter?: string;
        orgUnitMode?: "SELECTED" | "CHILDREN" | "DESCENDANTS" | "ACCESSIBLE" | "CAPTURE" | "ALL";
    }): FutureData<D2TrackerEvent[]> {
        const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
        const events: D2TrackerEvent[] = [];
        let page = 1;
        let pageCount: number | undefined;

        const fetchPage = (): FutureData<D2TrackerEvent[]> => {
            return apiToFuture(
                this.api.tracker.events.get({
                    fields: eventFields,
                    program: AMR_GLASS_PROE_UPLOADS_PROGRAM_ID,
                    totalPages: true,
                    pageSize,
                    page,
                    ...filters,
                })
            ).flatMap(response => {
                const result = response as FixedTrackerEventsResponse;
                const apiEvents: D2TrackerEvent[] = result.events ?? result.instances ?? [];
                events.push(...apiEvents);

                const pager = result.pager ?? result;
                pageCount = pager.pageCount;
                page = pager.page + 1;

                if (pageCount !== undefined && page <= pageCount) {
                    return fetchPage();
                }

                return Future.success(events);
            });
        };

        return fetchPage();
    }

    private saveUploads(uploads: GlassUploads[]): FutureData<void> {
        const d2TrackerEvents = uploads.map(upload => this.mapUploadToEvent(upload));

        return apiToFuture(
            this.api.tracker.post({ importStrategy: "CREATE_AND_UPDATE" }, { events: d2TrackerEvents })
        ).flatMap(response => {
            if (response.status !== "OK") {
                return Future.error(`Error saving uploads: ${response.message}`);
            } else return Future.success(undefined);
        });
    }

    private saveUploadsWithFileResourceIds(uploads: GlassUploadsWithFileResourceIds[]): FutureData<void> {
        const d2TrackerEvents = uploads.map(upload =>
            this.mapUploadToEvent(upload, upload.importSummaryId, upload.asyncImportSummariesId)
        );

        return apiToFuture(
            this.api.tracker.post({ importStrategy: "CREATE_AND_UPDATE" }, { events: d2TrackerEvents })
        ).flatMap(response => {
            if (response.status !== "OK") {
                return Future.error(`Error saving uploads: ${response.message}`);
            } else return Future.success(undefined);
        });
    }

    private updateUpload(id: Id, patch: Partial<GlassUploads>): FutureData<void> {
        return this.getById(id).flatMap(upload => {
            const updatedUpload: GlassUploads = { ...upload, ...patch };

            return Future.joinObj({
                asyncImportSummariesId: patch.asyncImportSummaries
                    ? this.saveEventDataValueFile(
                          this.uploadsFormDataBuilder.createAsyncImportSummariesFormData(patch.asyncImportSummaries)
                      )
                    : Future.success(undefined),
                importSummaryId: patch.importSummary
                    ? this.saveEventDataValueFile(
                          this.uploadsFormDataBuilder.createImportSummaryFormData(patch.importSummary)
                      )
                    : Future.success(undefined),
            }).flatMap(({ asyncImportSummariesId, importSummaryId }) => {
                const upload: GlassUploadsWithFileResourceIds = {
                    ...updatedUpload,
                    asyncImportSummariesId: asyncImportSummariesId,
                    importSummaryId: importSummaryId,
                };
                return this.saveUploadsWithFileResourceIds([upload]);
            });
        });
    }

    private updateMultipleUploads(ids: Id[], patch: Partial<GlassUploads>): FutureData<void> {
        return this.getByIds(ids).flatMap(uploads => {
            if (uploads.length === 0) {
                return Future.error("No uploads found for the provided ids");
            }

            const updatedUploads: GlassUploads[] = uploads.map(upload => ({
                ...upload,
                ...patch,
            }));

            if (patch.asyncImportSummaries || patch.importSummary) {
                return Future.sequential(
                    updatedUploads.map(upload => {
                        return Future.joinObj({
                            asyncImportSummariesId: patch.asyncImportSummaries
                                ? this.saveEventDataValueFile(
                                      this.uploadsFormDataBuilder.createAsyncImportSummariesFormData(
                                          patch.asyncImportSummaries
                                      )
                                  )
                                : Future.success(undefined),
                            importSummaryId: patch.importSummary
                                ? this.saveEventDataValueFile(
                                      this.uploadsFormDataBuilder.createImportSummaryFormData(patch.importSummary)
                                  )
                                : Future.success(undefined),
                        }).flatMap(({ asyncImportSummariesId, importSummaryId }) => {
                            const updatedUpload: GlassUploadsWithFileResourceIds = {
                                ...upload,
                                asyncImportSummariesId: asyncImportSummariesId,
                                importSummaryId: importSummaryId,
                            };
                            return Future.success(updatedUpload);
                        });
                    })
                ).flatMap(uploadsWithFileResourceIds => {
                    return this.saveUploadsWithFileResourceIds(uploadsWithFileResourceIds);
                });
            } else {
                return this.saveUploads(updatedUploads);
            }
        });
    }
}

interface GlassUploadsWithFileResourceIds extends GlassUploads {
    asyncImportSummariesId?: Id;
    importSummaryId?: Id;
}

type PartialSaveFileResourceResponse = {
    response?: {
        fileResource?: {
            id?: string;
        };
    };
};

const eventFields = {
    program: true,
    programStage: true,
    event: true,
    dataValues: true,
    orgUnit: true,
    occurredAt: true,
    createdAt: true,
} as const;

type D2TrackerEvent = SelectedPick<D2TrackerEventSchema, typeof eventFields>;

// TODO: update @eyeseetea/d2-api
type FixedTrackedPager = Omit<TrackedPager, "pageCount"> & {
    pageCount?: number;
};

type FixedTrackerEventsResponse = Omit<TrackerEventsResponse<typeof eventFields>, keyof TrackedPager | "pager"> & {
    pager?: FixedTrackedPager;
} & FixedTrackedPager & {
        instances?: SelectedPick<D2TrackerEventSchema, typeof eventFields>[];
        events?: SelectedPick<D2TrackerEventSchema, typeof eventFields>[];
    };
