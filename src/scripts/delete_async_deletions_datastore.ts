import { command, run } from "cmd-ts";
import "dotenv/config";
import { FutureData } from "../domain/entities/Future";
import { GlassModule, GlassModuleName } from "../domain/entities/GlassModule";
import { GlassUploads } from "../domain/entities/GlassUploads";
import { GlassAsyncDeletionsRepository } from "../domain/repositories/GlassAsyncDeletionsRepository";
import { Id } from "../domain/entities/Ref";
import { GetAsyncDeletionsUseCase } from "../domain/usecases/GetAsyncDeletionsUseCase";
import { GlassAsyncDeletion, GlassAsyncDeletionStatus } from "../domain/entities/GlassAsyncDeletions";
import { RemoveAsyncDeletionByIdUseCase } from "../domain/usecases/RemoveAsyncDeletionByIdUseCase";
import { RemoveAsyncDeletionsUseCase } from "../domain/usecases/RemoveAsyncDeletionsUseCase";
import { SetAsyncDeletionsStatusUseCase } from "../domain/usecases/SetAsyncDeletionsStatusUseCase";
import { GlassModuleRepository } from "../domain/repositories/GlassModuleRepository";
import { DataStoreClient } from "../data/data-store/DataStoreClient";
import { getD2ApiFromArgs, getInstance } from "./common";
import { GlassAsyncDeletionsDefaultRepository } from "../data/repositories/GlassAsyncDeletionsDefaultRepository";

const UPLOADED_FILE_STATUS_LOWERCASE = "uploaded";
const IMPORT_SUMMARY_STATUS_ERROR = "ERROR";
const DEFAULT_MAX_ATTEMPS_FOR_ASYNC_DELETIONS = 3;

async function main() {
    const cmd = command({
        name: "Async deletions of uploaded files",
        description:
            "This script takes the ids of uploaded files that are in async-deletions in Datastore and deletes them",
        args: {},
        handler: async () => {
            try {
                if (!process.env.REACT_APP_DHIS2_BASE_URL)
                    throw new Error("REACT_APP_DHIS2_BASE_URL  must be set in the .env file");

                if (!process.env.REACT_APP_DHIS2_AUTH)
                    throw new Error("REACT_APP_DHIS2_AUTH  must be set in the .env file");

                const username = process.env.REACT_APP_DHIS2_AUTH.split(":")[0] ?? "";
                const password = process.env.REACT_APP_DHIS2_AUTH.split(":")[1] ?? "";

                if (username === "" || password === "") {
                    throw new Error("REACT_APP_DHIS2_AUTH must be in the format 'username:password'");
                }
                const envVars = {
                    url: process.env.REACT_APP_DHIS2_BASE_URL,
                    auth: {
                        username: username,
                        password: password,
                    },
                };

                const api = getD2ApiFromArgs(envVars);
                const instance = getInstance(envVars);
                const dataStoreClient = new DataStoreClient(instance);
                const glassAsyncDeletionsRepository = new GlassAsyncDeletionsDefaultRepository(dataStoreClient);

                const asyncDeletionsFromDatastore = await getAsyncDeletionsFromDatastore(
                    glassAsyncDeletionsRepository
                ).toPromise();

                console.log(asyncDeletionsFromDatastore);
                await removeAsyncDeletionByIdFromDatastore("ndNZ3KHJsMn", glassAsyncDeletionsRepository).toPromise();

                const newAsyncDeletionsFromDatastore = await getAsyncDeletionsFromDatastore(
                    glassAsyncDeletionsRepository
                ).toPromise();

                console.log(newAsyncDeletionsFromDatastore);
                //console.debug(`[${new Date().toISOString()}] Running asynchronous deletion for URL ${envVars.url}`);
            } catch (e) {
                console.error(
                    `[${new Date().toISOString()}] Async deletions have stopped with error: ${e}. Please, restart again.`
                );
                process.exit(1);
            }
        },
    });

    run(cmd, process.argv.slice(2));
}

type GlassUploadsWithModuleNameAndAttemps = GlassUploads & { moduleName: GlassModuleName; attempts: number };

function removeAsyncDeletionByIdFromDatastore(
    uploadIdToRemove: Id,
    glassAsyncDeletionsRepository: GlassAsyncDeletionsRepository
): FutureData<void> {
    return new RemoveAsyncDeletionByIdUseCase(glassAsyncDeletionsRepository).execute(uploadIdToRemove);
}

function getAsyncDeletionsFromDatastore(
    glassAsyncDeletionsRepository: GlassAsyncDeletionsRepository
): FutureData<GlassAsyncDeletion[]> {
    return new GetAsyncDeletionsUseCase(glassAsyncDeletionsRepository).execute();
}

function removeAsyncDeletionsFromDatastore(
    uploadIdsToRemove: Id[],
    glassAsyncDeletionsRepository: GlassAsyncDeletionsRepository
): FutureData<void> {
    return new RemoveAsyncDeletionsUseCase(glassAsyncDeletionsRepository).execute(uploadIdsToRemove);
}

function setAsyncDeletionsStatus(
    glassAsyncDeletionsRepository: GlassAsyncDeletionsRepository,
    uploadIds: Id[],
    status: GlassAsyncDeletionStatus
): FutureData<void> {
    return new SetAsyncDeletionsStatusUseCase(glassAsyncDeletionsRepository).execute(uploadIds, status);
}

function getGlassModulesFromDatastore(glassModuleRepository: GlassModuleRepository): FutureData<GlassModule[]> {
    return glassModuleRepository.getAll();
}

main();
