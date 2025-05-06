import {
    yesNoUnknownNAOption,
    YesNoUnknownNAValue,
} from "../../../domain/entities/amc-questionnaires/YesNoUnknownNAOption";
import { YesNoUnknownNAOptionsRepository } from "../../../domain/repositories/amc-questionnaires/YesNoUnknownNAOptionsRepository";
import { OptionsD2Repository } from "./OptionsD2Repository";

export class YesNoUnknownNAOptionsD2Repository
    extends OptionsD2Repository<YesNoUnknownNAValue>
    implements YesNoUnknownNAOptionsRepository
{
    protected optionSetCode = "AiMkLaJG9Oo";
    protected optionSetName = "Yes-No-Unknown-NA OptionSet";
    protected options = yesNoUnknownNAOption;
}
