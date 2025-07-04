import { dataSourceOption, DataSourceValue } from "../../../domain/entities/amc-questionnaires/DataSourceOption";
import { DataSourceOptionsRepository } from "../../../domain/repositories/amc-questionnaires/DataSourceOptionsRepository";
import { OptionsD2Repository } from "./OptionsD2Repository";

export class DataSourceOptionsD2Repository
    extends OptionsD2Repository<DataSourceValue>
    implements DataSourceOptionsRepository
{
    protected optionSetCode = "KxaU7AN3WyS";
    protected optionSetName = "Data Source OptionSet";
    protected options = dataSourceOption;
}
