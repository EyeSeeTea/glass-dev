import { DataStoreClient } from "./data/data-store/DataStoreClient";
import { Instance } from "./data/entities/Instance";
import { GlassModuleDefaultRepository } from "./data/repositories/GlassModuleDefaultRepository";
import { InstanceDefaultRepository } from "./data/repositories/InstanceDefaultRepository";
import { GetCurrentUserUseCase } from "./domain/usecases/GetCurrentUserUseCase";
import { GetGlassModuleByNameUseCase } from "./domain/usecases/GetGlassModuleByNameUseCase";
import { GetGlassModulesUseCase } from "./domain/usecases/GetGlassModulesUseCase";
import { GetInstanceVersionUseCase } from "./domain/usecases/GetInstanceVersionUseCase";

export function getCompositionRoot(instance: Instance) {
    const dataStoreClient = new DataStoreClient(instance);
    const instanceRepository = new InstanceDefaultRepository(instance);
    const glassModuleRepository = new GlassModuleDefaultRepository(dataStoreClient);

    return {
        instance: getExecute({
            getCurrentUser: new GetCurrentUserUseCase(instanceRepository),
            getVersion: new GetInstanceVersionUseCase(instanceRepository),
        }),
        glassModules: getExecute({
            getAll: new GetGlassModulesUseCase(glassModuleRepository),
            getByName: new GetGlassModuleByNameUseCase(glassModuleRepository),
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
