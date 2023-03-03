import { DataStoreClient } from "./data/data-store/DataStoreClient";
import { Instance } from "./data/entities/Instance";
import { GlassDataSubmissionsDefaultRepository } from "./data/repositories/GlassDataSubmissionDefaultRepository";
import { GlassModuleDefaultRepository } from "./data/repositories/GlassModuleDefaultRepository";
import { GlassNewsDefaultRepository } from "./data/repositories/GlassNewsDefaultRepository";
import { GlassUploadsDefaultRepository } from "./data/repositories/GlassUploadsDefaultRepository";
import { GlassDocumentsDefaultRepository } from "./data/repositories/GlassDocumentsDefaultRepository";
import { InstanceDefaultRepository } from "./data/repositories/InstanceDefaultRepository";
import { GetCurrentUserUseCase } from "./domain/usecases/GetCurrentUserUseCase";
import { GetSpecificDataSubmissionUseCase } from "./domain/usecases/GetSpecificDataSubmissionUseCase";
import { GetGlassModuleByNameUseCase } from "./domain/usecases/GetGlassModuleByNameUseCase";
import { GetGlassModulesUseCase } from "./domain/usecases/GetGlassModulesUseCase";
import { GetGlassNewsUseCase } from "./domain/usecases/GetGlassNewsUseCase";
import { GetGlassUploadsUseCase } from "./domain/usecases/GetGlassUploadsUseCase";
import { GetInstanceVersionUseCase } from "./domain/usecases/GetInstanceVersionUseCase";
import { ValidateGlassModulesUseCase } from "./domain/usecases/ValidateGlassModulesUseCase";
import { ValidateGlassNewsUseCase } from "./domain/usecases/ValidateGlassNewsUseCase";
import { ValidateGlassUploadsUseCase } from "./domain/usecases/ValidateGlassUploadsUseCase";
import { GetDataSubmissionsByModuleAndOUUseCase } from "./domain/usecases/GetDataSubmissionsByModuleAndOUUseCase";
import { GetGlassDocumentsUseCase } from "./domain/usecases/GetGlassDocumentsUseCase";
import { ValidateGlassDocumentsUseCase } from "./domain/usecases/ValidateGlassDocumentsUseCase";
import { UploadDocumentUseCase } from "./domain/usecases/UploadDocumentUseCase";
import { SetUploadStatusUseCase } from "./domain/usecases/SetUploadStatusUseCase";
import { GetGlassUploadsByDataSubmissionUseCase } from "./domain/usecases/GetGlassUploadsByDataSubmissionUseCase";
import { SetUploadBatchIdUseCase } from "./domain/usecases/SetUploadBatchIdUseCase";
import { DeleteDocumentInfoByUploadIdUseCase } from "./domain/usecases/DeleteDocumentInfoByUploadIdUseCase";
import { ImportRISFileUseCase } from "./domain/usecases/data-entry/ImportRISFileUseCase";
import { GetOpenDataSubmissionsByOUUseCase } from "./domain/usecases/GetOpenDataSubmissionsByOUUseCase";
import { getD2APiFromInstance } from "./utils/d2-api";
import { QuestionnaireD2Repository } from "./data/repositories/QuestionnaireD2Repository";
import { GetQuestionnaireUseCase } from "./domain/usecases/GetQuestionnaireUseCase";
import { SaveQuestionnaireResponseUseCase } from "./domain/usecases/SaveQuestionUseCase";
import { SetAsQuestionnaireCompletionUseCase } from "./domain/usecases/SetAsQuestionnaireCompletionUseCase";
import { GetQuestionnaireListUseCase } from "./domain/usecases/GetQuestionnaireListUseCase";
import { GetNotificationsUseCase } from "./domain/usecases/GetNotificationsUseCase";
import { NotificationDefaultRepository } from "./data/repositories/NotificationDefaultRepository";
import { DataValuesDefaultRepository } from "./data/repositories/DataValuesDefaultRepository";
import { MetadataDefaultRepository } from "./data/repositories/MetadataDefaultRepository";
import { GetCountryInformationUseCase } from "./domain/usecases/GetCountryInformationUseCase";
import { CountryInformationDefaultRepository } from "./data/repositories/CountryInformationDefaultRepository";
import { GetNotificationByIdUseCase } from "./domain/usecases/GetNotificationByIdUseCase";
import { ImportSampleFileUseCase } from "./domain/usecases/data-entry/ImportSampleFileUseCase";
import { RISDataCSVRepository } from "./data/repositories/RISDataCSVRepository";
import { SampleDataCSVRepository } from "./data/repositories/SampleDataCSVRepository";

