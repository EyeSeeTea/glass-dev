import _ from "lodash";
import moment, { Moment } from "moment";
import { DataFormType } from "../entities/DataForm";
import { Id } from "@eyeseetea/d2-api";
import { RelationshipOrgUnitFilter } from "../../data/repositories/download-template/DownloadTemplateDefaultRepository";
import { DataPackage } from "../entities/data-entry/DataPackage";
import { GeneratedTemplate } from "../entities/Template";
import { ExcelRepository } from "../repositories/ExcelRepository";
import { DownloadTemplateRepository } from "../repositories/DownloadTemplateRepository";
import { SheetBuilder } from "../../data/repositories/download-template/sheetBuilder";
import { ExcelBuilder } from "../helpers/ExcelBuilder";
import { getTemplateId } from "../../data/repositories/ExcelPopulateDefaultRepository";
import * as templates from "../entities/data-entry/program-templates";
import { EGASPProgramDefaultRepository } from "../../data/repositories/download-template/EGASPProgramDefaultRepository";
import { EGASP_PROGRAM_ID } from "../../data/repositories/program-rule/ProgramRulesMetadataDefaultRepository";
import {
    AMC_PRODUCT_REGISTER_PROGRAM_ID,
    AMC_RAW_PRODUCT_CONSUMPTION_CALCULATED_STAGE_ID,
    AMC_RAW_PRODUCT_CONSUMPTION_STAGE_ID,
} from "../usecases/data-entry/amc/ImportAMCProductLevelData";
import {
    AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID,
    AMC_SUBSTANCE_CALCULATED_CONSUMPTION_PROGRAM_ID,
} from "../usecases/data-entry/amc/ImportAMCSubstanceLevelData";

export type DownloadType = "SUBMITTED" | "CALCULATED";

export const NO_CALCULATED_DATA_AVAILABLE = "NO_CALCULATED_DATA_AVAILABLE" as const;

// Excel's hard per-sheet row limit is 1,048,576 (2^20). The template reserves row 1+ for headers,
// so leave a small margin. A combined bulk workbook that would exceed this must be split (fewer
// years or countries) rather than silently truncated / corrupted by writes past the last row.
export const MAX_SHEET_DATA_ROWS = 1_048_000;
export const TOO_MANY_ROWS = "TOO_MANY_ROWS" as const;
export interface DownloadTemplateProps {
    moduleName: string;
    fileType: string;
    orgUnits: string[];
    populate: boolean;
    downloadRelationships: boolean;
    useCodesForMetadata: boolean;
    startDate?: Moment;
    endDate?: Moment;
    downloadType?: DownloadType;
    populateStartDate?: Moment;
    populateEndDate?: Moment;
    filterTEIEnrollmentDate?: boolean;
    relationshipsOuFilter?: RelationshipOrgUnitFilter;
    /** Years to populate in one combined workbook (bulk multi-country/multi-year download).
     *  When set (non-empty), takes precedence over startDate/endDate/populateStartDate/populateEndDate:
     *  those are derived internally as the min/max span across periods. */
    periods?: string[];
    /** Max concurrent per-org-unit fetches. Defaults to 1 (fully sequential — unchanged behaviour)
     *  when omitted, so only callers that explicitly opt in are affected. */
    fetchConcurrency?: number;
    /** Optional id -> human-readable label (e.g. country code), used only for progress logging. */
    orgUnitLabels?: Record<Id, string>;
    /** When provided, skips fetching a data package entirely and populates the template with this
     *  one instead — lets a caller fetch once (e.g. via getDataPackageForPeriods) and reuse the same
     *  package across multiple downloadTemplate calls that only differ by programStageId (PRODUCT
     *  SUBMITTED vs CALCULATED share a programId, so the underlying data is identical). */
    prefetchedDataPackage?: DataPackage;
}

export class DownloadTemplate {
    constructor(
        private downloadtemplateRepository: DownloadTemplateRepository,
        private excelRepository: ExcelRepository,
        private egaspRepository: EGASPProgramDefaultRepository
    ) {}

