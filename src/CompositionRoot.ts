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
import { QuestionnaireD2DefaultRepository } from "./data/repositories/QuestionnaireD2DefaultRepository";
import { GetQuestionnaireUseCase } from "./domain/usecases/GetQuestionnaireUseCase";
import { SaveQuestionnaireResponseUseCase } from "./domain/usecases/SaveQuestionUseCase";
import { SetAsQuestionnaireCompletionUseCase } from "./domain/usecases/SetAsQuestionnaireCompletionUseCase";
import { GetQuestionnaireListUseCase } from "./domain/usecases/GetQuestionnaireListUseCase";
import { GetNotificationsUseCase } from "./domain/usecases/GetNotificationsUseCase";
import { NotificationDefaultRepository } from "./data/repositories/NotificationDefaultRepository";
import { DataValuesDefaultRepository } from "./data/repositories/data-entry/DataValuesDefaultRepository";
import { MetadataDefaultRepository } from "./data/repositories/MetadataDefaultRepository";
import { GetCountryInformationUseCase } from "./domain/usecases/GetCountryInformationUseCase";
import { CountryInformationDefaultRepository } from "./data/repositories/CountryInformationDefaultRepository";
import { GetNotificationByIdUseCase } from "./domain/usecases/GetNotificationByIdUseCase";
import { ImportSecondaryFileUseCase } from "./domain/usecases/data-entry/ImportSecondaryFileUseCase";
import { RISDataCSVDefaultRepository } from "./data/repositories/data-entry/RISDataCSVDefaultRepository";
import { SampleDataCSVDeafultRepository } from "./data/repositories/data-entry/SampleDataCSVDeafultRepository";
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
import { DeleteNotificationUseCase } from "./domain/usecases/DeleteNotificationUseCase";
import { UsersDefaultRepository } from "./data/repositories/UsersDefaultRepository";
import { GetUiLocalesUseCase } from "./domain/usecases/GetUiLocalesUseCase";
import { GetDatabaseLocalesUseCase } from "./domain/usecases/GetDatabaseLocalesUseCase";
import { LocalesDefaultRepository } from "./data/repositories/LocalesDefaultRepository";
import { EGASPDataCSVDefaultRepository } from "./data/repositories/data-entry/EGASPDataCSVDefaultRepository";
import { Dhis2EventsDefaultRepository } from "./data/repositories/Dhis2EventsDefaultRepository";
import { EGASPProgramDefaultRepository } from "./data/repositories/download-empty-template/EGASPProgramDefaultRepository";
import { ExcelPopulateDefaultRepository } from "./data/repositories/ExcelPopulateDefaultRepository";
import { SavePasswordUseCase } from "./domain/usecases/SavePasswordUseCase";
import { SaveKeyDbLocaleUseCase } from "./domain/usecases/SaveKeyDbLocaleUseCase";
import { SaveKeyUiLocaleUseCase } from "./domain/usecases/SaveKeyUiLocaleUseCase";
import { ProgramRulesMetadataDefaultRepository } from "./data/repositories/program-rule/ProgramRulesMetadataDefaultRepository";
import { RISIndividualFunghiDataCSVDefaultRepository } from "./data/repositories/data-entry/RISIndividualFunghiDataCSVDefaultRepository";
import { TrackerDefaultRepository } from "./data/repositories/TrackerDefaultRepository";
import { GetProgramQuestionnaireUseCase } from "./domain/usecases/GetProgramQuestionnaireUseCase";
import { CaptureFormDefaultRepository } from "./data/repositories/CaptureFormDefaultRepository";
import { ImportProgramQuestionnaireDataUseCase } from "./domain/usecases/data-entry/ImportProgramQuestionnaireDataUseCase";
import { SignalDefaultRepository } from "./data/repositories/SignalDefaultRepository";
import { GetProgramQuestionnairesUseCase } from "./domain/usecases/GetProgramQuestionnairesUseCase";
import { GetPopulatedProgramQuestionnaireUseCase } from "./domain/usecases/GetPopulatedProgramQuestionnaireUseCase";
import { DeleteSignalUseCase } from "./domain/usecases/DeleteSignalUseCase";
import { GetEventProgramEmptyTemplateUseCase } from "./domain/usecases/data-entry/egasp/GetEventProgramEmptyTemplateUseCase";
import { DownloadEmptyTemplateDefautlRepository } from "./data/repositories/download-empty-template/DownloadEmptyTemplateDefautlRepository";
import { BulkLoadDataStoreClient } from "./data/data-store/BulkLoadDataStoreClient";
import { ApplyAMCQuestionUpdationUseCase } from "./domain/usecases/ApplyAMCQuestionUpdationUseCase";
import { SaveImportSummaryErrorsOfFilesInUploadsUseCase } from "./domain/usecases/SaveImportSummaryErrorsOfFilesInUploadsUseCase";
import { AMCProductDataRepository } from "./data/repositories/data-entry/AMCProductDataRepository";
import { AMCSubstanceDataRepository } from "./data/repositories/data-entry/AMCSubstanceDataRepository";

