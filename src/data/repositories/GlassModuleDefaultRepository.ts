import { D2Api } from "@eyeseetea/d2-api/2.34";
import { Future, FutureData } from "../../domain/entities/Future";
import { GlassModule } from "../../domain/entities/GlassModule";
import { GlassModuleRepository } from "../../domain/repositories/GlassModuleRepository";
import { cache } from "../../utils/cache";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { apiToFuture } from "../../utils/futures";
import { glassColors } from "../../webapp/pages/app/themes/dhis2.theme";
import { Instance } from "../entities/Instance";

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
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    public getBaseUrl(): string {
        return this.api.baseUrl;
    }

    @cache()
    public getAll(): FutureData<GlassModule[]> {
        return Future.fromComputation((resolve, _reject) => {
            resolve(glassModules);

            return () => {};
        });
    }

    @cache()
    public getByName(name: string): FutureData<GlassModule> {
        return Future.fromComputation((resolve, reject) => {
            const module = glassModules.find(module => module.name === name);

            if (module) {
                resolve(module);
            } else {
                reject(`Glass module ${name} not found`);
            }

            return () => {};
        });
    }

    @cache()
    public getInstanceVersion(): FutureData<string> {
        return apiToFuture(this.api.system.info).map(({ version }) => version);
    }
}
