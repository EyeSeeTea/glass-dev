import { command, run } from "cmd-ts";
import path from "path";
import { getInstance } from "./common";
import dotenv from 'dotenv';
import { DataStoreClient } from "../data/data-store/DataStoreClient";
import { Instance } from "../data/entities/Instance";
import { GlassDataSubmissionsDefaultRepository } from "../data/repositories/GlassDataSubmissionDefaultRepository";
import { SetDataSubmissionStatusUseCase } from "../domain/usecases/SetDataSubmissionStatusUseCase";
dotenv.config();

console.log('Base URL:', process.env.REACT_APP_DHIS2_BASE_URL);
console.log('Auth:', process.env.REACT_APP_DHIS2_AUTH);
console.log('REACT_APP_DHIS2_BASE_URL:', process.env.REACT_APP_DHIS2_BASE_URL);


let instance: Instance;
let dataStoreClient: DataStoreClient;
let setSubmissionStatus: SetDataSubmissionStatusUseCase;
let glassDataSubmissionRepository: GlassDataSubmissionsDefaultRepository;
//let getSpecificDataSubmission: GetSpecificDataSubmissionUseCase;


// Initialize the global variables
function initializeGlobals(envVars: any) {
    instance = getInstance(envVars);
    dataStoreClient = new DataStoreClient(instance);
    glassDataSubmissionRepository = new GlassDataSubmissionsDefaultRepository(dataStoreClient);
    //getSpecificDataSubmission = new GetSpecificDataSubmissionUseCase(glassDataSubmissionRepository);
    setSubmissionStatus = new SetDataSubmissionStatusUseCase(glassDataSubmissionRepository);
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
                setSubmissionStatus.execute("VERWYGBBTxz", "COMPLETE").toPromise()

            } catch (error) {
                console.error(`Error thrown while trying to delete Document: ${error}`);
            }


        },

    });

    run(cmd, process.argv.slice(2));
}

main();

