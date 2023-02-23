import { Id } from "../entities/Base";
import { DataForm } from "../entities/DataForm";

export interface DataFormRepository {
    get(options: { id: Id }): Promise<DataForm>;
}