    public async downloadTemplate({
        moduleName,
        fileType,
        downloadType,
        orgUnits,
        startDate,
        endDate,
        populate,
        populateStartDate,
        populateEndDate,
        downloadRelationships,
        filterTEIEnrollmentDate,
        relationshipsOuFilter,
        useCodesForMetadata = false,
        periods,
        fetchConcurrency,
        orgUnitLabels,
        prefetchedDataPackage,
    }: DownloadTemplateProps): Promise<File> {
        const { programId, programStageId } = getProgramId(moduleName, fileType, downloadType);
        const formType = getFormType(programId);
        console.log(
            `[download] Target ${fileType}/${downloadType ?? "COMBINED"}: ` +
                describeProgramTarget(moduleName, fileType, downloadType)
        );
        const settings = await this.egaspRepository.getTemplateSettings().toPromise();
        const template = this.getTemplate(programId);
        if (!template) {
            throw new Error("No template found for this Program");
        }

        const element = await this.downloadtemplateRepository.getElement(formType, programId);

        const isMultiPeriod = !!periods && periods.length > 0;
        const sortedPeriods = isMultiPeriod ? [...periods!].sort() : undefined;
        const widenedStartDate = sortedPeriods ? moment(sortedPeriods[0]).startOf("year") : undefined;
        const widenedEndDate = sortedPeriods
            ? moment(sortedPeriods[sortedPeriods.length - 1]).endOf("year")
            : undefined;

        // In multi-period mode the widened span drives both the metadata/dropdown step and the
        // relationship-metadata step (getRelationshipMetadata keys off populateStartDate/EndDate,
        // not startDate/EndDate) — otherwise PRODUCT relationship metadata would silently be
        // scoped to whatever single range happened to be passed in, not the full selection.
        const result = await this.downloadtemplateRepository.getElementMetadata({
            element,
            orgUnitIds: orgUnits,
            downloadRelationships: downloadRelationships,
            startDate: (isMultiPeriod ? widenedStartDate : startDate)?.toDate(),
            endDate: (isMultiPeriod ? widenedEndDate : endDate)?.toDate(),
            populateStartDate: (isMultiPeriod ? widenedStartDate : populateStartDate)?.toDate(),
            populateEndDate: (isMultiPeriod ? widenedEndDate : populateEndDate)?.toDate(),
        });

        // FIXME: Legacy code, sheet generator
        const sheetBuilder = new SheetBuilder({
            ...result,
            language: "en",
            template: template,
            settings: settings,
            downloadRelationships: downloadRelationships,
            splitDataEntryTabsBySection: true,
            useCodesForMetadata: useCodesForMetadata,
        });

        const workbook = await sheetBuilder.generate(programId, programStageId);

        const file = await workbook.writeToBuffer();

        const enablePopulate = isMultiPeriod
            ? populate && !!widenedStartDate && !!widenedEndDate
            : populate && !!populateStartDate && !!populateEndDate;

        // writeToBuffer() returns a Buffer (Uint8Array subclass), not a Blob.
        // Extract a clean ArrayBuffer slice to avoid polyfill offset issues.
        const ab = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
        await this.excelRepository.loadTemplateFromArrayBuffer(ab, programId).toPromise();

        // A prefetched package (see getDataPackageForPeriods) skips fetching entirely — used by the
        // bulk script to fetch PRODUCT data once and reuse it for both SUBMITTED and CALCULATED,
        // which otherwise fetch byte-identical data (same programId, differing only by
        // programStageId, which is applied at populate time, not fetch time — see fillTrackerEventRows
        // in ExcelBuilder). The row-count guard already ran when the package was first fetched.
        const dataPackage = enablePopulate
            ? prefetchedDataPackage ??
              (isMultiPeriod
                  ? await this.getMultiPeriodDataPackage({
                        formType,
                        programId,
                        orgUnits,
                        periods: periods!,
                        widenedStartDate: widenedStartDate!,
                        widenedEndDate: widenedEndDate!,
                        filterTEIEnrollmentDate,
                        relationshipsOuFilter,
                        fetchConcurrency,
                        orgUnitLabels,
                    })
                  : await this.downloadtemplateRepository.getDataPackage({
                        type: formType,
                        id: programId,
                        orgUnits,
                        startDate: populateStartDate,
                        endDate: populateEndDate,
                        filterTEIEnrollmentDate,
                        relationshipsOuFilter,
                        fetchConcurrency,
                        orgUnitLabels,
                    }))
            : undefined;

        if (enablePopulate && dataPackage && downloadType === "CALCULATED") {
            const isEmpty =
                dataPackage.type === "trackerPrograms"
                    ? dataPackage.trackedEntityInstances.length === 0
                    : dataPackage.dataEntries.length === 0;
            if (isEmpty) throw new Error(NO_CALCULATED_DATA_AVAILABLE);
        }

        const builder = new ExcelBuilder(this.excelRepository, this.downloadtemplateRepository);

        if (enablePopulate && dataPackage) {
            await builder.populateTemplate(template, dataPackage, settings);
        }

        const data = await this.excelRepository.toBlob(template.id);

        return new File([data], "Excel");
    }

