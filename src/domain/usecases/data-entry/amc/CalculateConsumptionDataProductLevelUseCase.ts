import { Future, FutureData } from "../../../entities/Future";
import { Id } from "../../../entities/Ref";
import { mapToImportSummary, readTemplate } from "../ImportBLTemplateEventProgram";
import { ExcelRepository } from "../../../repositories/ExcelRepository";
import { GlassATCRepository } from "../../../repositories/GlassATCRepository";
import { InstanceRepository } from "../../../repositories/InstanceRepository";
import { GlassATCHistory, createAtcVersionKey } from "../../../entities/GlassATC";
import { AMCProductDataRepository } from "../../../repositories/data-entry/AMCProductDataRepository";
import {
    AMC_PRODUCT_REGISTER_PROGRAM_ID,
    AMR_GLASS_AMC_TEA_PRODUCT_ID,
    AMC_RAW_PRODUCT_CONSUMPTION_STAGE_ID,
    AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID,
} from "../../../../data/repositories/data-entry/AMCProductDataDefaultRepository";
import * as templates from "../../../entities/data-entry/program-templates";
import { calculateConsumptionProductLevelData } from "./utils/calculationConsumptionProductLevelData";
import {
    Attributes,
    Event,
    EventDataValue,
    ProductDataTrackedEntity,
} from "../../../entities/data-entry/amc/ProductDataTrackedEntity";
import {
    ProductRegisterProgramMetadata,
    ProgramStage,
    ProgramStageDataElement,
    ProgramTrackedEntityAttribute,
} from "../../../entities/data-entry/amc/ProductRegisterProgram";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import {
    PRODUCT_REGISTRY_ATTRIBUTES_KEYS,
    ProductRegistryAttributes,
} from "../../../entities/data-entry/amc/ProductRegistryAttributes";
import {
    RAW_PRODUCT_CONSUMPTION_KEYS,
    RawProductConsumption,
} from "../../../entities/data-entry/amc/RawProductConsumption";

const TEMPLATE_ID = "TRACKER_PROGRAM_GENERATED_v3";
const IMPORT_SUMMARY_EVENT_TYPE = "event";

export class CalculateConsumptionDataProductLevelUseCase {
    constructor(
        private excelRepository: ExcelRepository,
        private instanceRepository: InstanceRepository,
        private amcProductDataRepository: AMCProductDataRepository,
        private atcRepository: GlassATCRepository,
        private metadataRepository: MetadataRepository
    ) {}

