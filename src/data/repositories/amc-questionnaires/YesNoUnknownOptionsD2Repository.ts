import { yesNoUnknownOption, YesNoUnknownValue } from "../../../domain/entities/amc-questionnaires/YesNoUnknownOption";
import { YesNoUnknownOptionsRepository } from "../../../domain/repositories/amc-questionnaires/YesNoUnknownOptionsRepository";
import { OptionsD2Repository } from "./OptionsD2Repository";

export class YesNoUnknownOptionsD2Repository
    extends OptionsD2Repository<YesNoUnknownValue>
    implements YesNoUnknownOptionsRepository
{
    protected optionSetCode = "AnhivZSAKsu";
    protected optionSetName = "Yes-No-Unknown OptionSet";
    protected options = yesNoUnknownOption;
}
