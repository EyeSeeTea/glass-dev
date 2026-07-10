import { command, run, string, option } from "cmd-ts";
import path from "path";
import fs from "fs";
import { getInstance, warmUpSession } from "./common";
import dotenv from "dotenv";
import { GlassDataSubmissionsDefaultRepository } from "../data/repositories/GlassDataSubmissionDefaultRepository";
import { DataStoreClient } from "../data/data-store/DataStoreClient";
import { GetSpecificDataSubmissionUseCase } from "../domain/usecases/GetSpecificDataSubmissionUseCase";
import { GlassDocumentsDefaultRepository } from "../data/repositories/GlassDocumentsDefaultRepository";
import { Instance } from "../data/entities/Instance";
import { SetDataSubmissionStatusUseCase } from "../domain/usecases/SetDataSubmissionStatusUseCase";
import { DeleteDocumentInfoByUploadIdUseCase } from "../domain/usecases/DeleteDocumentInfoByUploadIdUseCase";
import { GlassUploadsProgramRepository } from "../data/repositories/GlassUploadsProgramRepository";
import { getD2APiFromInstance } from "../utils/d2-api";
import { getUploadsFormDataBuilder } from "../utils/getUploadsFormDataBuilder";

dotenv.config();

console.log("Base URL:", process.env.REACT_APP_DHIS2_BASE_URL);
console.log("Auth:", process.env.REACT_APP_DHIS2_AUTH);
console.log("REACT_APP_DHIS2_BASE_URL:", process.env.REACT_APP_DHIS2_BASE_URL);

let instance: Instance;
let dataStoreClient: DataStoreClient;
let glassDocumentsRepository: GlassDocumentsDefaultRepository;
let glassUploadsRepository: GlassUploadsProgramRepository;

//let orgUnits: CodedRef[] = [];
let getSpecificDataSubmission: GetSpecificDataSubmissionUseCase;
let glassDataSubmissionRepository: GlassDataSubmissionsDefaultRepository;
let setSubmissionStatus: SetDataSubmissionStatusUseCase;
let deleteDocumentInfoByUploadIdUseCase: DeleteDocumentInfoByUploadIdUseCase;

const moduleName = "AMR";
const moduleId = "AVnpk4xiXGG";

// Initialize the global variables
function initializeGlobals(envVars: any) {
    instance = getInstance(envVars);
    dataStoreClient = new DataStoreClient(instance);
    const api = getD2APiFromInstance(instance);
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

/*async function getOrgUnitIdFromCode(orgUnitCode: string) {
    if (orgUnits.length === 0) {
        orgUnits = await metadataRepository.getOrgUnitsByCode([orgUnitCode])
            .toPromise().catch(error => {
                console.error(`Error thrown when fetching all orgUnits, error : ${error}`);
                throw error;
            });
    }
    //console.log("getOrgUnitIdFromCode orgUnitId: ", orgUnitId);
    return orgUnits.find(ou => ou.code === orgUnitCode)?.id || "";
}*/

const cmd = command({
    name: path.basename(__filename),
    description: "Delete Documents for a full period",
    args: {
        period: option({
            type: string,
            long: "period",
            description: "The period ",
        }),
        //moduleId: option({
        //    type: string,
        //     long: "moduleId",
        //    description: "The moduleId",
        // })
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

        const instance = getInstance(envVars);
        const api = getD2APiFromInstance(instance);
        await warmUpSession(api);

        initializeGlobals(envVars);

        //1. Get Period for which to reset.
        if (!args.period) throw new Error("Period is required");
        const period = args.period;

        //2. Get OrgUnit for which to reset.
        // if (!args.moduleId) throw new Error("moduleId is required");
        //const moduleId = args.moduleId;

        //4. Set AMR-AGG dataset id.
        // const dataSetId = "CeQPmXgrhHF";

        try {
            const orgUnits = await api.models.organisationUnits
                .get({
                    fields: { id: true, name: true, code: true },
                    filter: { level: { eq: "3" } },
                    paging: false,
                })
                .getData()
                .catch(error => {
                    console.error(`Error thrown when fetching countries : ${error}`);
                    throw error; // Re-throwing here to be caught by the main try/catch
                });

            // Add Kosovo to the list of countries
            orgUnits.objects.push({
                id: "I8AMbKhxlj9",
                name: "Kosovo",
                code: "601624",
            });

            for (const orgUnit of orgUnits.objects) {
                try {
                    const orgUnitId = orgUnit.id;

                    // Fetch data submission ID
                    const dataSubmissionId = await getSpecificDataSubmission
                        .execute(moduleId, moduleName, orgUnitId, period, false)
                        .toPromise();

                    if (!dataSubmissionId) {
                        console.error(
                            "Data submission id not found for OrgUnit: " + orgUnit.code + " and period: " + period
                        );
                        throw new Error(
                            "Data submission ID not found for OrgUnit: " + orgUnit.code + " and period: " + period
                        );
                    }

                    // Fetch uploads associated with the data submission
                    const uploads = await glassUploadsRepository
                        .getUploadsByDataSubmission(dataSubmissionId.id)
                        .toPromise();

                    console.info(
                        `dataSubmissionId.id: ${dataSubmissionId.id} for module ${dataSubmissionId.module} for orgUnit: ${dataSubmissionId.orgUnit} for period ${dataSubmissionId.period}`
                    );
                    console.info("uploads: ", uploads);
                    console.info("orgUnit code: ", orgUnit.code);

                    // Delete uploads and associated documents
                    for (const upload of uploads) {
                        try {
                            await glassUploadsRepository.delete(upload.id).toPromise();
                            const id = await glassDocumentsRepository.delete(upload.fileId).toPromise();
                            await glassDocumentsRepository.deleteDocumentApi(id).toPromise();
                        } catch (deleteError) {
                            console.error(
                                `Error deleting upload or document for OrgUnit: ${orgUnitId}, Error: ${deleteError}`
                            );
                            throw deleteError;
                        }
                    }

                    await setSubmissionStatus.execute(dataSubmissionId.id, "NOT_COMPLETED").toPromise();
                } catch (innerError) {
                    console.error(`Error processing OrgUnit: ${orgUnit.name}, Error: ${innerError}`);
                    throw innerError;
                }
            }
        } catch (error) {
            console.error(`Error thrown while trying to delete Document: ${error}`);
        }
    },
});

run(cmd, process.argv.slice(2));
