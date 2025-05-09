import {
    NationalPopulationDataSourceValue,
    nationalPopulationDataSourceOption,
} from "../../../domain/entities/amc-questionnaires/NationalPopulationDataSourceOption";
import { NationalPopulationDataSourceOptionsRepository } from "../../../domain/repositories/amc-questionnaires/NationalPopulationDataSourceOptionsRepository";
import { OptionsD2Repository } from "./OptionsD2Repository";

export class NationalPopulationDataSourceOptionsD2Repository
    extends OptionsD2Repository<NationalPopulationDataSourceValue>
    implements NationalPopulationDataSourceOptionsRepository
{
    protected optionSetCode = "OchLSb76Opn";
    protected optionSetName = "National Population Data Source OptionSet";
    protected options = nationalPopulationDataSourceOption;
}
