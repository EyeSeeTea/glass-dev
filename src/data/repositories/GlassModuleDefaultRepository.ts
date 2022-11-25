import { Future, FutureData } from "../../domain/entities/Future";
import { GlassModule } from "../../domain/entities/GlassModule";
import { GlassModuleRepository } from "../../domain/repositories/GlassModuleRepository";
import { cache } from "../../utils/cache";
import { glassColors } from "../../webapp/pages/app/themes/dhis2.theme";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";

const glassModules = [
    {
        name: "AMR",
        color: glassColors.lightSecondary,
    },
    {
        name: "AMC",
        color: glassColors.lightTertiary,
    },
    {
        name: "EGASP",
        color: glassColors.lightPrimary,
    },
];

export class GlassModuleDefaultRepository implements GlassModuleRepository {
    constructor(private dataStoreClient: DataStoreClient) {}

    @cache()
    public getAll(): FutureData<GlassModule[]> {
        return this.dataStoreClient.listCollection<GlassModule>(DataStoreKeys.MODULES);
        // return Future.fromComputation((resolve, _reject) => {
        //     resolve(glassModules);

        //     return () => {};
        // });
    }

    @cache()
    public getByName(name: string): FutureData<GlassModule> {
        return this.dataStoreClient.getObjectCollectionByProp<GlassModule>(DataStoreKeys.MODULES, "name", name);

        // return Future.fromComputation((resolve, reject) => {
        //     const module = glassModules.find(module => module.name === name);

        //     if (module) {
        //         resolve(module);
        //     } else {
        //         reject(`Glass module ${name} not found`);
        //     }

        //     return () => {};
        // });
    }
}
