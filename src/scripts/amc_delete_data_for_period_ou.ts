import dotenv from "dotenv";
import _ from "lodash";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import { getInstance, warmUpSession } from "./common";
import { getD2APiFromInstance } from "../utils/d2-api";

dotenv.config();

/*
================================================================
AMC: delete all Tracker data for a given org unit + period.

Use this to clean up partially-imported / orphaned AMC data so a
country+year can be re-uploaded cleanly.

It removes, for each (orgUnit, period):
  1. AMC Product Register tracked entities (deleting a TEI cascades to its
     enrollment + raw-product-consumption events + calculated stage events).
  2. Calculated substance consumption events (separate program).
  3. Raw substance consumption events (separate program; for substance uploads).

SAFETY: dry-run by default — it only reports what it *would* delete.
Pass --commit to actually delete.

Run (dry run):   npx ts-node -r dotenv/config src/scripts/amc_delete_data_for_period_ou.ts
Run (delete):    npx ts-node -r dotenv/config src/scripts/amc_delete_data_for_period_ou.ts --commit
(set DOTENV_CONFIG_PATH=.env.local the same way you run the bulk upload script)
================================================================
*/

// ---- CONFIG: edit the targets you want to clean up ----
const TARGETS: { orgUnitCode: string; periods: string[] }[] = [{ orgUnitCode: "ARM", periods: ["2014", "2014"] }];

const DRY_RUN = !process.argv.includes("--commit");

// AMC program ids (from ImportAMCProductLevelData / ImportAMCSubstanceLevelData)
const AMC_PRODUCT_REGISTER_PROGRAM_ID = "G6ChA5zMW9n";
const AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID = "q8aSKr17J5S";
const AMC_SUBSTANCE_CALCULATED_CONSUMPTION_PROGRAM_ID = "eUmWZeKZNrg";

const PAGE_SIZE = 250;
const DELETE_CHUNK = 100;

function getEnvVars() {
    if (!process.env.REACT_APP_DHIS2_BASE_URL) throw new Error("REACT_APP_DHIS2_BASE_URL must be set in the .env file");

    const token =
        process.env.REACT_APP_DHIS2_TOKEN_PROD ||
        process.env.REACT_APP_DHIS2_TOKEN_PREPROD ||
        process.env.REACT_APP_DHIS2_TOKEN;

    if (!token && !process.env.REACT_APP_DHIS2_AUTH)
        throw new Error("A DHIS2 token or REACT_APP_DHIS2_AUTH must be set in the .env file");

    if (token) return { url: process.env.REACT_APP_DHIS2_BASE_URL, token };

    const auth = process.env.REACT_APP_DHIS2_AUTH!;
    const [username, password] = auth.split(":");
    if (!username || !password) throw new Error("REACT_APP_DHIS2_AUTH must be 'username:password'");
    return { url: process.env.REACT_APP_DHIS2_BASE_URL, auth: { username, password } };
}

async function resolveOrgUnitsByCode(api: D2Api): Promise<{ [code: string]: string }> {
    const response = await api.models.organisationUnits
        .get({ fields: { id: true, code: true }, filter: { level: { eq: "3" } }, paging: false })
        .getData();

    const map: { [code: string]: string } = {};
    response.objects.forEach(ou => {
        if (ou.code) map[ou.code] = ou.id;
    });
    // Kosovo (special-cased in the bulk upload script)
    map["601624"] = "I8AMbKhxlj9";
    return map;
}

async function getProductTrackedEntityIds(api: D2Api, orgUnitId: string, period: string): Promise<string[]> {
    const ids: string[] = [];
    for (let page = 1; ; page++) {
        const response = await api.tracker.trackedEntities
            .get({
                program: AMC_PRODUCT_REGISTER_PROGRAM_ID,
                orgUnit: orgUnitId,
                ouMode: "SELECTED",
                enrollmentEnrolledAfter: `${period}-01-01`,
                enrollmentEnrolledBefore: `${period}-12-31`,
                fields: { trackedEntity: true, orgUnit: true },
                page,
                pageSize: PAGE_SIZE,
            })
            .getData();

        const instances = (response.instances ?? []) as { trackedEntity?: string }[];
        ids.push(..._.compact(instances.map(i => i.trackedEntity)));
        if (instances.length < PAGE_SIZE) break;
    }
    return ids;
}

