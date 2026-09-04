import { UseCase } from "../../CompositionRoot";
import { EGASPProgramDefaultRepository } from "../../data/repositories/download-template/EGASPProgramDefaultRepository";
import { DataPackage } from "../entities/data-entry/DataPackage";
import { Future, FutureData } from "../entities/Future";
import { DownloadTemplateRepository } from "../repositories/DownloadTemplateRepository";
import { ExcelRepository } from "../repositories/ExcelRepository";
import { MetadataRepository } from "../repositories/MetadataRepository";
import { DownloadTemplate, DownloadType, NO_CALCULATED_DATA_AVAILABLE } from "../utils/DownloadTemplate";

export interface DownloadBulkPopulatedTemplateOptions {
    /** Max concurrent per-org-unit fetches. Defaults to 1 (sequential) when omitted. */
    fetchConcurrency?: number;
    /** Skips fetching entirely and populates with this package instead — see prefetchDataPackage. */
    prefetchedDataPackage?: DataPackage;
    /** Optional id -> human-readable label (e.g. country code), used only for progress logging. */
    orgUnitLabels?: Record<string, string>;
}

/**
 * Sibling of DownloadPopulatedTemplateUseCase for bulk exports: combines several org units and
 * several (possibly non-contiguous) years into one populated workbook, in the exact upload-template
 * column format. See DownloadTemplate.downloadTemplate's `periods` handling for how multi-year data
 * is fetched and merged.
 */
export class DownloadBulkPopulatedTemplateUseCase implements UseCase {
    constructor(
        private downloadTemplateRepository: DownloadTemplateRepository,
        private excelRepository: ExcelRepository,
        private egaspRepository: EGASPProgramDefaultRepository,
        private metadataRepository: MetadataRepository
    ) {}

    public execute(
        moduleName: string,
        orgUnits: string[],
        periods: string[],
        fileType: string,
        // Optional: when omitted for a multi-stage program (AMC PRODUCT), the generated workbook
        // contains every program stage as its own tab (SUBMITTED + CALCULATED in one file) instead
        // of a single stage. getProgramId returns no programStageId in that case, so sheetBuilder
        // emits all accessible stages and each event is written to its own stage's tab at populate time.
        downloadType: DownloadType | undefined,
        options?: DownloadBulkPopulatedTemplateOptions
    ): FutureData<File> {
        const downloadRelationships = moduleName === "AMC" && fileType === "PRODUCT" ? true : false;
        const filterTEIEnrollmentDate = downloadRelationships;

        const downloadTemplate = new DownloadTemplate(
            this.downloadTemplateRepository,
            this.excelRepository,
            this.egaspRepository
        );
        return Future.fromPromise(
            downloadTemplate
                .downloadTemplate({
                    moduleName,
                    fileType,
                    orgUnits,
                    populate: true,
                    downloadRelationships,
                    useCodesForMetadata: moduleName === "EGASP" || moduleName === "AMC",
                    downloadType,
                    periods,
                    filterTEIEnrollmentDate,
                    fetchConcurrency: options?.fetchConcurrency,
                    prefetchedDataPackage: options?.prefetchedDataPackage,
                    orgUnitLabels: options?.orgUnitLabels,
                })
                .catch(e => {
                    // NO_CALCULATED_DATA_AVAILABLE is an expected, handled outcome (the caller records
                    // it as SKIPPED), not a failure — don't dump a scary error object for it. Genuine
                    // failures still get the full detail.
                    if (e?.message !== NO_CALCULATED_DATA_AVAILABLE) {
                        console.error("[AMC bulk download] DownloadBulkPopulatedTemplateUseCase failed:", {
                            moduleName,
                            fileType,
                            downloadType,
                            orgUnits,
                            periods,
                            error: e,
                            stack: e?.stack,
                        });
                    }
                    throw e;
                })
        );
    }

    /**
     * Fetches the combined DataPackage for (orgUnits × periods × fileType) standalone, without
     * building a workbook. For PRODUCT, SUBMITTED and CALCULATED share the same programId (they
     * differ only by programStageId, applied at populate time) — so the caller can prefetch once
     * here with downloadType="SUBMITTED" and pass the result as `prefetchedDataPackage` to two
     * `execute()` calls (SUBMITTED and CALCULATED), fetching the org-unit data only once instead
     * of twice. Not meaningful for SUBSTANCE, whose SUBMITTED/CALCULATED programIds differ.
     */
    public prefetchDataPackage(
        moduleName: string,
        orgUnits: string[],
        periods: string[],
        fileType: string,
        fetchConcurrency?: number,
        orgUnitLabels?: Record<string, string>
    ): FutureData<DataPackage> {
        const downloadRelationships = moduleName === "AMC" && fileType === "PRODUCT" ? true : false;
        const filterTEIEnrollmentDate = downloadRelationships;

        const downloadTemplate = new DownloadTemplate(
            this.downloadTemplateRepository,
            this.excelRepository,
            this.egaspRepository
        );
        return Future.fromPromise(
            downloadTemplate
                .getDataPackageForPeriods({
                    moduleName,
                    fileType,
                    downloadType: "SUBMITTED",
                    orgUnits,
                    periods,
                    filterTEIEnrollmentDate,
                    fetchConcurrency,
                    orgUnitLabels,
                })
                .catch(e => {
                    console.error("[AMC bulk download] prefetchDataPackage failed:", {
                        moduleName,
                        fileType,
                        orgUnits,
                        periods,
                        error: e,
                        stack: e?.stack,
                    });
                    throw e;
                })
        );
    }
}
