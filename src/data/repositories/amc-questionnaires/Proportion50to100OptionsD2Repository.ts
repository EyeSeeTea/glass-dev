import {
    proportion50to100Option,
    Proportion50to100Value,
} from "../../../domain/entities/amc-questionnaires/Proportion50to100Option";
import { Proportion50to100OptionsRepository } from "../../../domain/repositories/amc-questionnaires/Proportion50to100OptionsRepository";
import { OptionsD2Repository } from "./OptionsD2Repository";

export class Proportion50to100OptionsD2Repository
    extends OptionsD2Repository<Proportion50to100Value>
    implements Proportion50to100OptionsRepository
{
    protected optionSetCode = "Wj4OnCYc3V0";
    protected optionSetName = "Proportion 50 to 100 OptionSet";
    protected options = proportion50to100Option;
}
