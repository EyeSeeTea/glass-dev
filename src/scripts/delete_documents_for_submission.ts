import { command, run } from "cmd-ts";
import path from "path";
import { getInstance, warmUpSession } from "./common";
import dotenv from "dotenv";
import { DataStoreClient } from "../data/data-store/DataStoreClient";
import { GlassDocumentsDefaultRepository } from "../data/repositories/GlassDocumentsDefaultRepository";
import { Instance } from "../data/entities/Instance";
import { DeleteDocumentInfoByUploadIdUseCase } from "../domain/usecases/DeleteDocumentInfoByUploadIdUseCase";
import { GlassUploadsProgramRepository } from "../data/repositories/GlassUploadsProgramRepository";
import { getUploadsFormDataBuilder } from "../utils/getUploadsFormDataBuilder";
import { getD2APiFromInstance } from "../utils/d2-api";
dotenv.config();

console.log("Base URL:", process.env.REACT_APP_DHIS2_BASE_URL);
console.log("Auth:", process.env.REACT_APP_DHIS2_AUTH);
console.log("REACT_APP_DHIS2_BASE_URL:", process.env.REACT_APP_DHIS2_BASE_URL);

let instance: Instance;
let dataStoreClient: DataStoreClient;
let glassDocumentsRepository: GlassDocumentsDefaultRepository;
let glassUploadsRepository: GlassUploadsProgramRepository;
let deleteDocumentInfoByUploadIdUseCase: DeleteDocumentInfoByUploadIdUseCase;

// Initialize the global variables
async function initializeGlobals(envVars: any) {
    instance = getInstance(envVars);
    dataStoreClient = new DataStoreClient(instance);
    glassDocumentsRepository = new GlassDocumentsDefaultRepository(dataStoreClient, instance);
    const api = getD2APiFromInstance(instance);
    await warmUpSession(api);
    const runtime: "node" | "browser" = typeof window === "undefined" ? "node" : "browser";
    const uploadsFormDataBuilder = getUploadsFormDataBuilder(runtime);
    glassUploadsRepository = new GlassUploadsProgramRepository(api, uploadsFormDataBuilder);
    deleteDocumentInfoByUploadIdUseCase = new DeleteDocumentInfoByUploadIdUseCase(
        glassDocumentsRepository,
        glassUploadsRepository
    );
}

function main() {
    const cmd = command({
        name: path.basename(__filename),
        description: "Show DHIS2 instance info",
        args: {
            /* docId: option({
                type: string,
                long: "docId",
                description: "The docId of the document to delete",
            }),
          period: option({
                type: string,
                long: "period",
                description: "The period to run amr-agg data reset for",
            }),
            batchId: option({
                type: string,
                long: "batchId",
                description: "The batchId/dataset to run amr-agg data reset for",
            }),*/
        },
        handler: async args => {
            if (!process.env.REACT_APP_DHIS2_BASE_URL)
                throw new Error("REACT_APP_DHIS2_BASE_URL  must be set in the .env file");

            const token = process.env.REACT_APP_DHIS2_TOKEN_PROD || process.env.REACT_APP_DHIS2_TOKEN;

            if (!token && !process.env.REACT_APP_DHIS2_AUTH)
                throw new Error(
                    "Either REACT_APP_DHIS2_TOKEN_PROD, REACT_APP_DHIS2_TOKEN, or REACT_APP_DHIS2_AUTH must be set in the .env file"
                );

            const envVars = token
                ? { url: process.env.REACT_APP_DHIS2_BASE_URL, token }
                : (() => {
                      const auth = process.env.REACT_APP_DHIS2_AUTH!;
                      const username = auth.split(":")[0] ?? "";
                      const password = auth.split(":")[1] ?? "";
                      if (!username || !password)
                          throw new Error("REACT_APP_DHIS2_AUTH must be in the format 'username:password'");
                      return { url: process.env.REACT_APP_DHIS2_BASE_URL, auth: { username, password } };
                  })();

            //const api = getD2ApiFromArgs(envVars);
            // Call this function once to initialize the variables
            await initializeGlobals(envVars);

            //1. Get Period for which to reset.
            /* if (!args.docId) throw new Error("docId is required");
            const docId = args.docId;
 
             //2. Get OrgUnit for which to reset.
             if (!args.orgUnitId) throw new Error("OrgUnit is required");
             const orgUnitId = args.orgUnitId;
 
             //3. Get Batch Id to reset
             if (!args.orgUnitId) throw new Error("OrgUnit is required");
             const batchId = args.batchId;*/

            //4. Set AMR-AGG dataset id.
            // const dataSetId = "CeQPmXgrhHF";

            //1: Get the directory

            try {
                const uploads = await glassUploadsRepository.getUploadsByDataSubmission("M1NYa4SHi4w").toPromise();
                for (const upload of uploads) {
                    deleteDocumentInfoByUploadIdUseCase.execute(upload.id);
                }
            } catch (error) {
                console.error(`Error thrown while trying to delete Document: ${error}`);
            }
        },
    });

    run(cmd, process.argv.slice(2));
}

main();
