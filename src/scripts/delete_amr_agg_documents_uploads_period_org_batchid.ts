import { boolean, command, flag, run, string, option, optional } from "cmd-ts";
import path from "path";
import { getInstance, warmUpSession } from "./common";
import dotenv from "dotenv";
import { GlassDataSubmissionsDefaultRepository } from "../data/repositories/GlassDataSubmissionDefaultRepository";
import { DataStoreClient } from "../data/data-store/DataStoreClient";
import { MetadataDefaultRepository } from "../data/repositories/MetadataDefaultRepository";
import { GlassDocumentsDefaultRepository } from "../data/repositories/GlassDocumentsDefaultRepository";

import { Instance } from "../data/entities/Instance";
import { DeleteDocumentInfoByUploadIdUseCase } from "../domain/usecases/DeleteDocumentInfoByUploadIdUseCase";
import { GlassUploadsProgramRepository } from "../data/repositories/GlassUploadsProgramRepository";
import { getD2APiFromInstance } from "../utils/d2-api";
import { getUploadsFormDataBuilder } from "../utils/getUploadsFormDataBuilder";
dotenv.config();

console.log("Base URL:", process.env.REACT_APP_DHIS2_BASE_URL);

let instance: Instance;
let dataStoreClient: DataStoreClient;
let metadataRepository: MetadataDefaultRepository;
let glassDocumentsRepository: GlassDocumentsDefaultRepository;
let glassUploadsRepository: GlassUploadsProgramRepository;

let glassDataSubmissionRepository: GlassDataSubmissionsDefaultRepository;
let deleteDocumentInfoByUploadIdUseCase: DeleteDocumentInfoByUploadIdUseCase;

// Initialize the global variables
async function initializeGlobals(envVars: any) {
    instance = getInstance(envVars);
    const api = getD2APiFromInstance(instance);
    await warmUpSession(api);
    const runtime: "node" | "browser" = typeof window === "undefined" ? "node" : "browser";
    const uploadsFormDataBuilder = getUploadsFormDataBuilder(runtime);
    glassUploadsRepository = new GlassUploadsProgramRepository(api, uploadsFormDataBuilder);
    dataStoreClient = new DataStoreClient(instance);
    metadataRepository = new MetadataDefaultRepository(instance);
    glassDocumentsRepository = new GlassDocumentsDefaultRepository(dataStoreClient, instance);
    glassDataSubmissionRepository = new GlassDataSubmissionsDefaultRepository(dataStoreClient);
    deleteDocumentInfoByUploadIdUseCase = new DeleteDocumentInfoByUploadIdUseCase(
        glassDocumentsRepository,
        glassUploadsRepository
    );
}

async function getOrgUnitIdFromCode(orgUnitCode: string): Promise<string> {
    const orgUnits = await metadataRepository
        .getOrgUnitsByCode([orgUnitCode])
        .toPromise()
        .catch(error => {
            console.error(`Error thrown when fetching orgUnit with code ${orgUnitCode}, error : ${error}`);
            throw error;
        });

    const orgUnitId = orgUnits.find(ou => ou.code === orgUnitCode)?.id;
    if (!orgUnitId) throw new Error(`Org unit not found for code: ${orgUnitCode}`);

    return orgUnitId;
}

/**
 * Read-only lookup of the data submission.
 *
 * NOTE: deliberately does NOT use GetSpecificDataSubmissionUseCase, which creates and saves a new
 * NOT_COMPLETED data submission when none matches. A delete script must never write.
 */
async function getDataSubmissionId(moduleId: string, orgUnitId: string, period: string): Promise<string> {
    const dataSubmissions = await glassDataSubmissionRepository
        .getSpecificDataSubmission(moduleId, orgUnitId, period)
        .toPromise()
        .catch(error => {
            console.error(`Error fetching data submission: ${error}`);
            throw error;
        });

    const dataSubmission = dataSubmissions[0];
    if (dataSubmissions.length === 0 || !dataSubmission) {
        throw new Error(
            `Data submission not found for module: ${moduleId}, orgUnit: ${orgUnitId} and period: ${period}`
        );
    }
    if (dataSubmissions.length > 1) {
        throw new Error(
            `Expected a single data submission for module: ${moduleId}, orgUnit: ${orgUnitId} and period: ${period}, found ${dataSubmissions.length}. Refusing to delete.`
        );
    }

    return dataSubmission.id;
}