export function getCompositionRoot(instance: Instance) {
    const api = getD2APiFromInstance(instance);
    const dataStoreClient = new DataStoreClient(instance);
    const bulkLoadDatastoreClient = new BulkLoadDataStoreClient(instance);
    const instanceRepository = new InstanceDefaultRepository(instance, dataStoreClient);
    const glassModuleRepository = new GlassModuleDefaultRepository(dataStoreClient);
    const glassNewsRepository = new GlassNewsDefaultRepository(dataStoreClient);
    const glassDataSubmissionRepository = new GlassDataSubmissionsDefaultRepository(dataStoreClient);
    const glassUploadsRepository = new GlassUploadsDefaultRepository(dataStoreClient);
    const glassDocumentsRepository = new GlassDocumentsDefaultRepository(dataStoreClient, instance);
    const risDataRepository = new RISDataCSVDefaultRepository();
    const risIndividualFunghiRepository = new RISIndividualFunghiDataCSVDefaultRepository();
    const sampleDataRepository = new SampleDataCSVDeafultRepository();
    const dataValuesRepository = new DataValuesDefaultRepository(instance);
    const metadataRepository = new MetadataDefaultRepository(instance);
    const questionnaireD2Repository = new QuestionnaireD2DefaultRepository(api);
    const notificationRepository = new NotificationDefaultRepository(instance);
    const countryInformationRepository = new CountryInformationDefaultRepository(instance);
    const systemInfoRepository = new SystemInfoDefaultRepository(api);
    const usersRepository = new UsersDefaultRepository(api);
    const localeRepository = new LocalesDefaultRepository(instance);
    const egaspDataRepository = new EGASPDataCSVDefaultRepository();
    const dhis2EventsDefaultRepository = new Dhis2EventsDefaultRepository(instance);
    const egaspProgramRepository = new EGASPProgramDefaultRepository(instance, bulkLoadDatastoreClient);
    const excelRepository = new ExcelPopulateDefaultRepository();
    const programRulesMetadataDefaultRepository = new ProgramRulesMetadataDefaultRepository(instance);
    const trackerRepository = new TrackerDefaultRepository(instance);
    const captureFormRepository = new CaptureFormDefaultRepository(api);
    const signalRepository = new SignalDefaultRepository(dataStoreClient, api);
    const downloadEmptyTemplateRepository = new DownloadEmptyTemplateDefautlRepository(instance);
    const amcProductDataRepository = new AMCProductDataRepository();
    const amcSubstanceDataRepository = new AMCSubstanceDataRepository();

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
            saveImportSummaryErrorsOfFiles: new SaveImportSummaryErrorsOfFilesInUploadsUseCase(glassUploadsRepository),
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
                risIndividualFunghiRepository,
                metadataRepository,
                dataValuesRepository,
                glassModuleRepository,
                dhis2EventsDefaultRepository,
                excelRepository,
                glassDocumentsRepository,
                glassUploadsRepository,
                trackerRepository,
                glassModuleRepository,
                instanceRepository,
                programRulesMetadataDefaultRepository
            ),
            validatePrimaryFile: new ValidatePrimaryFileUseCase(
                risDataRepository,
                risIndividualFunghiRepository,
                egaspDataRepository,
                glassModuleRepository,
                amcProductDataRepository
            ),
            secondaryFile: new ImportSecondaryFileUseCase(
                sampleDataRepository,
                metadataRepository,
                dataValuesRepository,
                excelRepository,
                instanceRepository,
                glassDocumentsRepository,
                glassUploadsRepository,
                dhis2EventsDefaultRepository,
                programRulesMetadataDefaultRepository
            ),
            validateSecondaryFile: new ValidateSampleFileUseCase(
                sampleDataRepository,
                amcSubstanceDataRepository,
                glassModuleRepository
            ),
            downloadEmptyTemplate: new GetEventProgramEmptyTemplateUseCase(
                metadataRepository,
                downloadEmptyTemplateRepository,
                excelRepository,
                egaspProgramRepository
            ),
        }),
        questionnaires: getExecute({
            get: new GetQuestionnaireUseCase(questionnaireD2Repository),
            getList: new GetQuestionnaireListUseCase(questionnaireD2Repository, dhis2EventsDefaultRepository),
            saveResponse: new SaveQuestionnaireResponseUseCase(questionnaireD2Repository),
            setAsCompleted: new SetAsQuestionnaireCompletionUseCase(questionnaireD2Repository),
        }),
        notifications: getExecute({
            getAll: new GetNotificationsUseCase(notificationRepository),
            getById: new GetNotificationByIdUseCase(notificationRepository),
            send: new SendNotificationsUseCase(notificationRepository, usersRepository),
            delete: new DeleteNotificationUseCase(notificationRepository),
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
        programQuestionnaires: getExecute({
            getForm: new GetProgramQuestionnaireUseCase(captureFormRepository),
            importData: new ImportProgramQuestionnaireDataUseCase(
                dhis2EventsDefaultRepository,
                signalRepository,
                notificationRepository,
                usersRepository
            ),
            getList: new GetProgramQuestionnairesUseCase(signalRepository),
            getPopulatedForm: new GetPopulatedProgramQuestionnaireUseCase(captureFormRepository),
            delete: new DeleteSignalUseCase(dhis2EventsDefaultRepository, signalRepository),
            applyValidations: new ApplyAMCQuestionUpdationUseCase(),
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
