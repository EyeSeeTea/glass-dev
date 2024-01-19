import { Future, FutureData } from "../../../entities/Future";
import { Id } from "../../../entities/Ref";
import { mapToImportSummary, readTemplate } from "../ImportBLTemplateEventProgram";
import { ExcelRepository } from "../../../repositories/ExcelRepository";
import { GlassATCRepository } from "../../../repositories/GlassATCRepository";
import { InstanceRepository } from "../../../repositories/InstanceRepository";
import { AMCProductDataRepository } from "../../../repositories/data-entry/AMCProductDataRepository";
import {
    AMC_PRODUCT_REGISTER_PROGRAM_ID,
    AMR_GLASS_AMC_TEA_PRODUCT_ID,
    AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID,
} from "../../../../data/repositories/data-entry/AMCProductDataDefaultRepository";
import * as templates from "../../../entities/data-entry/program-templates";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { getConsumptionDataProductLevel } from "./utils/getConsumptionDataProductLevel";

const TEMPLATE_ID = "TRACKER_PROGRAM_GENERATED_v3";
const IMPORT_SUMMARY_EVENT_TYPE = "event";
const IMPORT_STRATEGY_CREATE_AND_UPDATE = "CREATE_AND_UPDATE";

export class CalculateConsumptionDataProductLevelUseCase {
    constructor(
        private excelRepository: ExcelRepository,
        private instanceRepository: InstanceRepository,
        private amcProductDataRepository: AMCProductDataRepository,
        private atcRepository: GlassATCRepository,
        private metadataRepository: MetadataRepository
    ) {}

    public execute(period: string, orgUnitId: Id, file: File): FutureData<ImportSummary> {
        return this.getProductIdsFromFile(file)
            .flatMap(productIds => {
                return Future.joinObj({
                    productRegisterProgramMetadata: this.amcProductDataRepository.getProductRegisterProgramMetadata(),
                    productDataTrackedEntities:
                        this.amcProductDataRepository.getProductRegisterAndRawProductConsumptionByProductIds(
                            orgUnitId,
                            productIds
                        ),
                    atcVersionHistory: this.atcRepository.getAtcHistory(),
                });
            })
            .flatMap(result => {
                const { productRegisterProgramMetadata, productDataTrackedEntities, atcVersionHistory } = result;
                return getConsumptionDataProductLevel({
                    productRegisterProgramMetadata,
                    productDataTrackedEntities,
                    atcVersionHistory,
                    atcRepository: this.atcRepository,
                    orgUnitId,
                    period,
                }).flatMap(rawSubstanceConsumptionCalculatedData => {
                    if (_.isEmpty(rawSubstanceConsumptionCalculatedData)) {
                        console.error(
                            `Product level: here are no calculated data to import for orgUnitId=${orgUnitId} and period=${period}`
                        );
                        const errorSummary: ImportSummary = {
                            status: "ERROR",
                            importCount: {
                                ignored: 0,
                                imported: 0,
                                deleted: 0,
                                updated: 0,
                            },
                            nonBlockingErrors: [],
                            blockingErrors: [],
                        };
                        return Future.success(errorSummary);
                    }

                    const rawSubstanceConsumptionCalculatedStageMetadata =
                        productRegisterProgramMetadata?.programStages.find(
                            ({ id }) => id === AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID
                        );

                    if (!rawSubstanceConsumptionCalculatedStageMetadata) {
                        return Future.error("Cannot find Raw Substance Consumption Calculated program stage metadata");
                    }

                    return this.amcProductDataRepository
                        .importCalculations(
                            IMPORT_STRATEGY_CREATE_AND_UPDATE,
                            productDataTrackedEntities,
                            rawSubstanceConsumptionCalculatedStageMetadata,
                            rawSubstanceConsumptionCalculatedData,
                            orgUnitId
                        )
                        .flatMap(response => {
                            return mapToImportSummary(
                                response,
                                IMPORT_SUMMARY_EVENT_TYPE,
                                this.metadataRepository
                            ).flatMap(summary => {
                                return Future.success(summary.importSummary);
                            });
                        });
                });
            });
    }

    private getProductIdsFromFile(file: File): FutureData<string[]> {
        return this.excelRepository.loadTemplate(file, AMC_PRODUCT_REGISTER_PROGRAM_ID).flatMap(_templateId => {
            const amcTemplate = _.values(templates)
                .map(TemplateClass => new TemplateClass())
                .filter(t => t.id === TEMPLATE_ID)[0];
            return this.instanceRepository.getProgram(AMC_PRODUCT_REGISTER_PROGRAM_ID).flatMap(amcProgram => {
                if (!amcTemplate) return Future.error("Cannot find template");

                return readTemplate(
                    amcTemplate,
                    amcProgram,
                    this.excelRepository,
                    this.instanceRepository,
                    AMC_PRODUCT_REGISTER_PROGRAM_ID
                ).flatMap(amcProductData => {
                    if (!amcProductData) return Future.error("Cannot find data package");

                    if (amcProductData.type !== "trackerPrograms") return Future.error("Incorrect data package");

                    const productIds = amcProductData.trackedEntityInstances
                        .map(({ attributeValues }) => {
                            return attributeValues.find(
                                ({ attribute }) => attribute.id === AMR_GLASS_AMC_TEA_PRODUCT_ID
                            )?.value;
                        })
                        .filter(Boolean) as string[];

                    return Future.success(productIds);
                });
            });
        });
    }
}