    // Fetches (and row-count-validates) a combined multi-period DataPackage standalone, without
    // building/populating a workbook — lets a caller prefetch once and feed the same package into
    // multiple downloadTemplate calls via `prefetchedDataPackage` (see PRODUCT SUBMITTED/CALCULATED
    // dedup in DownloadBulkPopulatedTemplateUseCase.prefetchDataPackage).
    public async getDataPackageForPeriods({
        moduleName,
        fileType,
        downloadType,
        orgUnits,
        periods,
        filterTEIEnrollmentDate,
        relationshipsOuFilter,
        fetchConcurrency,
        orgUnitLabels,
    }: {
        moduleName: string;
        fileType: string;
        downloadType?: DownloadType;
        orgUnits: string[];
        periods: string[];
        filterTEIEnrollmentDate?: boolean;
        relationshipsOuFilter?: RelationshipOrgUnitFilter;
        fetchConcurrency?: number;
        orgUnitLabels?: Record<Id, string>;
    }): Promise<DataPackage> {
        if (periods.length === 0) throw new Error("getDataPackageForPeriods: periods must not be empty");

        const { programId } = getProgramId(moduleName, fileType, downloadType);
        const formType = getFormType(programId);

        const sortedPeriods = [...periods].sort();
        const widenedStartDate = moment(sortedPeriods[0]).startOf("year");
        const widenedEndDate = moment(sortedPeriods[sortedPeriods.length - 1]).endOf("year");

        return this.getMultiPeriodDataPackage({
            formType,
            programId,
            orgUnits,
            periods,
            widenedStartDate,
            widenedEndDate,
            filterTEIEnrollmentDate,
            relationshipsOuFilter,
            fetchConcurrency,
            orgUnitLabels,
        });
    }

