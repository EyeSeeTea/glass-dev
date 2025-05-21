import { healthLevelOption, HealthLevelValue } from "../../../domain/entities/amc-questionnaires/HealthLevelOption";
import { HealthLevelOptionsRepository } from "../../../domain/repositories/amc-questionnaires/HealthLevelOptionsRepository";
import { OptionsD2Repository } from "./OptionsD2Repository";

export class HealthLevelOptionsD2Repository
    extends OptionsD2Repository<HealthLevelValue>
    implements HealthLevelOptionsRepository
{
    protected optionSetCode = "W2sZc6cAtI3";
    protected optionSetName = "Health Level OptionSet";
    protected options = healthLevelOption;
}
