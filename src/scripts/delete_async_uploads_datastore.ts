import { command, run } from "cmd-ts";
import "dotenv/config";
import { FutureData } from "../domain/entities/Future";
import { GlassModuleName } from "../domain/entities/GlassModule";
import { GlassUploads } from "../domain/entities/GlassUploads";
import { Id } from "../domain/entities/Ref";
import { DataStoreClient } from "../data/data-store/DataStoreClient";
import { getD2ApiFromArgs, getInstance } from "./common";
import { GlassAsyncUploadsDefaultRepository } from "../data/repositories/GlassAsyncUploadsDefaultRepository";
import { GetAsyncUploadsUseCase } from "../domain/usecases/GetAsyncUploadsUseCase";
import { GlassAsyncUpload } from "../domain/entities/GlassAsyncUploads";
import { RemoveAsyncUploadByIdUseCase } from "../domain/usecases/RemoveAsyncUploadByIdUseCase";
import { GlassAsyncUploadsRepository } from "../domain/repositories/GlassAsyncUploadsRepository";

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
                const glassAsyncUploadsRepository = new GlassAsyncUploadsDefaultRepository(dataStoreClient);

                const asyncUploadsFromDatastore = await getAsyncUploadsFromDatastore(
                    glassAsyncUploadsRepository
                ).toPromise();

                console.log(asyncUploadsFromDatastore);
                await removeAsyncUploadByIdFromDatastore(glassAsyncUploadsRepository, "cIlmCVqcS16").toPromise();

                const newAsyncUploadsFromDatastore = await getAsyncUploadsFromDatastore(
                    glassAsyncUploadsRepository
                ).toPromise();

                console.log(newAsyncUploadsFromDatastore);
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

function removeAsyncUploadByIdFromDatastore(
    glassAsyncUploadsRepository: GlassAsyncUploadsRepository,
    uploadIdToRemove: Id
): FutureData<void> {
    console.debug(`[${new Date().toISOString()}] Removing upload ${uploadIdToRemove} from async-uploads in Datastore`);
    return new RemoveAsyncUploadByIdUseCase({ glassAsyncUploadsRepository }).execute(uploadIdToRemove);
}

function getAsyncUploadsFromDatastore(
    glassAsyncUploadsRepository: GlassAsyncUploadsRepository
): FutureData<GlassAsyncUpload[]> {
    return new GetAsyncUploadsUseCase(glassAsyncUploadsRepository).execute();
}

main();
