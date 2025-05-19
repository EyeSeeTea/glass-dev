import {
    Proportion50to100UnknownValue,
    proportion50to100UnknownOption,
} from "../../../domain/entities/amc-questionnaires/Proportion50to100UnknownOption";
import { Proportion50to100UnknownOptionsRepository } from "../../../domain/repositories/amc-questionnaires/Proportion50to100UnknownOptionsRepository";
import { OptionsD2Repository } from "./OptionsD2Repository";

export class Proportion50to100UnknownOptionsD2Repository
    extends OptionsD2Repository<Proportion50to100UnknownValue>
    implements Proportion50to100UnknownOptionsRepository
{
    protected optionSetCode = "tN1llzoUZKV";
    protected optionSetName = "Proportion 50 to 100 and Unknown OptionSet";
    protected options = proportion50to100UnknownOption;
}