export function getCompositionRoot(instance: Instance) {
    const api = getD2APiFromInstance(instance);
    const dataStoreClient = new DataStoreClient(instance);
    const instanceRepository = new InstanceDefaultRepository(instance, dataStoreClient);
    const glassModuleRepository = new GlassModuleDefaultRepository(dataStoreClient);
    const glassNewsRepository = new GlassNewsDefaultRepository(dataStoreClient);
    const glassDataSubmissionRepository = new GlassDataSubmissionsDefaultRepository(dataStoreClient);
    const glassUploadsRepository = new GlassUploadsDefaultRepository(dataStoreClient);
    const glassDocumentsRepository = new GlassDocumentsDefaultRepository(dataStoreClient, instance);
    const risDataRepository = new RISDataCSVRepository();
    const sampleDataRepository = new SampleDataCSVRepository();
    const dataValuesRepository = new DataValuesDefaultRepository(instance);
    const metadataRepository = new MetadataDefaultRepository(instance);
    const questionnaireD2Repository = new QuestionnaireD2Repository(api);
    const notificationRepository = new NotificationDefaultRepository(instance);
    const countryInformationRepository = new CountryInformationDefaultRepository(instance);

    return {
        instance: getExecute({
            getCurrentUser: new GetCurrentUserUseCase(instanceRepository),
            getVersion: new GetInstanceVersionUseCase(instanceRepository),
        }),
        glassModules: getExecute({
            getAll: new GetGlassModulesUseCase(glassModuleRepository, countryInformationRepository),
            getByName: new GetGlassModuleByNameUseCase(glassModuleRepository, countryInformationRepository),
            validate: new ValidateGlassModulesUseCase(glassModuleRepository),
        }),
        glassNews: getExecute({
            getAll: new GetGlassNewsUseCase(glassNewsRepository),
            validate: new ValidateGlassNewsUseCase(glassNewsRepository),
        }),

        glassDataSubmission: getExecute({
            getSpecificDataSubmission: new GetSpecificDataSubmissionUseCase(glassDataSubmissionRepository),
            getDataSubmissionsByModuleAndOU: new GetDataSubmissionsByModuleAndOUUseCase(glassDataSubmissionRepository),
            getOpenDataSubmissionsByOU: new GetOpenDataSubmissionsByOUUseCase(glassDataSubmissionRepository),
        }),
        glassUploads: getExecute({
            getAll: new GetGlassUploadsUseCase(glassUploadsRepository),
            validate: new ValidateGlassUploadsUseCase(glassUploadsRepository),
            setStatus: new SetUploadStatusUseCase(glassUploadsRepository),
            getByDataSubmission: new GetGlassUploadsByDataSubmissionUseCase(glassUploadsRepository),
            setBatchId: new SetUploadBatchIdUseCase(glassUploadsRepository),
        }),
        glassDocuments: getExecute({
            getAll: new GetGlassDocumentsUseCase(glassDocumentsRepository),
            validate: new ValidateGlassDocumentsUseCase(glassDocumentsRepository),
            upload: new UploadDocumentUseCase(glassDocumentsRepository, glassUploadsRepository),
            deleteByUploadId: new DeleteDocumentInfoByUploadIdUseCase(glassDocumentsRepository, glassUploadsRepository),
        }),
        dataSubmision: getExecute({
            RISFile: new ImportRISFileUseCase(
                risDataRepository,
                metadataRepository,
                dataValuesRepository,
                glassModuleRepository
            ),
            sampleFile: new ImportSampleFileUseCase(sampleDataRepository, metadataRepository, dataValuesRepository),
        }),
        questionnaires: getExecute({
            get: new GetQuestionnaireUseCase(questionnaireD2Repository),
            getList: new GetQuestionnaireListUseCase(questionnaireD2Repository),
            saveResponse: new SaveQuestionnaireResponseUseCase(questionnaireD2Repository),
            setAsCompleted: new SetAsQuestionnaireCompletionUseCase(questionnaireD2Repository),
        }),
        notifications: getExecute({
            getAll: new GetNotificationsUseCase(notificationRepository),
            getById: new GetNotificationByIdUseCase(notificationRepository),
        }),
        countries: getExecute({
            getInformation: new GetCountryInformationUseCase(countryInformationRepository),
        }),
    };
}

export type CompositionRoot = ReturnType<typeof getCompositionRoot>;

function getExecute<UseCases extends Record<Key, UseCase>, Key extends keyof UseCases>(
    useCases: UseCases
): { [K in Key]: UseCases[K]["execute"] } {
    const keys = Object.keys(useCases) as Key[];
    const initialOutput = {} as { [K in Key]: UseCases[K]["execute"] };

    return keys.reduce((output, key) => {
        const useCase = useCases[key];
        const execute = useCase.execute.bind(useCase) as UseCases[typeof key]["execute"];
        output[key] = execute;
        return output;
    }, initialOutput);
}

export interface UseCase {
    execute: Function;
}
