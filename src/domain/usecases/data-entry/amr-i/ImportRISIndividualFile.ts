import { Future, FutureData } from "../../../entities/Future";
import { ImportStrategy } from "../../../entities/data-entry/DataValuesSaveSummary";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { RISIndividualDataRepository } from "../../../repositories/data-entry/RISIndividualDataRepository";

export class ImportRISIndividualFile {
    constructor(private risIndividualRepository: RISIndividualDataRepository) {}

    public importRISIndividualFile(
        inputFile: File,
        action: ImportStrategy,
        orgUnit: string,
        period: string
    ): FutureData<ImportSummary> {
        return this.risIndividualRepository.get(inputFile).flatMap(risIndividualDataItems => {
            console.debug(risIndividualDataItems, action, orgUnit, period);
            //TO DO : Add Validation
            const successSummary: ImportSummary = {
                status: "SUCCESS",
                importCount: {
                    ignored: 0,
                    imported: 0,
                    deleted: 0,
                    updated: 0,
                },
                nonBlockingErrors: [],
                blockingErrors: [],
            };
            return Future.success(successSummary);
        });
    }
}