    // Builds one combined DataPackage covering all selected years and org units.
    //
    // Rather than issuing one getDataPackage call per year (which multiplies the per-org-unit
    // paginated event/TEI fetches by the number of years), it makes a SINGLE call over the widened
    // [min-year .. max-year] span and then keeps only the entries whose year is actually selected.
    // For contiguous selections the filter is a no-op; for non-contiguous ones (e.g. 2020 & 2023)
    // it drops the in-between years the widened span also returned. This collapses N year-passes
    // into 1 while producing identical rows.
    //
    // Tracked entity instances (PRODUCT) are intentionally NOT filtered by year: a product usually
    // enrolls once but reports consumption across several years, so every TEI in the span is kept so
    // its attributes are present for whichever of its event rows survive the filter.
    private async getMultiPeriodDataPackage({
        formType,
        programId,
        orgUnits,
        periods,
        widenedStartDate,
        widenedEndDate,
        filterTEIEnrollmentDate,
        relationshipsOuFilter,
        fetchConcurrency,
        orgUnitLabels,
    }: {
        formType: DataFormType;
        programId: Id;
        orgUnits: string[];
        periods: string[];
        widenedStartDate: Moment;
        widenedEndDate: Moment;
        filterTEIEnrollmentDate?: boolean;
        relationshipsOuFilter?: RelationshipOrgUnitFilter;
        fetchConcurrency?: number;
        orgUnitLabels?: Record<Id, string>;
    }): Promise<DataPackage> {
        console.log(
            `[download] Fetching combined data package from program ${programId}: ${orgUnits.length} org unit(s), ` +
                `${widenedStartDate.format("YYYY-MM-DD")} to ${widenedEndDate.format("YYYY-MM-DD")} ` +
                `(will be filtered down to years: ${periods.join(", ")})...`
        );
        const widenedPackage = await this.downloadtemplateRepository.getDataPackage({
            type: formType,
            id: programId,
            orgUnits,
            startDate: widenedStartDate,
            endDate: widenedEndDate,
            filterTEIEnrollmentDate,
            relationshipsOuFilter,
            fetchConcurrency,
            orgUnitLabels,
        });

        const selectedYears = new Set(periods.map(period => period.slice(0, 4)));
        const dataEntries = widenedPackage.dataEntries.filter(entry => selectedYears.has(entry.period.slice(0, 4)));
        console.log(
            `[download] Data package fetched: ${widenedPackage.dataEntries.length} entries fetched, ` +
                `${dataEntries.length} kept after year filtering` +
                (widenedPackage.type === "trackerPrograms"
                    ? `, ${widenedPackage.trackedEntityInstances.length} tracked entities`
                    : "")
        );

        // Per-country presence: which of the requested org units actually contributed data. This is
        // what tells the operator whether an empty/partial result is one country or all of them — the
        // batched fetch above otherwise only reports a single combined total. A country with no rows
        // here for a CALCULATED download typically just means its consumption calculation hasn't run
        // (or produced nothing) for this period — expected, not an error.
        const label = (id: string) => orgUnitLabels?.[id] ?? id;
        const orgUnitsWithData = new Set(dataEntries.map(entry => entry.orgUnit));
        const missing = orgUnits.filter(id => !orgUnitsWithData.has(id));
        const missingSummary =
            missing.length === 0
                ? ""
                : `; ${missing.length} with none: ${missing.slice(0, 20).map(label).join(", ")}` +
                  (missing.length > 20 ? ` … (+${missing.length - 20} more)` : "");
        console.log(`[download] Countries with data: ${orgUnitsWithData.size}/${orgUnits.length}${missingSummary}`);

        const merged: DataPackage =
            widenedPackage.type === "trackerPrograms"
                ? {
                      type: "trackerPrograms",
                      dataEntries,
                      trackedEntityInstances: widenedPackage.trackedEntityInstances,
                  }
                : { type: widenedPackage.type, dataEntries };

        this.assertRowCountWithinLimit(merged);

        return merged;
    }

    // Guards the xlsx per-sheet row cap: writes past row 1,048,576 would silently corrupt/truncate
    // the workbook. Throws a descriptive, catchable error so the caller can report it and the
    // operator can split the run (fewer years or countries) instead of shipping a broken file.
    private assertRowCountWithinLimit(dataPackage: DataPackage): void {
        // A combined workbook (COMBINE_PRODUCT_STAGES) puts each programStage's events on its own
        // sheet (see fillTrackerEventRows), so what must stay under the limit is the largest SINGLE
        // stage's row count, not the sum across all stages — otherwise a selection that fits
        // comfortably in every individual sheet could be falsely rejected. Single-stage downloads
        // (the common case, and SUBSTANCE) have exactly one group, so this equals the old "total"
        // check for them.
        const eventRowsByStage = _.groupBy(dataPackage.dataEntries, entry => entry.programStage ?? "");
        const maxEventRows = Math.max(0, ..._.map(eventRowsByStage, group => group.length));
        const teiRows = dataPackage.type === "trackerPrograms" ? dataPackage.trackedEntityInstances.length : 0;
        const maxRows = Math.max(maxEventRows, teiRows);

        if (maxRows > MAX_SHEET_DATA_ROWS) {
            throw new Error(
                `${TOO_MANY_ROWS}: combined selection would produce ${maxRows.toLocaleString()} rows, ` +
                    `exceeding the Excel per-sheet limit of ${MAX_SHEET_DATA_ROWS.toLocaleString()}. ` +
                    `Split the run into fewer years or countries.`
            );
        }
    }

