import { healthSectorOption, HealthSectorValue } from "../../../domain/entities/amc-questionnaires/HealthSectorOption";
import { HealthSectorOptionsRepository } from "../../../domain/repositories/amc-questionnaires/HealthSectorOptionsRepository";
import { OptionsD2Repository } from "./OptionsD2Repository";

export class HealthSectorOptionsD2Repository
    extends OptionsD2Repository<HealthSectorValue>
    implements HealthSectorOptionsRepository
{
    protected optionSetCode = "STBRCMP6sbH";
    protected optionSetName = "Health Sector OptionSet";
    protected options = healthSectorOption;
}