    public execute(period: string, orgUnitId: Id, orgUnitName: string, file: File): FutureData<ImportSummary> {
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
                const { productRegisterProgramMetadata, productDataTrackedEntities, atcVersionHistory } = result as {
                    productRegisterProgramMetadata: ProductRegisterProgramMetadata | undefined;
                    productDataTrackedEntities: ProductDataTrackedEntity[];
                    atcVersionHistory: GlassATCHistory[];
                };

                if (!productRegisterProgramMetadata) {
                    return Future.error("Cannot find Product Register program metadata");
                }

                const rawProductConsumptionStage = productRegisterProgramMetadata?.programStages.find(
                    ({ id }) => id === AMC_RAW_PRODUCT_CONSUMPTION_STAGE_ID
                );

                if (!rawProductConsumptionStage) {
                    return Future.error("Cannot find Raw Product Consumption program stage metadata");
                }

                const atcCurrentVersionInfo = atcVersionHistory.find(({ currentVersion }) => currentVersion);

                if (!atcCurrentVersionInfo) {
                    return Future.error("Cannot find current version of ATC");
                }

                const atcVersionKey = createAtcVersionKey(atcCurrentVersionInfo.year, atcCurrentVersionInfo.version);

                return this.atcRepository.getAtcVersion(atcVersionKey).flatMap(atcCurrentVersionData => {
                    const { productRegistryAttributes, rawProductConsumption } =
                        getProductRegistryAttributesAndRawProductConsumption(
                            productDataTrackedEntities,
                            productRegisterProgramMetadata.programAttributes,
                            rawProductConsumptionStage
                        );

                    const rawSubstanceConsumptionCalculatedData = calculateConsumptionProductLevelData(
                        period,
                        orgUnitId,
                        productRegistryAttributes,
                        rawProductConsumption,
                        atcCurrentVersionData,
                        atcVersionKey
                    );

                    const rawSubstanceConsumptionCalculatedStageMetadata =
                        productRegisterProgramMetadata?.programStages.find(
                            ({ id }) => id === AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID
                        );

                    if (!rawSubstanceConsumptionCalculatedStageMetadata) {
                        return Future.error("Cannot find Raw Substance Consumption Calculated program stage metadata");
                    }

                    if (_.isEmpty(rawSubstanceConsumptionCalculatedData)) {
                        return Future.error("There are no calculated data to import");
                    }

                    return this.amcProductDataRepository
                        .importCalculations(
                            productDataTrackedEntities,
                            rawSubstanceConsumptionCalculatedStageMetadata,
                            rawSubstanceConsumptionCalculatedData,
                            orgUnitId,
                            orgUnitName
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

export function getProductRegistryAttributesAndRawProductConsumption(
    productDataTrackedEntities: ProductDataTrackedEntity[],
    productRegisterProgramAttributes: ProgramTrackedEntityAttribute[],
    rawProductConsumptionStage: ProgramStage
) {
    return productDataTrackedEntities.reduce(
        (acc, productDataTrackedEntity) => {
            const productId = productDataTrackedEntity.attributes.find(
                ({ id }) => id === AMR_GLASS_AMC_TEA_PRODUCT_ID
            )?.value;
            if (!productId) {
                return acc;
            }
            return {
                productRegistryAttributes: [
                    ...acc.productRegistryAttributes,
                    getProductRegistryAttributes(productDataTrackedEntity.attributes, productRegisterProgramAttributes),
                ],
                rawProductConsumption: [
                    ...acc.rawProductConsumption,
                    ...getRawProductConsumption(productId, productDataTrackedEntity.events, rawProductConsumptionStage),
                ],
            };
        },
        {
            productRegistryAttributes: [],
            rawProductConsumption: [],
        } as {
            productRegistryAttributes: ProductRegistryAttributes[];
            rawProductConsumption: RawProductConsumption[];
        }
    );
}

export function getProductRegistryAttributes(
    attributes: Attributes[],
    programAttributes: ProgramTrackedEntityAttribute[]
): ProductRegistryAttributes {
    return programAttributes.reduce(
        (acc: ProductRegistryAttributes, programAttribute: ProgramTrackedEntityAttribute) => {
            const productAttribute: Attributes | undefined = attributes.find(
                attribute => attribute.id === programAttribute.id
            );

            if (productAttribute && PRODUCT_REGISTRY_ATTRIBUTES_KEYS.includes(programAttribute.code)) {
                switch (programAttribute.valueType) {
                    case "TEXT":
                        return {
                            ...acc,
                            [programAttribute.code]: programAttribute.optionSetValue
                                ? programAttribute.optionSet.options.find(
                                      option => option.code === productAttribute.value
                                  )?.name
                                : productAttribute.value,
                        };
                    case "NUMBER":
                    case "INTEGER":
                    case "INTEGER_POSITIVE":
                    case "INTEGER_ZERO_OR_POSITIVE":
                        return {
                            ...acc,
                            [programAttribute.code]: programAttribute.optionSetValue
                                ? programAttribute.optionSet.options.find(
                                      option => option.code === productAttribute.value
                                  )?.name
                                : parseFloat(productAttribute.value),
                        };
                    default:
                        return {
                            ...acc,
                            [programAttribute.code]: productAttribute.value,
                        };
                }
            }
            return acc;
        },
        {} as ProductRegistryAttributes
    );
}

export function getRawProductConsumption(
    productId: string,
    events: Event[],
    programStage: ProgramStage
): RawProductConsumption[] {
    return events.map(event => {
        return event.dataValues.reduce(
            (acc: RawProductConsumption, eventDataValue: EventDataValue) => {
                const programStageDataElement: ProgramStageDataElement | undefined = programStage.dataElements.find(
                    dataElement => dataElement.id === eventDataValue.id
                );
                if (programStageDataElement && RAW_PRODUCT_CONSUMPTION_KEYS.includes(programStageDataElement.code)) {
                    switch (programStageDataElement.valueType) {
                        case "TEXT":
                            return {
                                ...acc,
                                [programStageDataElement.code]: programStageDataElement.optionSetValue
                                    ? programStageDataElement.optionSet.options.find(
                                          option => option.code === eventDataValue.value
                                      )?.name
                                    : eventDataValue.value,
                            };
                        case "NUMBER":
                        case "INTEGER":
                        case "INTEGER_POSITIVE":
                        case "INTEGER_ZERO_OR_POSITIVE":
                            return {
                                ...acc,
                                [programStageDataElement.code]: programStageDataElement.optionSetValue
                                    ? programStageDataElement.optionSet.options.find(
                                          option => option.code === eventDataValue.value
                                      )?.name
                                    : parseFloat(eventDataValue.value),
                            };
                        default:
                            return {
                                ...acc,
                                [programStageDataElement.code]: eventDataValue.value,
                            };
                    }
                }
                return acc;
            },
            {
                AMR_GLASS_AMC_TEA_PRODUCT_ID: productId,
            } as RawProductConsumption
        );
    });
}
