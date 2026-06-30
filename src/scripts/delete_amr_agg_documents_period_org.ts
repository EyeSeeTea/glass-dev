import { command, run, string, option } from "cmd-ts";
import path from "path";
import { getInstance, warmUpSession } from "./common";
import dotenv from "dotenv";
import { GlassDataSubmissionsDefaultRepository } from "../data/repositories/GlassDataSubmissionDefaultRepository";
import { DataStoreClient } from "../data/data-store/DataStoreClient";
import { GetSpecificDataSubmissionUseCase } from "../domain/usecases/GetSpecificDataSubmissionUseCase";
import { MetadataDefaultRepository } from "../data/repositories/MetadataDefaultRepository";
import { GlassDocumentsDefaultRepository } from "../data/repositories/GlassDocumentsDefaultRepository";
import { Instance } from "../data/entities/Instance";
import { CodedRef } from "../domain/entities/Ref";
import { SetDataSubmissionStatusUseCase } from "../domain/usecases/SetDataSubmissionStatusUseCase";
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
let metadataRepository: MetadataDefaultRepository;
let glassDocumentsRepository: GlassDocumentsDefaultRepository;
let glassUploadsRepository: GlassUploadsProgramRepository;
let setSubmissionStatus: SetDataSubmissionStatusUseCase;
const moduleName = "AMR";
const moduleId = "AVnpk4xiXGG";
let orgUnits: CodedRef[] = [];
let getSpecificDataSubmission: GetSpecificDataSubmissionUseCase;
let glassDataSubmissionRepository: GlassDataSubmissionsDefaultRepository;
let deleteDocumentInfoByUploadIdUseCase: DeleteDocumentInfoByUploadIdUseCase;

// Initialize the global variables
async function initializeGlobals(envVars: any) {
    instance = getInstance(envVars);
    dataStoreClient = new DataStoreClient(instance);
    metadataRepository = new MetadataDefaultRepository(instance);
    const api = getD2APiFromInstance(instance);
    await warmUpSession(api);
    const runtime: "node" | "browser" = typeof window === "undefined" ? "node" : "browser";
    const uploadsFormDataBuilder = getUploadsFormDataBuilder(runtime);
    glassUploadsRepository = new GlassUploadsProgramRepository(api, uploadsFormDataBuilder);
    glassDocumentsRepository = new GlassDocumentsDefaultRepository(dataStoreClient, instance);
    glassDataSubmissionRepository = new GlassDataSubmissionsDefaultRepository(dataStoreClient);
    getSpecificDataSubmission = new GetSpecificDataSubmissionUseCase(glassDataSubmissionRepository);
    setSubmissionStatus = new SetDataSubmissionStatusUseCase(glassDataSubmissionRepository);
    deleteDocumentInfoByUploadIdUseCase = new DeleteDocumentInfoByUploadIdUseCase(
        glassDocumentsRepository,
        glassUploadsRepository
    );
}

async function getOrgUnitIdFromCode(orgUnitCode: string) {
    if (orgUnits.length === 0) {
        orgUnits = await metadataRepository
            .getOrgUnitsByCode([orgUnitCode])
            .toPromise()
            .catch(error => {
                console.error(`Error thrown when fetching all orgUnits, error : ${error}`);
                throw error;
            });
    }
    //console.log("getOrgUnitIdFromCode orgUnitId: ", orgUnitId);
    return orgUnits.find(ou => ou.code === orgUnitCode)?.id || "";
}

function main() {
    const cmd = command({
        name: path.basename(__filename),
        description: "Show DHIS2 instance info",
        args: {
            period: option({
                type: string,
                long: "period",
                description: "The period to run amr-agg data reset for",
            }),
            orgUnitCode: option({
                type: string,
                long: "orgUnitCode",
                description: "The org unit code to run amr-agg data reset for",
            }),
            /*batchId: option({
                type: string,
                long: "batchId",
                description: "The batchId/dataset to run amr-agg data reset for",
            })
             docId: option({
               type: string,
               long: "docId",
               description: "The docId of the document to delete",
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
            if (!args.period) throw new Error("Period is required");
            const period = args.period;

            //2. Get OrgUnit for which to reset.
            if (!args.orgUnitCode) throw new Error("OrgUnit is required");
            const orgUnitCode = args.orgUnitCode;

            //3. Get Batch Id to reset
            /*if (!args.batchId) throw new Error("batchId is required");
            const batchId = args.batchId;*/

            //4. Set AMR-AGG dataset id.
            //const dataSetId = "CeQPmXgrhHF";

            try {
                const orgUnitId = await getOrgUnitIdFromCode(orgUnitCode);

                const dataSubmissionId = await getSpecificDataSubmission
                    .execute(moduleId, moduleName, orgUnitId, period, false)
                    .toPromise()
                    .catch(error => {
                        console.error(`Error fetching data submission: ${error}`);
                        throw error;
                    });

                if (!dataSubmissionId) {
                    console.error(
                        "Data submission id not found for OrgUnit: " + orgUnitCode + " and period: " + period
                    );
                    throw new Error(
                        "Data submission ID not found for OrgUnit: " + orgUnitCode + " and period: " + period
                    );
                }

                console.log(dataSubmissionId);
                const uploads = await glassUploadsRepository
                    .getUploadsByDataSubmission(dataSubmissionId.id)
                    .toPromise();
                console.log(`uploads.length: ${uploads.length}`);
                for (const upload of uploads) {
                    await glassUploadsRepository.delete(upload.id).toPromise();
                    deleteDocumentInfoByUploadIdUseCase.execute(upload.id);
                }

                setSubmissionStatus.execute(dataSubmissionId.id, "NOT_COMPLETED").toPromise();
            } catch (error) {
                console.error(`Error thrown while trying to delete Document: ${error}`);
            }
        },
    });

    run(cmd, process.argv.slice(2));
}

main();
