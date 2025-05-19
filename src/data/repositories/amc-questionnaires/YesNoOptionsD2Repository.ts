import { yesNoOption, YesNoValue } from "../../../domain/entities/amc-questionnaires/YesNoOption";
import { YesNoOptionsRepository } from "../../../domain/repositories/amc-questionnaires/YesNoOptionsRepository";
import { OptionsD2Repository } from "./OptionsD2Repository";

export class YesNoOptionsD2Repository extends OptionsD2Repository<YesNoValue> implements YesNoOptionsRepository {
    protected optionSetCode = "IDtB1Hk2LAO";
    protected optionSetName = "Yes No OptionSet";
    protected options = yesNoOption;
}
