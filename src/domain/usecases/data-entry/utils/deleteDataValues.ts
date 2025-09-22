import _ from "lodash";
import { Maybe } from "../../../../utils/ts-utils";
import { DataValue } from "../../../entities/data-entry/DataValue";
import {
    DataValuesSaveSummary,
    getDefaultErrorDataValuesSaveSummary,
    joinAllDataValuesSummary,
} from "../../../entities/data-entry/DataValuesSaveSummary";
import { Future, FutureData } from "../../../entities/Future";
import { DataValuesRepository } from "../../../repositories/data-entry/DataValuesRepository";

export function deleteDataValues(
    dataValues: DataValue[],
    asyncDeleteChunkSize: Maybe<number>,
    dataValuesRepository: DataValuesRepository
): FutureData<DataValuesSaveSummary> {
    if (!asyncDeleteChunkSize) {
        return dataValuesRepository.save(dataValues, "DELETE", false);
    } else {
        const chunkedDataValues = _(dataValues).chunk(asyncDeleteChunkSize).value();

        const $deleteDataValuesFutures = chunkedDataValues.map((dataValuesChunk, index) => {
            console.debug(`Deleting chunk ${index + 1} of ${chunkedDataValues.length}.`);
            return dataValuesRepository
                .save(dataValuesChunk, "DELETE", false)
                .mapError(error => {
                    console.error(`[${new Date().toISOString()}] Error deleting Sample File data values: ${error}`);
                    const dataValuesSaveSummaryError: DataValuesSaveSummary =
                        getDefaultErrorDataValuesSaveSummary(error);

                    return dataValuesSaveSummaryError;
                })
                .flatMap((dataValuesSaveSummary): Future<DataValuesSaveSummary, DataValuesSaveSummary> => {
                    console.debug(
                        `[${new Date().toISOString()}] Finished deleting chunk ${index + 1} of ${
                            chunkedDataValues.length
                        }.`
                    );
                    const hasErrorStatus = dataValuesSaveSummary.status === "ERROR";
                    if (hasErrorStatus) {
                        return Future.error(dataValuesSaveSummary);
                    } else {
                        return Future.success(dataValuesSaveSummary);
                    }
                });
        });

        return Future.sequentialWithAccumulation($deleteDataValuesFutures, {
            stopOnError: true,
        })
            .flatMap(result => {
                if (result.type === "error") {
                    const errorImportSummary = result.error;
                    const messageErrors = errorImportSummary.conflicts?.map(error => error).join(", ");

                    console.error(
                        `[${new Date().toISOString()}] Error deleting Sample File data values: ${messageErrors}`
                    );
                    const accumulatedImportSummaries = result.data;
                    const joinedSummaries = joinAllDataValuesSummary([
                        ...accumulatedImportSummaries,
                        errorImportSummary,
                    ]);
                    return Future.success(joinedSummaries);
                } else {
                    console.debug(`[${new Date().toISOString()}] SUCCESS - Finished deleting all chunks.`);
                    return Future.success(joinAllDataValuesSummary(result.data));
                }
            })
            .mapError(() => `[${new Date().toISOString()}] - Unknown error while deleting Sample File data values.`);
    }
}
