import {
    antimicrobialClassOption,
    AntimicrobialClassValue,
} from "../../../domain/entities/amc-questionnaires/AntimicrobialClassOption";
import { AntimicrobialClassOptionsRepository } from "../../../domain/repositories/amc-questionnaires/AntimicrobialClassOptionsRepository";
import { OptionsD2Repository } from "./OptionsD2Repository";

export class AntimicrobialClassOptionsD2Repository
    extends OptionsD2Repository<AntimicrobialClassValue>
    implements AntimicrobialClassOptionsRepository
{
    protected optionSetCode = "CMUw2AAueVL";
    protected optionSetName = "Antimicrobial Class OptionSet";
    protected options = antimicrobialClassOption;
}
