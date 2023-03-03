import { UseCase } from "../../CompositionRoot";
import { Future, FutureData } from "../entities/Future";
import { GlassModule } from "../entities/GlassModule";
import { CountryInformationRepository } from "../repositories/CountryInformationRepository";
import { GlassModuleRepository } from "../repositories/GlassModuleRepository";

export class GetGlassModuleByNameUseCase implements UseCase {
    constructor(
        private glassModuleRepository: GlassModuleRepository,

        private countryInformationRepository: CountryInformationRepository
    ) {}

    public execute(countryId: string, name: string): FutureData<GlassModule> {
        return this.glassModuleRepository
            .getByName(name)
            .flatMap(module => {
                return Future.joinObj({
                    module: Future.success(module),
                    countryInformation: this.countryInformationRepository.get(countryId, name),
                });
            })
            .flatMap(({ module, countryInformation }) => {
                if (countryInformation.nationalFocalPointId === undefined) {
                    return Future.error(
                        `You haven't permissions to access to the module ${name} in the country ${countryInformation.country}`
                    );
                }

                return Future.success(module);
            });
    }
}
