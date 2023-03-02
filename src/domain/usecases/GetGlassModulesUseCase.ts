import { UseCase } from "../../CompositionRoot";
import { CountryInformation } from "../entities/CountryInformation";
import { Future, FutureData } from "../entities/Future";
import { GlassModule } from "../entities/GlassModule";
import { CountryInformationRepository } from "../repositories/CountryInformationRepository";
import { GlassModuleRepository } from "../repositories/GlassModuleRepository";

export class GetGlassModulesUseCase implements UseCase {
    constructor(
        private glassModuleRepository: GlassModuleRepository,
        private countryInformationRepository: CountryInformationRepository
    ) {}

    public execute(countryId: string): FutureData<GlassModule[]> {
        return this.glassModuleRepository
            .getAll()
            .flatMap(modules => {
                return Future.joinObj({
                    modules: Future.success(modules),
                    // TODO: if we have performance issues, we can create a method in the repository to get CountryInformations in a single request
                    countryInformations: Future.parallel(
                        modules.map(module => this.countryInformationRepository.get(countryId, module.name))
                    ),
                });
            })
            .map(({ modules, countryInformations }) =>
                this.filterByExistedCountryInformation(modules, countryInformations)
            );
    }

    private filterByExistedCountryInformation(
        modules: GlassModule[],
        countryInformations: CountryInformation[]
    ): GlassModule[] {
        return modules.filter(module => {
            const countryInformation = countryInformations.find(
                countryInformation =>
                    countryInformation.module === module.name && countryInformation.nationalFocalPointId !== undefined
            );

            return countryInformation !== undefined;
        });
    }
}
