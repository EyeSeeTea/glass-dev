import { command, option, run, string } from "cmd-ts";
import path from "path";
import { getInstance } from "./common";
import dotenv from 'dotenv';
import { DataStoreClient } from "../data/data-store/DataStoreClient";
import { GlassDocumentsDefaultRepository } from "../data/repositories/GlassDocumentsDefaultRepository";
import { GlassUploadsDefaultRepository } from "../data/repositories/GlassUploadsDefaultRepository";
import { Instance } from "../data/entities/Instance";
import { DeleteDocumentInfoByUploadIdUseCase } from "../domain/usecases/DeleteDocumentInfoByUploadIdUseCase";
dotenv.config();

console.log('Base URL:', process.env.REACT_APP_DHIS2_BASE_URL);
console.log('Auth:', process.env.REACT_APP_DHIS2_AUTH);
console.log('REACT_APP_DHIS2_BASE_URL:', process.env.REACT_APP_DHIS2_BASE_URL);


let instance: Instance;
let dataStoreClient: DataStoreClient;
let glassDocumentsRepository: GlassDocumentsDefaultRepository;
let glassUploadsRepository: GlassUploadsDefaultRepository;
let deleteDocumentInfoByUploadIdUseCase: DeleteDocumentInfoByUploadIdUseCase;


// Initialize the global variables
function initializeGlobals(envVars: any) {
    instance = getInstance(envVars);
    dataStoreClient = new DataStoreClient(instance);
    glassDocumentsRepository = new GlassDocumentsDefaultRepository(dataStoreClient, instance);
    glassUploadsRepository = new GlassUploadsDefaultRepository(dataStoreClient);
    deleteDocumentInfoByUploadIdUseCase = new DeleteDocumentInfoByUploadIdUseCase(glassDocumentsRepository, glassUploadsRepository);
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
           }),*/
            uploadId: option({
               type: string,
                long: "uploadId",
                description: "The uploadId",
           }),
           // fileId: option({
           //    type: string,
           //     long: "fileId",
           //    description: "The fileId",
           //}),
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
            if (!args.uploadId) throw new Error("uploadId is required");
            const uploadId = args.uploadId;
  
              //2. Get OrgUnit for which to reset.
            //if (!args.fileId) throw new Error("fileId is required");
           // const fileId = args.fileId;
  /*
              //3. Get Batch Id to reset
              if (!args.orgUnitId) throw new Error("OrgUnit is required");
              const batchId = args.batchId;*/

            //4. Set AMR-AGG dataset id.
            // const dataSetId = "CeQPmXgrhHF";

            //1: Get the directory



            try {

               // await glassUploadsRepository.delete(uploadId).toPromise();
                console.log("deleted the upload with uploadId: " + uploadId);
                deleteDocumentInfoByUploadIdUseCase.execute(uploadId);
                //console.log("deleted the file with fileId: " + fileId);//hdxL9WRw1sG


            } catch (error) {
                console.error(`Error thrown while trying to delete Document: ${error}`);
            }


        },

    });

    run(cmd, process.argv.slice(2));
}

main();

