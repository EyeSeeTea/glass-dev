import { Future, FutureData } from "../../entities/Future";
import { ImportSummary } from "../../entities/data-entry/ImportSummary";
import { EGASPDataRepository } from "../../repositories/data-entry/EGASPDataRepository";

export class ImportEGASPFile {
    constructor(private egaspDataRepository: EGASPDataRepository) {}

    public importEGASPFile(): FutureData<ImportSummary> {
        const importSummary: ImportSummary = {
            status: "SUCCESS",
            importCount: { imported: 99, updated: 99, ignored: 99, deleted: 99 },
            nonBlockingErrors: [],
            blockingErrors: [],
        };
        return Future.success(importSummary);
    }
}
