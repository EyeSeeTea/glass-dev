import {
    ProcurementLevelValue,
    procurementLevelOption,
} from "../../../domain/entities/amc-questionnaires/ProcurementLevelOption";
import { ProcurementLevelOptionsRepository } from "../../../domain/repositories/amc-questionnaires/ProcurementLevelOptionsRepository";
import { OptionsD2Repository } from "./OptionsD2Repository";

export class ProcurementLevelOptionsD2Repository
    extends OptionsD2Repository<ProcurementLevelValue>
    implements ProcurementLevelOptionsRepository
{
    protected optionSetCode = "idNZNuFnZCt";
    protected optionSetName = "Procurement Level OptionSet";
    protected options = procurementLevelOption;
}
