import { DataStoreClient } from "./data/data-store/DataStoreClient";
import { Instance } from "./data/entities/Instance";
import { GlassCallDefaultRepository } from "./data/repositories/GlassCallDefaultRepository";
import { GlassModuleDefaultRepository } from "./data/repositories/GlassModuleDefaultRepository";
import { GlassNewsDefaultRepository } from "./data/repositories/GlassNewsDefaultRepository";
import { GlassSubmissionsDefaultRepository } from "./data/repositories/GlassSubmissionsDefaultRepository";
import { GlassDocumentsDefaultRepository } from "./data/repositories/GlassDocumentsDefaultRepository";
import { InstanceDefaultRepository } from "./data/repositories/InstanceDefaultRepository";
import { GetCurrentUserUseCase } from "./domain/usecases/GetCurrentUserUseCase";
import { GetSpecificCallUseCase } from "./domain/usecases/GetSpecificCallUseCase";
import { GetGlassModuleByNameUseCase } from "./domain/usecases/GetGlassModuleByNameUseCase";
import { GetGlassModulesUseCase } from "./domain/usecases/GetGlassModulesUseCase";
import { GetGlassNewsUseCase } from "./domain/usecases/GetGlassNewsUseCase";
import { GetGlassSubmissionsUseCase } from "./domain/usecases/GetGlassSubmissionsUseCase";
import { GetGlassDocumentsUseCase } from "./domain/usecases/GetGlassDocumentsUseCase";
import { GetInstanceVersionUseCase } from "./domain/usecases/GetInstanceVersionUseCase";
import { ValidateGlassModulesUseCase } from "./domain/usecases/ValidateGlassModulesUseCase";
import { ValidateGlassNewsUseCase } from "./domain/usecases/ValidateGlassNewsUseCase";
import { GetCallsByModuleAndOUUseCase } from "./domain/usecases/GetCallsByModuleAndOUUseCase";
import { ValidateGlassSubmissionsUseCase } from "./domain/usecases/ValidateGlassSubmissionsUseCase";
import { ValidateGlassDocumentsUseCase } from "./domain/usecases/ValidateGlassDocumentsUseCase";
import { UploadDocumentUseCase } from "./domain/usecases/UploadDocumentUseCase";
import { SetSubmissionStatusUseCase } from "./domain/usecases/SetSubmissionStatusUseCase";
import { GetGlassSubmissionsByCallUseCase } from "./domain/usecases/GetGlassSubmissionsByCallUseCase";

export function getCompositionRoot(instance: Instance) {
    const dataStoreClient = new DataStoreClient(instance);
    const instanceRepository = new InstanceDefaultRepository(instance);
    const glassModuleRepository = new GlassModuleDefaultRepository(dataStoreClient);
    const glassNewsRepository = new GlassNewsDefaultRepository(dataStoreClient);
    const glassCallRepository = new GlassCallDefaultRepository(dataStoreClient);
    const glassSubmissionsRepository = new GlassSubmissionsDefaultRepository(dataStoreClient);
    const glassDocumentsRepository = new GlassDocumentsDefaultRepository(dataStoreClient, instance);

    return {
        instance: getExecute({
            getCurrentUser: new GetCurrentUserUseCase(instanceRepository),
            getVersion: new GetInstanceVersionUseCase(instanceRepository),
        }),
        glassModules: getExecute({
            getAll: new GetGlassModulesUseCase(glassModuleRepository),
            getByName: new GetGlassModuleByNameUseCase(glassModuleRepository),
            validate: new ValidateGlassModulesUseCase(glassModuleRepository),
        }),
        glassNews: getExecute({
            getAll: new GetGlassNewsUseCase(glassNewsRepository),
            validate: new ValidateGlassNewsUseCase(glassNewsRepository),
        }),

        glassCall: getExecute({
            getSpecificCall: new GetSpecificCallUseCase(glassCallRepository),
            getCallsByModuleAndOU: new GetCallsByModuleAndOUUseCase(glassCallRepository),
        }),
        glassSubmissions: getExecute({
            getAll: new GetGlassSubmissionsUseCase(glassSubmissionsRepository),
            validate: new ValidateGlassSubmissionsUseCase(glassSubmissionsRepository),
            setStatus: new SetSubmissionStatusUseCase(glassSubmissionsRepository),
            getByCall: new GetGlassSubmissionsByCallUseCase(glassSubmissionsRepository),
        }),
        glassDocuments: getExecute({
            getAll: new GetGlassDocumentsUseCase(glassDocumentsRepository),
            validate: new ValidateGlassDocumentsUseCase(glassDocumentsRepository),
            upload: new UploadDocumentUseCase(glassDocumentsRepository, glassSubmissionsRepository),
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
