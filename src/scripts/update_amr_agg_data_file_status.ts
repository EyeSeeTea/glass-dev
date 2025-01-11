import { command, run, string, option } from "cmd-ts";
import path from "path";
import { getInstance } from "./common";
import dotenv from 'dotenv';
import { DataStoreClient } from "../data/data-store/DataStoreClient";
import { GlassUploadsDefaultRepository } from "../data/repositories/GlassUploadsDefaultRepository";
import { Instance } from "../data/entities/Instance";
import { SetUploadStatusUseCase } from "../domain/usecases/SetUploadStatusUseCase";
import { UpdateSampleUploadWithRisIdUseCase } from "../domain/usecases/UpdateSampleUploadWithRisIdUseCase";
dotenv.config();

console.log('Base URL:', process.env.REACT_APP_DHIS2_BASE_URL);
console.log('Auth:', process.env.REACT_APP_DHIS2_AUTH);
console.log('REACT_APP_DHIS2_BASE_URL:', process.env.REACT_APP_DHIS2_BASE_URL);


let instance: Instance;
let dataStoreClient: DataStoreClient;
let glassUploadsRepository: GlassUploadsDefaultRepository;
let setUploadStatusUseCase: SetUploadStatusUseCase;
let updateSecondaryFileWithPrimaryId: UpdateSampleUploadWithRisIdUseCase;

// Initialize the global variables
function initializeGlobals(envVars: any) {
    instance = getInstance(envVars);
    dataStoreClient = new DataStoreClient(instance);
    glassUploadsRepository = new GlassUploadsDefaultRepository(dataStoreClient);
    setUploadStatusUseCase = new SetUploadStatusUseCase(glassUploadsRepository);
    updateSecondaryFileWithPrimaryId = new UpdateSampleUploadWithRisIdUseCase(glassUploadsRepository);
}


function main() {
    const cmd = command({
        name: path.basename(__filename),
        description: "Show DHIS2 instance info",
        args: {
            primaryFileUploadId: option({
                type: string,
                long: "primaryFileUploadId",
                description: "The primaryFileUploadId",
            }),
            secondaryFileUploadId: option({
                type: string,
                long: "secondaryFileUploadId",
                description: "The secondaryFileUploadId",
                defaultValue: () => "",
            }),

        },
        handler: async ({ primaryFileUploadId, secondaryFileUploadId }) => {
            if (!process.env.REACT_APP_DHIS2_BASE_URL)
                throw new Error("REACT_APP_DHIS2_BASE_URL  must be set in the .env file");

            if (!process.env.REACT_APP_DHIS2_AUTH)
                throw new Error("REACT_APP_DHIS2_BASE_URL  must be set in the .env file");

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

            //const api = getD2ApiFromArgs(envVars);
            // Call this function once to initialize the variables
            initializeGlobals(envVars);

            try {
                if (primaryFileUploadId) {
                    await setUploadStatusUseCase.execute({ id: primaryFileUploadId, status: "COMPLETED" }).toPromise();
                }

                if (secondaryFileUploadId && primaryFileUploadId) {
                    await setUploadStatusUseCase.execute({ id: secondaryFileUploadId, status: "COMPLETED" }).toPromise();
                    await updateSecondaryFileWithPrimaryId.execute(secondaryFileUploadId, primaryFileUploadId).toPromise();
                }
                //setSubmissionStatus.execute(dataSubmissionId.id, "NOT_COMPLETED").toPromise()

            } catch (error) {
                console.error(`Error thrown while trying to delete Document: ${error}`);
            }
        },

    });

    run(cmd, process.argv.slice(2));
}

main();

