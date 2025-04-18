import { Future, FutureData } from "../../domain/entities/Future";
import { GlassUploads, GlassUploadsStatus } from "../../domain/entities/GlassUploads";
import { Id } from "../../domain/entities/Ref";
import { ImportSummary, ImportSummaryErrors } from "../../domain/entities/data-entry/ImportSummary";
import { GlassUploadsRepository } from "../../domain/repositories/GlassUploadsRepository";
import { cache } from "../../utils/cache";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";

export class GlassUploadsDefaultRepository implements GlassUploadsRepository {
    constructor(private dataStoreClient: DataStoreClient) {}

    @cache()
    getAll(): FutureData<GlassUploads[]> {
        return this.dataStoreClient.listCollection<GlassUploads>(DataStoreKeys.UPLOADS);
    }

    getById(uploadId: Id): FutureData<GlassUploads> {
        return this.dataStoreClient.listCollection<GlassUploads>(DataStoreKeys.UPLOADS).flatMap(uploads => {
            const upload = uploads?.find(upload => upload.id === uploadId);
            if (upload) {
                return Future.success(upload);
            } else {
                return Future.error("Upload does not exist");
            }
        });
    }

    save(upload: GlassUploads): FutureData<void> {
        return this.dataStoreClient.listCollection(DataStoreKeys.UPLOADS).flatMap(uploads => {
            const newUploads = [...uploads, upload];
            return this.dataStoreClient.saveObject(DataStoreKeys.UPLOADS, newUploads);
        });
    }

    setStatus(id: Id, status: GlassUploadsStatus): FutureData<void> {
        return this.dataStoreClient.listCollection<GlassUploads>(DataStoreKeys.UPLOADS).flatMap(uploads => {
            const uploadFound = uploads?.find(upload => upload.id === id);
            if (uploadFound) {
                const restUploads = uploads.filter(upload => upload.id !== id);

                return this.dataStoreClient.saveObject(DataStoreKeys.UPLOADS, [
                    ...restUploads,
                    { ...uploadFound, status: status },
                ]);
            } else {
                return Future.error("Upload does not exist");
            }
        });
    }

    setBatchId(id: string, batchId: string): FutureData<void> {
        return this.dataStoreClient.listCollection<GlassUploads>(DataStoreKeys.UPLOADS).flatMap(uploads => {
            const upload = uploads.find(el => el.id === id);
            if (upload) {
                upload.batchId = batchId;
                return this.dataStoreClient.saveObject(DataStoreKeys.UPLOADS, uploads);
            } else {
                return Future.error("Upload not found");
            }
        });
    }

    setEventListDataDeleted(uploadId: string): FutureData<void> {
        return this.dataStoreClient.listCollection<GlassUploads>(DataStoreKeys.UPLOADS).flatMap(uploads => {
            const upload = uploads.find(el => el.id === uploadId);
            if (upload) {
                const restUploads = uploads.filter(upload => upload.id !== uploadId);
                return this.dataStoreClient.saveObject(DataStoreKeys.UPLOADS, [
                    ...restUploads,
                    { ...upload, eventListDataDeleted: true },
                ]);
            } else {
                return Future.error("Upload not found");
            }
        });
    }

    setCalculatedEventListDataDeleted(uploadId: string): FutureData<void> {
        return this.dataStoreClient.listCollection<GlassUploads>(DataStoreKeys.UPLOADS).flatMap(uploads => {
            const upload = uploads.find(el => el.id === uploadId);
            if (upload) {
                const restUploads = uploads.filter(upload => upload.id !== uploadId);
                return this.dataStoreClient.saveObject(DataStoreKeys.UPLOADS, [
                    ...restUploads,
                    { ...upload, calculatedEventListDataDeleted: true },
                ]);
            } else {
                return Future.error("Upload not found");
            }
        });
    }