function main() {
    const cmd = command({
        name: path.basename(__filename),
        description:
            "Delete GLASS uploads and their associated documents/files for a given module, org unit and period, optionally restricted to a single batch id. Destructive and irreversible: run with --dry-run first.",
        args: {
            period: option({
                type: string,
                long: "period",
                description: "The period",
            }),
            orgUnitCode: option({
                type: string,
                long: "orgUnitCode",
                description: "The org unit code ",
            }),
            batchId: option({
                type: optional(string),
                long: "batchId",
                description:
                    "Only delete uploads with this batchId. If omitted, ALL uploads of the data submission are deleted.",
            }),
            moduleId: option({
                type: string,
                long: "moduleId",
                description: "The moduleId ",
            }),
            moduleName: option({
                type: optional(string),
                long: "moduleName",
                description: "The moduleName (used for logging only)",
            }),
            dryRun: flag({
                type: boolean,
                long: "dry-run",
                description: "List the uploads that would be deleted without deleting anything",
            }),
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

            // Call this function once to initialize the variables
            await initializeGlobals(envVars);

            //1. Get Period for which to delete.
            if (!args.period) throw new Error("Period is required");
            const period = args.period;

            //2. Get OrgUnit for which to delete.
            if (!args.orgUnitCode) throw new Error("OrgUnit is required");
            const orgUnitCode = args.orgUnitCode;

            //3. Get optional Batch Id to restrict the deletion to.
            const batchId = args.batchId;

            if (!args.moduleId) throw new Error("moduleId is required");
            const moduleId = args.moduleId;

            try {
                const orgUnitId = await getOrgUnitIdFromCode(orgUnitCode);
                const dataSubmissionId = await getDataSubmissionId(moduleId, orgUnitId, period);

                console.log(
                    `Data submission ${dataSubmissionId} (module: ${
                        args.moduleName ?? moduleId
                    }, orgUnit: ${orgUnitCode}, period: ${period})`
                );

                const uploads = await glassUploadsRepository.getUploadsByDataSubmission(dataSubmissionId).toPromise();

                // Defensive check: a data submission is unique per (module, orgUnit, period), so every upload
                // under it should already belong to `moduleId`. Assert it anyway so a corrupt or mislinked
                // upload can never be deleted under a different module than the one requested.
                const foreignUploads = uploads.filter(upload => upload.module !== moduleId);
                if (foreignUploads.length > 0) {
                    throw new Error(
                        `Found ${
                            foreignUploads.length
                        } upload(s) under data submission ${dataSubmissionId} belonging to a different module than ${moduleId}: ${foreignUploads
                            .map(upload => `${upload.id} (module ${upload.module})`)
                            .join(", ")}. Refusing to delete.`
                    );
                }

                const targets = batchId ? uploads.filter(upload => upload.batchId === batchId) : uploads;
                console.log(
                    `Matched ${targets.length} of ${uploads.length} upload(s)${
                        batchId ? ` for batchId ${batchId}` : ""
                    }`
                );

                if (targets.length === 0) return;

                if (args.dryRun) {
                    targets.forEach(upload =>
                        console.log(
                            `[dry-run] would delete upload ${upload.id} (file: ${upload.fileName}, batchId: ${upload.batchId}, status: ${upload.status})`
                        )
                    );
                    console.log(`[dry-run] no changes made. Re-run without --dry-run to delete.`);
                    return;
                }

                // Deletions are run sequentially on purpose: GlassDocumentsDefaultRepository.delete does a
                // read-modify-write of the whole documents datastore collection, so parallel deletes would
                // overwrite each other.
                const failed: string[] = [];
                for (const upload of targets) {
                    try {
                        await deleteDocumentInfoByUploadIdUseCase.execute(upload.id).toPromise();
                        console.log(`Deleted upload ${upload.id} (file: ${upload.fileName})`);
                    } catch (error) {
                        failed.push(upload.id);
                        console.error(`Error deleting upload ${upload.id}: ${error}`);
                    }
                }

                console.log(`Deleted ${targets.length - failed.length} of ${targets.length} upload(s)`);
                if (failed.length > 0) {
                    console.error(`${failed.length} deletion(s) failed: ${failed.join(", ")}`);
                    process.exitCode = 1;
                }

                // NOTE: the data submission status is intentionally left untouched. Reset it separately with
                // update_submission_status.ts if the submission should go back to NOT_COMPLETED.
            } catch (error) {
                console.error(`Error thrown while trying to delete Document: ${error}`);
                process.exitCode = 1;
            }
        },
    });

    run(cmd, process.argv.slice(2));
}

main();
