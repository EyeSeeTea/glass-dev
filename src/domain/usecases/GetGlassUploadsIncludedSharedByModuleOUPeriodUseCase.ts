import _ from "lodash";

import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassUploads } from "../entities/GlassUploads";
import { GlassUploadsRepository, UploadFilters } from "../repositories/GlassUploadsRepository";
import { moduleProperties } from "../utils/ModuleProperties";
import { GlassModuleRepository } from "../repositories/GlassModuleRepository";
import { GlassModule, GlassModuleName, MODULE_NAMES } from "../entities/GlassModule";
import { Maybe } from "../../types/utils";

export class GetGlassUploadsIncludedSharedByModuleOUPeriodUseCase implements UseCase {
    constructor(
        private glassUploadsRepository: GlassUploadsRepository,
        private glassModuleRepository: GlassModuleRepository
    ) {}

    public execute(moduleId: string, orgUnit: string, period: string): FutureData<GlassUploads[]> {
        return this.glassModuleRepository.getAll().flatMap(modules => {
            const additionalFilters = this.getModuleAdditionalFilters(moduleId, modules);
            return this.glassUploadsRepository.getUploadsByModuleOUPeriod({
                moduleId,
                orgUnit,
                period,
                additionalFilters,
            });
        });
    }

    private getModuleAdditionalFilters(moduleId: string, modules: GlassModule[]): Maybe<UploadFilters> {
        const module = modules.find(m => m.id === moduleId);
        if (!module) return undefined;

        const additionalFilters = this.getModuleUploadFilters(module.name);
        if (!additionalFilters) return undefined;

        return {
            ...additionalFilters,
            moduleIds: _(additionalFilters.moduleNames)
                .map(moduleName => modules.find(m => m.name === moduleName)?.id)
                .compact()
                .value(),
        };
    }

    private getModuleUploadFilters(moduleName: GlassModuleName): Maybe<ModuleUploadFilters> {
        const defaultFilters: ModuleUploadFilters = {
            moduleNames: [moduleName],
            fileTypes: [],
        };
        switch (moduleName) {
            case MODULE_NAMES.AMR: {
                const amr = moduleProperties.get(MODULE_NAMES.AMR);
                const amrIndividual = moduleProperties.get(MODULE_NAMES.AMR_INDIVIDUAL);

                if (!amr || !amrIndividual) return defaultFilters;

                return {
                    moduleNames: [MODULE_NAMES.AMR, MODULE_NAMES.AMR_INDIVIDUAL],
                    fileTypes: [amr.primaryFileType, amr.secondaryFileType, amrIndividual.secondaryFileType],
                };
            }
            case MODULE_NAMES.AMR_INDIVIDUAL: {
                const amr = moduleProperties.get(MODULE_NAMES.AMR);
                const amrIndividual = moduleProperties.get(MODULE_NAMES.AMR_INDIVIDUAL);

                if (!amr || !amrIndividual) return defaultFilters;

                return {
                    moduleNames: [MODULE_NAMES.AMR, MODULE_NAMES.AMR_INDIVIDUAL],
                    fileTypes: [amrIndividual.primaryFileType, amrIndividual.secondaryFileType, amr.secondaryFileType],
                };
            }
            case MODULE_NAMES.AMR_FUNGAL:
            case MODULE_NAMES.AMC:
            case MODULE_NAMES.EGASP:
                return defaultFilters;
        }
        return undefined;
    }
}
type ModuleUploadFilters = Omit<UploadFilters, "moduleIds"> & { moduleNames: GlassModuleName[] };
