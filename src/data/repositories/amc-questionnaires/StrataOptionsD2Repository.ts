import { StrataValue, strataOption } from "../../../domain/entities/amc-questionnaires/StrataOption";
import { StrataOptionsRepository } from "../../../domain/repositories/amc-questionnaires/StrataOptionsRepository";
import { OptionsD2Repository } from "./OptionsD2Repository";

export class StrataOptionsD2Repository extends OptionsD2Repository<StrataValue> implements StrataOptionsRepository {
    protected optionSetCode = "ZMwHadH2OwV";
    protected optionSetName = "Strata OptionSet";
    protected options = strataOption;
}
