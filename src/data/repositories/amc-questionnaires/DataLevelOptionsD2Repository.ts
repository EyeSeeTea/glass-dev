import { dataLevelOption, DataLevelValue } from "../../../domain/entities/amc-questionnaires/DataLevelOption";
import { DataLevelOptionsRepository } from "../../../domain/repositories/amc-questionnaires/DataLevelOptionsRepository";
import { OptionsD2Repository } from "./OptionsD2Repository";

export class DataLevelOptionsD2Repository
    extends OptionsD2Repository<DataLevelValue>
    implements DataLevelOptionsRepository
{
    protected optionSetCode = "lCBIRLL7z72";
    protected optionSetName = "Data Level OptionSet";
    protected options = dataLevelOption;
}
