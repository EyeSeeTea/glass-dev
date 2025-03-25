import { D2Api, MetadataResponse } from "@eyeseetea/d2-api/2.34";
import FormData from "form-data";
import { Future, FutureData } from "../../domain/entities/Future";
import { GlassDocuments } from "../../domain/entities/GlassDocuments";
import { GlassDocumentsRepository } from "../../domain/repositories/GlassDocumentsRepository";
import { cache } from "../../utils/cache";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";
import { Instance } from "../entities/Instance";
import { apiToFuture } from "../../utils/futures";
import { FileUploadResult } from "@eyeseetea/d2-api/api/files";
import { generateUid } from "../../utils/uid";
import { Id } from "../../domain/entities/Ref";
import { HttpResponse } from "@eyeseetea/d2-api/api/common";

type PartialSaveFileResourceResponse = {
    response?: {
        fileResource?: {
            id?: string;
        };
    };
};

type UploadFileBufferResponse = {
    id: string;
    fileResourceId: string;
};
export class GlassDocumentsDefaultRepository implements GlassDocumentsRepository {
    private api: D2Api;

    constructor(private dataStoreClient: DataStoreClient, instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    @cache()
    getAll(): FutureData<GlassDocuments[]> {
        return this.dataStoreClient.listCollection<GlassDocuments>(DataStoreKeys.DOCUMENTS);
    }

    save(file: File, module: string): FutureData<string> {
        return Future.join2(
            apiToFuture(
                this.api.files.upload({
                    name: file?.name as string,
                    data: file as Blob,
                })
            ),
            this.dataStoreClient.listCollection<GlassDocuments>(DataStoreKeys.DOCUMENTS)
        ).flatMap(([fileUploadResult, documents]: [FileUploadResult, GlassDocuments[]]) => {
            return this.saveSharingSettingsAndNewDocument(
                fileUploadResult.id,
                fileUploadResult.fileResourceId,
                documents,
                module
            );
        });
    }

    saveBuffer(fileBuffer: Buffer, fileName: string, module: string): FutureData<string> {
        return Future.join2(
            this.uploadFileBuffer(fileBuffer, fileName),
            this.dataStoreClient.listCollection<GlassDocuments>(DataStoreKeys.DOCUMENTS)
        ).flatMap(([fileUploadResult, documents]: [UploadFileBufferResponse, GlassDocuments[]]) => {
            return this.saveSharingSettingsAndNewDocument(
                fileUploadResult.id,
                fileUploadResult.fileResourceId,
                documents,
                module
            );
        });
    }

    private uploadFileBuffer(fileBuffer: Buffer, fileName: string): FutureData<UploadFileBufferResponse> {
        const formData = new FormData();
        formData.append("file", fileBuffer, fileName);
        formData.append("domain", "DOCUMENT");

        return apiToFuture(
            this.api.post<PartialSaveFileResourceResponse>("/fileResources", undefined, formData, {
                requestBodyType: "raw",
            })
        ).flatMap(fileUploadResult => {
            const fileResourceId = fileUploadResult.response?.fileResource?.id;

            if (!fileResourceId) {
                return Future.error("Error when saving file resource");
            }

            const document = { id: generateUid(), name: fileName, url: fileResourceId };

            return apiToFuture(
                this.api.post<MetadataResponse | HttpResponse<MetadataResponse>>(
                    "/metadata",
                    {},
                    { documents: [document] }
                )
            ).flatMap(() => {
                return Future.success({ id: document.id, fileResourceId });
            });
        });
    }

    delete(id: string): FutureData<string> {
        return this.dataStoreClient.listCollection<GlassDocuments>(DataStoreKeys.DOCUMENTS).flatMap(documents => {
            const document = documents.find(document => document.id === id);
            if (document) {
                documents.splice(documents.indexOf(document), 1);
                return this.dataStoreClient
                    .saveObject(DataStoreKeys.DOCUMENTS, documents)
                    .flatMap(() => Future.success(document.id));
            } else {
                return Future.error("Document could not be found");
            }
        });
    }

    download(id: string): FutureData<Blob> {
        return apiToFuture(this.api.files.get(id));
    }

    deleteDocumentApi(id: string): FutureData<void> {
        return apiToFuture(this.api.files.delete(id)).flatMap(response => {
            if (response.httpStatus === "OK") return Future.success(undefined);
            else return Future.error("Error when deleting document");
        });
    }

    private saveSharingSettingsAndNewDocument(
        id: Id,
        fileResourceId: Id,
        documents: GlassDocuments[],
        module: string
    ): FutureData<string> {
        return apiToFuture(
            this.api.sharing.search({
                key: `AMR-${module.substring(0, module.indexOf(" ") !== -1 ? module.indexOf(" ") : module.length)}`,
            })
        ).flatMap(({ userGroups }) => {
            const dataVisualizerGroup = userGroups.find(group => group.name.includes("visualizer"));
            const dataCaptureGroup = userGroups.find(group => group.name.includes("capture"));
            if (!dataVisualizerGroup || !dataCaptureGroup) {
                return Future.error("Error getting data visualizer/capture groups for selected module");
            }
            return apiToFuture(
                this.api.sharing.post(
                    {
                        id: id,
                        type: "document",
                    },
                    {
                        externalAccess: false,
                        publicAccess: "--------",
                        userGroupAccesses: [
                            {
                                access: "r-------",
                                ...dataVisualizerGroup,
                            },
                            {
                                access: "rw------",
                                ...dataCaptureGroup,
                            },
                        ],
                    }
                )
            ).flatMap(() => {
                const document = {
                    id: id,
                    fileResourceId: fileResourceId,
                    createdAt: new Date().toISOString(),
                };
                const newDocuments = [...documents, document];
                return this.dataStoreClient
                    .saveObject(DataStoreKeys.DOCUMENTS, newDocuments)
                    .flatMap(() => Future.success(document.id));
            });
        });
    }
}