    delete(id: string): FutureData<{
        fileId: string;
        eventListFileId: string | undefined;
        calculatedEventListFileId: string | undefined;
    }> {
        return this.dataStoreClient.listCollection<GlassUploads>(DataStoreKeys.UPLOADS).flatMap(uploads => {
            const upload = uploads?.find(upload => upload.id === id);
            if (upload) {
                uploads.splice(uploads.indexOf(upload), 1);
                return this.dataStoreClient.saveObject(DataStoreKeys.UPLOADS, uploads).flatMap(() =>
                    Future.success({
                        fileId: upload.fileId,
                        eventListFileId: upload.eventListFileId,
                        calculatedEventListFileId: upload.calculatedEventListFileId,
                    })
                );
            } else {
                return Future.error("Upload does not exist");
            }
        });
    }

    getUploadsByModuleOU(module: string, orgUnit: string): FutureData<GlassUploads[]> {
        return this.dataStoreClient.getObjectsFilteredByProps<GlassUploads>(
            DataStoreKeys.UPLOADS,
            new Map<keyof GlassUploads, unknown>([
                ["module", module],
                ["orgUnit", orgUnit],
            ])
        );
    }

    getUploadsByModuleOUPeriod(module: string, orgUnit: string, period: string): FutureData<GlassUploads[]> {
        return this.dataStoreClient.getObjectsFilteredByProps<GlassUploads>(
            DataStoreKeys.UPLOADS,
            new Map<keyof GlassUploads, unknown>([
                ["module", module],
                ["orgUnit", orgUnit],
                ["period", period],
            ])
        );
    }
    updateSampleUploadWithRisId(sampleUploadId: string, risUploadId: string): FutureData<void> {
        return this.dataStoreClient.listCollection<GlassUploads>(DataStoreKeys.UPLOADS).flatMap(uploads => {
            const upload = uploads?.find(upload => upload.id === sampleUploadId);
            if (upload) {
                upload.correspondingRisUploadId = risUploadId;
                return this.dataStoreClient.saveObject(DataStoreKeys.UPLOADS, uploads);
            } else {
                return Future.error("Upload does not exist");
            }
        });
    }

    setEventListFileId(id: string, eventListFileId: string): FutureData<void> {
        return this.dataStoreClient.listCollection<GlassUploads>(DataStoreKeys.UPLOADS).flatMap(uploads => {
            const upload = uploads?.find(upload => upload.id === id);
            if (upload) {
                upload.eventListFileId = eventListFileId;
                return this.dataStoreClient.saveObject(DataStoreKeys.UPLOADS, uploads);
            } else {
                return Future.error("Upload does not exist");
            }
        });
    }

    saveImportSummaryErrorsOfFilesInUploads(params: {
        primaryUploadId: Id;
        primaryImportSummaryErrors: ImportSummaryErrors;
        secondaryUploadId?: Id;
        secondaryImportSummaryErrors?: ImportSummaryErrors;
    }): FutureData<void> {
        const { primaryUploadId, primaryImportSummaryErrors, secondaryUploadId, secondaryImportSummaryErrors } = params;
        return this.dataStoreClient.listCollection<GlassUploads>(DataStoreKeys.UPLOADS).flatMap(uploads => {
            const primaryUpload = uploads?.find(upload => upload.id === primaryUploadId);
            const secondaryUpload = uploads?.find(upload => upload.id === secondaryUploadId);

            if (primaryUpload) {
                const primaryUpdatedUpload = {
                    ...primaryUpload,
                    importSummary: primaryImportSummaryErrors,
                };

                const secondaryUpdatedUpload = {
                    ...secondaryUpload,
                    importSummary: secondaryImportSummaryErrors,
                };

                const restUploads = uploads.filter(
                    upload => upload.id !== primaryUploadId && upload.id !== secondaryUploadId
                );

                const newUploads = secondaryUpload
                    ? [...restUploads, primaryUpdatedUpload, secondaryUpdatedUpload]
                    : [...restUploads, primaryUpdatedUpload];

                return this.dataStoreClient.saveObject(DataStoreKeys.UPLOADS, newUploads);
            } else {
                return Future.error("Upload does not exist");
            }
        });
    }

    getUploadsByDataSubmission(dataSubmissionId: string): FutureData<GlassUploads[]> {
        return this.dataStoreClient.getObjectsFilteredByProps<GlassUploads>(
            DataStoreKeys.UPLOADS,
            new Map<keyof GlassUploads, unknown>([["dataSubmission", dataSubmissionId]])
        );
    }

