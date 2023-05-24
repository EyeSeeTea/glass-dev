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
import { GetGlassModuleByIdUseCase } from "./domain/usecases/GetGlassModuleByIdUseCase";
import { GetGlassModulesUseCase } from "./domain/usecases/GetGlassModulesUseCase";
import { GetGlassNewsUseCase } from "./domain/usecases/GetGlassNewsUseCase";
import { GetGlassUploadsUseCase } from "./domain/usecases/GetGlassUploadsUseCase";
import { GetInstanceVersionUseCase } from "./domain/usecases/GetInstanceVersionUseCase";
import { ValidateGlassModulesUseCase } from "./domain/usecases/ValidateGlassModulesUseCase";
import { ValidateGlassNewsUseCase } from "./domain/usecases/ValidateGlassNewsUseCase";
import { GetDataSubmissionsByModuleAndOUUseCase } from "./domain/usecases/GetDataSubmissionsByModuleAndOUUseCase";
import { GetGlassDocumentsUseCase } from "./domain/usecases/GetGlassDocumentsUseCase";
import { UploadDocumentUseCase } from "./domain/usecases/UploadDocumentUseCase";
import { SetUploadStatusUseCase } from "./domain/usecases/SetUploadStatusUseCase";
import { GetGlassUploadsByDataSubmissionUseCase } from "./domain/usecases/GetGlassUploadsByDataSubmissionUseCase";
import { GetGlassUploadsByModuleOUUseCase } from "./domain/usecases/GetGlassUploadsByModuleOUUseCase";
import { SetUploadBatchIdUseCase } from "./domain/usecases/SetUploadBatchIdUseCase";
import { DeleteDocumentInfoByUploadIdUseCase } from "./domain/usecases/DeleteDocumentInfoByUploadIdUseCase";
import { ImportPrimaryFileUseCase } from "./domain/usecases/data-entry/ImportPrimaryFileUseCase";
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
import { GetGlassUploadsByModuleOUPeriodUseCase } from "./domain/usecases/GetGlassUploadsByModuleOUPeriodUseCase";
import { SetDataSubmissionStatusUseCase } from "./domain/usecases/SetDataSubmissionStatusUseCase";
import { DownloadDocumentUseCase } from "./domain/usecases/DownloadDocumentUseCase";
import { ValidatePrimaryFileUseCase } from "./domain/usecases/data-entry/ValidatePrimaryFileUseCase";
import { ValidateSampleFileUseCase } from "./domain/usecases/data-entry/ValidateSampleFileUseCase";
import { SaveDataSubmissionsUseCase } from "./domain/usecases/SaveDataSubmissionsUseCase";
import { UpdateSampleUploadWithRisIdUseCase } from "./domain/usecases/UpdateSampleUploadWithRisIdUseCase";
import { GetDashboardUseCase } from "./domain/usecases/GetDashboardUseCase";
import { SystemInfoDefaultRepository } from "./data/repositories/SystemInfoDefaultRepository";
import { GetLastAnalyticsRunTimeUseCase } from "./domain/usecases/GetLastAnalyticsRunTimeUseCase";
import { SendNotificationsUseCase } from "./domain/usecases/SendNotificationsUseCase";
import { UsersDefaultRepository } from "./data/repositories/UsersDefaultRepository";
import { GetUiLocalesUseCase } from "./domain/usecases/GetUiLocalesUseCase";
import { GetDatabaseLocalesUseCase } from "./domain/usecases/GetDatabaseLocalesUseCase";
import { LocalesDefaultRepository } from "./data/repositories/LocalesDefaultRepository";
import { EGASPDataCSVRepository } from "./data/repositories/EGASPDataCSVRepository";
import { Dhis2EventsDefaultRepository } from "./data/repositories/Dhis2EventsDefaultRepository";
import { EGASPProgramDefaultRepository } from "./data/repositories/bulk-load/EGASPProgramDefaultRepository";
import { ExcelPopulateRepository } from "./data/repositories/ExcelPopulateRepository";
import { SavePasswordUseCase } from "./domain/usecases/SavePasswordUseCase";
import { SaveKeyDbLocaleUseCase } from "./domain/usecases/SaveKeyDbLocaleUseCase";
import { SaveKeyUiLocaleUseCase } from "./domain/usecases/SaveKeyUiLocaleUseCase";

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
    const systemInfoRepository = new SystemInfoDefaultRepository(api);
    const usersRepository = new UsersDefaultRepository(api);
    const localeRepository = new LocalesDefaultRepository(instance);
    const egaspDataRepository = new EGASPDataCSVRepository();
    const dhis2EventsDefaultRepository = new Dhis2EventsDefaultRepository(instance);
    const egaspProgramRepository = new EGASPProgramDefaultRepository(instance);
    const excelRepository = new ExcelPopulateRepository();

    return {
        instance: getExecute({
            getCurrentUser: new GetCurrentUserUseCase(instanceRepository),
            getVersion: new GetInstanceVersionUseCase(instanceRepository),
        }),
        glassModules: getExecute({
            getAll: new GetGlassModulesUseCase(glassModuleRepository, countryInformationRepository),
            getByName: new GetGlassModuleByNameUseCase(glassModuleRepository, countryInformationRepository),
            getById: new GetGlassModuleByIdUseCase(glassModuleRepository),
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
            setStatus: new SetDataSubmissionStatusUseCase(glassDataSubmissionRepository),
            saveDataSubmissions: new SaveDataSubmissionsUseCase(glassDataSubmissionRepository),
        }),
        glassUploads: getExecute({
            getAll: new GetGlassUploadsUseCase(glassUploadsRepository),
            setStatus: new SetUploadStatusUseCase(glassUploadsRepository),
            getByDataSubmission: new GetGlassUploadsByDataSubmissionUseCase(glassUploadsRepository),
            getByModuleOU: new GetGlassUploadsByModuleOUUseCase(glassUploadsRepository),
            getByModuleOUPeriod: new GetGlassUploadsByModuleOUPeriodUseCase(glassUploadsRepository),
            setBatchId: new SetUploadBatchIdUseCase(glassUploadsRepository),
        }),
        glassDocuments: getExecute({
            getAll: new GetGlassDocumentsUseCase(glassDocumentsRepository),
            upload: new UploadDocumentUseCase(glassDocumentsRepository, glassUploadsRepository),
            deleteByUploadId: new DeleteDocumentInfoByUploadIdUseCase(glassDocumentsRepository, glassUploadsRepository),
            download: new DownloadDocumentUseCase(glassDocumentsRepository),
            updateSecondaryFileWithPrimaryId: new UpdateSampleUploadWithRisIdUseCase(glassUploadsRepository),
        }),
        fileSubmission: getExecute({
            primaryFile: new ImportPrimaryFileUseCase(
                risDataRepository,
                metadataRepository,
                dataValuesRepository,
                glassModuleRepository,
                egaspDataRepository,
                dhis2EventsDefaultRepository,
                egaspProgramRepository,
                excelRepository,
                glassDocumentsRepository,
                glassUploadsRepository
            ),
            validatePrimaryFile: new ValidatePrimaryFileUseCase(risDataRepository, egaspDataRepository),
            secondaryFile: new ImportSampleFileUseCase(sampleDataRepository, metadataRepository, dataValuesRepository),
            validateSecondaryFile: new ValidateSampleFileUseCase(sampleDataRepository),
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
            send: new SendNotificationsUseCase(notificationRepository, usersRepository),
        }),
        countries: getExecute({
            getInformation: new GetCountryInformationUseCase(countryInformationRepository),
        }),
        glassDashboard: getExecute({
            getDashboard: new GetDashboardUseCase(glassModuleRepository),
        }),
        systemInfo: getExecute({
            lastAnalyticsRunTime: new GetLastAnalyticsRunTimeUseCase(systemInfoRepository),
        }),
        locales: getExecute({
            getUiLocales: new GetUiLocalesUseCase(localeRepository),
            getDatabaseLocales: new GetDatabaseLocalesUseCase(localeRepository),
        }),
        user: getExecute({
            savePassword: new SavePasswordUseCase(usersRepository),
            saveKeyUiLocale: new SaveKeyUiLocaleUseCase(usersRepository),
            saveKeyDbLocale: new SaveKeyDbLocaleUseCase(usersRepository),
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
