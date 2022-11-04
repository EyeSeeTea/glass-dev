import { DataElementsD2Repository } from "./data/DataElementsD2Repository";
import { GetDataElementByIdUseCase } from "./domain/usecases/GetDataElementByIdUseCase";
import { GetDataElementsUseCase } from "./domain/usecases/GetDataElementsUseCase";
import { UpdateDataElementUseCase } from "./domain/usecases/UpdateDataElementUseCase";
import { D2Api } from "./types/d2-api";

export function getCompositionRoot(api: D2Api) {
    const dataElementsRepository = new DataElementsD2Repository(api);

    return {
        dataElements: {
            get: new GetDataElementsUseCase(dataElementsRepository),
            post: new UpdateDataElementUseCase(dataElementsRepository),
            getById: new GetDataElementByIdUseCase(dataElementsRepository),
        },
    };
}

export type CompositionRoot = ReturnType<typeof getCompositionRoot>;