    getEventListFileIdByUploadId(id: string): FutureData<string> {
        return this.dataStoreClient.listCollection<GlassUploads>(DataStoreKeys.UPLOADS).flatMap(uploads => {
            const upload = uploads?.find(upload => upload.id === id);
            if (upload && upload.eventListFileId) {
                return Future.success(upload.eventListFileId);
            } else {
                return Future.error("Upload does not exist or does not have eventListFileId");
            }
        });
    }

    setCalculatedEventListFileId(uploadId: string, calculatedEventListFileId: string): FutureData<void> {
        return this.dataStoreClient.listCollection<GlassUploads>(DataStoreKeys.UPLOADS).flatMap(uploads => {
            const upload = uploads.find(upload => upload.id === uploadId);
            if (upload) {
                upload.calculatedEventListFileId = calculatedEventListFileId;
                const restUploads = uploads.filter(upload => upload.id !== uploadId);
                const newUploads = [...restUploads, { ...upload, calculatedEventListFileId }];
                return this.dataStoreClient.saveObject(DataStoreKeys.UPLOADS, newUploads);
            } else {
                return Future.error("Upload does not exist");
            }
        });
    }

    setMultipleErrorAsyncDeleting(ids: Id[]): FutureData<void> {
        return this.dataStoreClient.listCollection<GlassUploads>(DataStoreKeys.UPLOADS).flatMap(uploads => {
            const filteredUploads = uploads?.filter(upload => ids.includes(upload.id));
            if (filteredUploads.length > 0) {
                const updatedUploads = filteredUploads.map(upload => ({
                    ...upload,
                    errorAsyncDeleting: ids.includes(upload.id),
                }));
                const restUploads = uploads.filter(upload => !ids.includes(upload.id));

                return this.dataStoreClient.saveObject(DataStoreKeys.UPLOADS, [...restUploads, ...updatedUploads]);
            } else {
                return Future.success(undefined);
            }
        });
    }

    setMultipleErrorAsyncUploading(ids: Id[]): FutureData<void> {
        return this.dataStoreClient.listCollection<GlassUploads>(DataStoreKeys.UPLOADS).flatMap(uploads => {
            const filteredUploads = uploads?.filter(upload => ids.includes(upload.id));
            if (filteredUploads.length > 0) {
                const updatedUploads = filteredUploads.map(upload => ({
                    ...upload,
                    errorAsyncUploading: ids.includes(upload.id),
                }));
                const restUploads = uploads.filter(upload => !ids.includes(upload.id));

                return this.dataStoreClient.saveObject(DataStoreKeys.UPLOADS, [...restUploads, ...updatedUploads]);
            } else {
                return Future.success(undefined);
            }
        });
    }

    saveImportSummaries(params: { uploadId: Id; importSummaries: ImportSummary[] }): FutureData<void> {
        const { uploadId, importSummaries } = params;

        return this.dataStoreClient.listCollection<GlassUploads>(DataStoreKeys.UPLOADS).flatMap(uploads => {
            const uploadFound = uploads?.find(upload => upload.id === uploadId);
            if (uploadFound) {
                const mergedImportSummaryErrors: ImportSummaryErrors = importSummaries.reduce(
                    (acc: ImportSummaryErrors, summary: ImportSummary) => {
                        return {
                            nonBlockingErrors: [...acc.nonBlockingErrors, ...summary.nonBlockingErrors],
                            blockingErrors: [...acc.blockingErrors, ...summary.blockingErrors],
                        };
                    },
                    { nonBlockingErrors: [], blockingErrors: [] }
                );

                const restUploads = uploads.filter(upload => upload.id !== uploadId);
                const updatedUpload = {
                    ...uploadFound,
                    asyncImportSummaries: importSummaries,
                    importSummary: mergedImportSummaryErrors,
                };
                return this.dataStoreClient.saveObject(DataStoreKeys.UPLOADS, [...restUploads, updatedUpload]);
            } else {
                return Future.error("Upload does not exist");
            }
        });
    }
}