async function getEventIds(api: D2Api, orgUnitId: string, period: string, programId: string): Promise<string[]> {
    const ids: string[] = [];
    for (let page = 1; ; page++) {
        const response = await api.tracker.events
            .get({
                program: programId,
                orgUnit: orgUnitId,
                ouMode: "SELECTED",
                occurredAfter: `${period}-01-01`,
                occurredBefore: `${period}-12-31`,
                fields: { event: true },
                page,
                pageSize: PAGE_SIZE,
            })
            .getData();

        const instances = (response.instances ?? []) as { event?: string }[];
        ids.push(..._.compact(instances.map(i => i.event)));
        if (instances.length < PAGE_SIZE) break;
    }
    return ids;
}

async function trackerDelete(api: D2Api, payload: unknown, label: string): Promise<number> {
    const postResponse = await api.tracker
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .postAsync({ importStrategy: "DELETE", skipRuleEngine: true }, payload as any)
        .getData();

    const result = await api.system.waitFor("TRACKER_IMPORT_JOB", postResponse.response.id).getData();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyResult = result as any;
    if (anyResult?.status === "ERROR") {
        console.error(`  ${label}: delete returned ERROR:`, JSON.stringify(anyResult?.validationReport?.errorReports));
    }
    return anyResult?.stats?.deleted ?? 0;
}

async function deleteTrackedEntities(api: D2Api, orgUnitId: string, teiIds: string[]): Promise<number> {
    let deleted = 0;
    for (const chunk of _.chunk(teiIds, DELETE_CHUNK)) {
        const payload = { trackedEntities: chunk.map(id => ({ trackedEntity: id, orgUnit: orgUnitId })) };
        deleted += await trackerDelete(api, payload, "trackedEntities");
    }
    return deleted;
}

async function deleteEvents(api: D2Api, eventIds: string[]): Promise<number> {
    let deleted = 0;
    for (const chunk of _.chunk(eventIds, DELETE_CHUNK)) {
        const payload = { events: chunk.map(id => ({ event: id })) };
        deleted += await trackerDelete(api, payload, "events");
    }
    return deleted;
}

async function main() {
    const api = getD2APiFromInstance(getInstance(getEnvVars()));
    await warmUpSession(api);

    console.log(
        DRY_RUN
            ? "=== DRY RUN — reporting only, nothing will be deleted. Re-run with --commit to delete. ==="
            : "=== COMMIT MODE — data WILL be permanently deleted. ==="
    );

    const orgUnitsByCode = await resolveOrgUnitsByCode(api);

    for (const target of TARGETS) {
        const orgUnitId = orgUnitsByCode[target.orgUnitCode];
        if (!orgUnitId) {
            console.error(`Unknown org unit code "${target.orgUnitCode}" — skipping.`);
            continue;
        }

        for (const period of target.periods) {
            console.log(`\n--- ${target.orgUnitCode} (${orgUnitId}) — period ${period} ---`);

            const productTeiIds = await getProductTrackedEntityIds(api, orgUnitId, period);
            const calculatedSubstanceEventIds = await getEventIds(
                api,
                orgUnitId,
                period,
                AMC_SUBSTANCE_CALCULATED_CONSUMPTION_PROGRAM_ID
            );
            const rawSubstanceEventIds = await getEventIds(
                api,
                orgUnitId,
                period,
                AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID
            );

            console.log(`  Product register tracked entities: ${productTeiIds.length}`);
            console.log(`  Calculated substance consumption events: ${calculatedSubstanceEventIds.length}`);
            console.log(`  Raw substance consumption events: ${rawSubstanceEventIds.length}`);

            if (!DRY_RUN) {
                if (productTeiIds.length)
                    console.log(
                        `  Deleted tracked entities: ${await deleteTrackedEntities(api, orgUnitId, productTeiIds)}`
                    );
                if (calculatedSubstanceEventIds.length)
                    console.log(
                        `  Deleted calculated substance events: ${await deleteEvents(api, calculatedSubstanceEventIds)}`
                    );
                if (rawSubstanceEventIds.length)
                    console.log(`  Deleted raw substance events: ${await deleteEvents(api, rawSubstanceEventIds)}`);
            }
        }
    }

    console.log(`\nDone.${DRY_RUN ? " (dry run — nothing was deleted)" : ""}`);
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