    private getTemplate(programId: Id): GeneratedTemplate {
        const id = getTemplateId(programId);

        return _.values(templates)
            .map(TemplateClass => new TemplateClass())
            .filter(t => t.id === id)[0] as GeneratedTemplate;
    }
}

const getProgramId = (
    moduleName: string,
    fileType: string,
    downloadType?: DownloadType
): { programId: Id; programStageId?: Id } => {
    if (moduleName === "EGASP") {
        return { programId: EGASP_PROGRAM_ID };
    } else if (moduleName === "AMC") {
        if (fileType === "SUBSTANCE") {
            if (downloadType === "CALCULATED") {
                return { programId: AMC_SUBSTANCE_CALCULATED_CONSUMPTION_PROGRAM_ID };
            } else return { programId: AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID };
        } else if (fileType === "PRODUCT") {
            if (downloadType === "CALCULATED") {
                return {
                    programId: AMC_PRODUCT_REGISTER_PROGRAM_ID,
                    programStageId: AMC_RAW_PRODUCT_CONSUMPTION_CALCULATED_STAGE_ID,
                };
            } else if (downloadType === "SUBMITTED") {
                return {
                    programId: AMC_PRODUCT_REGISTER_PROGRAM_ID,
                    programStageId: AMC_RAW_PRODUCT_CONSUMPTION_STAGE_ID,
                };
            } else {
                return {
                    programId: AMC_PRODUCT_REGISTER_PROGRAM_ID,
                };
            }
        } else throw new Error(`Unknown file type: ${fileType}`);
    } else {
        throw new Error("Unknown module type");
    }
};

const getFormType = (programId: Id): DataFormType => {
    switch (programId) {
        case AMC_PRODUCT_REGISTER_PROGRAM_ID:
            return "trackerPrograms";
        case EGASP_PROGRAM_ID:
        case AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID:
        case AMC_SUBSTANCE_CALCULATED_CONSUMPTION_PROGRAM_ID:
            return "programs";
        default:
            return "programs";
    }
};

// Human-readable names for the DHIS2 programs/stages a download can target. Deliberately spells out
// the confusing bit: substance SUBMITTED/CALCULATED are two SEPARATE programs, whereas product
// SUBMITTED/CALCULATED are two STAGES inside the single product-register program.
const PROGRAM_LABELS: Record<Id, string> = {
    [AMC_PRODUCT_REGISTER_PROGRAM_ID]: "AMC Product Register (product-level tracker program)",
    [AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID]:
        "AMC Raw Substance Consumption (substance-level SUBMITTED — its own event program)",
    [AMC_SUBSTANCE_CALCULATED_CONSUMPTION_PROGRAM_ID]:
        "AMC Substance Consumption Calculated (substance-level CALCULATED — a SEPARATE event program, " +
        "not the product program's calculated stage)",
    [EGASP_PROGRAM_ID]: "EGASP",
};

const STAGE_LABELS: Record<Id, string> = {
    [AMC_RAW_PRODUCT_CONSUMPTION_STAGE_ID]: "Raw Product Consumption stage (SUBMITTED)",
    [AMC_RAW_PRODUCT_CONSUMPTION_CALCULATED_STAGE_ID]:
        "Raw Product Consumption Calculated stage (CALCULATED — a stage WITHIN the product program)",
};

// A precise, human-readable description of exactly which program (and stage, for product) a
// download targets — so an empty/failed result names the specific thing that has no data.
export const describeProgramTarget = (moduleName: string, fileType: string, downloadType?: DownloadType): string => {
    const { programId, programStageId } = getProgramId(moduleName, fileType, downloadType);
    const programPart = `program ${programId} — ${PROGRAM_LABELS[programId] ?? "unknown program"}`;
    const stagePart = programStageId
        ? `, stage ${programStageId} — ${STAGE_LABELS[programStageId] ?? "unknown stage"}`
        : fileType === "PRODUCT"
        ? ", all stages (SUBMITTED + CALCULATED, combined)"
        : "";
    return `${programPart}${stagePart}`;
};
