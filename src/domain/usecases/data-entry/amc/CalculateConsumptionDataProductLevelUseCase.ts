import { Future, FutureData } from "../../../entities/Future";
import { Id } from "../../../entities/Ref";
import { mapToImportSummary, readTemplate, uploadIdListFileAndSave } from "../ImportBLTemplateEventProgram";
import { ExcelRepository } from "../../../repositories/ExcelRepository";
import { TrackerRepository } from "../../../repositories/TrackerRepository";
import { GlassATCRepository } from "../../../repositories/GlassATCRepository";
import { InstanceRepository } from "../../../repositories/InstanceRepository";
import { GlassATCHistory, createAtcVersionKey } from "../../../entities/GlassATC";
import { AMCProductDataRepository } from "../../../repositories/data-entry/AMCProductDataRepository";
import {
    AMC_PRODUCT_REGISTER_PROGRAM_ID,
    AMR_GLASS_AMC_TEA_PRODUCT_ID,
    AMR_RAW_PRODUCT_CONSUMPTION_STAGE_ID,
    AMR_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID,
} from "../../../../data/repositories/data-entry/AMCProductDataDeafultRepository";
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
import { D2TrackerEvent, DataValue } from "@eyeseetea/d2-api/api/trackerEvents";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import {
    RawSubstanceConsumptionCalculated,
    RawSubstanceConsumptionCalculatedKeys,
} from "../../../entities/data-entry/amc/RawSubstanceConsumptionCalculated";
import {
    PRODUCT_REGISTRY_ATTRIBUTES_KEYS,
    ProductRegistryAttributes,
} from "../../../entities/data-entry/amc/ProductRegistryAttributes";
import {
    RAW_PRODUCT_CONSUMPTION_KEYS,
    RawProductConsumption,
} from "../../../entities/data-entry/amc/RawProductConsumption";

const TEMPLATE_ID = "TRACKER_PROGRAM_GENERATED_v3";
const TRACKER_IMPORT_STRATEGY_CREATE_AND_UPDATE = "CREATE_AND_UPDATE";
const IMPORT_SUMMARY_EVENT_TYPE = "event";

export class CalculateConsumptionDataProductLevelUseCase {
    constructor(
        private excelRepository: ExcelRepository,
        private instanceRepository: InstanceRepository,
        private amcProductDataRepository: AMCProductDataRepository,
        private atcRepository: GlassATCRepository,
        private trackerRepository: TrackerRepository,
        private metadataRepository: MetadataRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository
    ) {}

    public execute(
        moduleName: string,
        period: string,
        orgUnitId: Id,
        orgUnitName: string,
        file: File
    ): FutureData<ImportSummary> {
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
                    ({ id }) => id === AMR_RAW_PRODUCT_CONSUMPTION_STAGE_ID
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
                        productRegistryAttributes,
                        rawProductConsumption,
                        atcCurrentVersionData,
                        atcVersionKey
                    );

                    const rawSubstanceConsumptionCalculatedStageMetadata =
                        productRegisterProgramMetadata?.programStages.find(
                            ({ id }) => id === AMR_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID
                        );

                    if (!rawSubstanceConsumptionCalculatedStageMetadata) {
                        return Future.error("Cannot find Raw Substance Consumption Calculated program stage metadata");
                    }

                    const d2TrackerEvents = mapRawSubstanceConsumptionCalculatedToD2TrackerEvent(
                        productDataTrackedEntities,
                        rawSubstanceConsumptionCalculatedStageMetadata,
                        rawSubstanceConsumptionCalculatedData,
                        orgUnitId,
                        orgUnitName
                    );

                    return this.createEvents(d2TrackerEvents, moduleName);
                });
            });
    }

    private createEvents(d2TrackerEvents: D2TrackerEvent[], moduleName: string): FutureData<ImportSummary> {
        if (!_.isEmpty(d2TrackerEvents)) {
            return this.trackerRepository
                .import({ events: d2TrackerEvents }, TRACKER_IMPORT_STRATEGY_CREATE_AND_UPDATE)
                .flatMap(response => {
                    return mapToImportSummary(response, IMPORT_SUMMARY_EVENT_TYPE, this.metadataRepository).flatMap(
                        summary => {
                            return uploadIdListFileAndSave(
                                "primaryUploadId",
                                summary,
                                moduleName,
                                this.glassDocumentsRepository,
                                this.glassUploadsRepository
                            );
                        }
                    );
                });
        } else {
            return Future.error("There are no events to be created");
        }
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

export function mapRawSubstanceConsumptionCalculatedToD2TrackerEvent(
    productDataTrackedEntities: ProductDataTrackedEntity[],
    rawSubstanceConsumptionCalculatedStageMetadata: ProgramStage,
    rawSubstanceConsumptionCalculatedData: RawSubstanceConsumptionCalculated[],
    orgUnitId: Id,
    orgUnitName: string
): D2TrackerEvent[] {
    return rawSubstanceConsumptionCalculatedData
        .map(data => {
            const productId = data.AMR_GLASS_AMC_TEA_PRODUCT_ID;
            const productDataTrackedEntity = productDataTrackedEntities.find(productDataTrackedEntity =>
                productDataTrackedEntity.attributes.some(attribute => attribute.value === productId)
            );
            if (productDataTrackedEntity) {
                const dataValues: DataValue[] = rawSubstanceConsumptionCalculatedStageMetadata.dataElements.map(
                    ({ id, code, valueType, optionSetValue, optionSet }) => {
                        const value = data[code.trim() as RawSubstanceConsumptionCalculatedKeys];
                        const dataValue = optionSetValue
                            ? optionSet.options.find(option => option.name === value)?.code || ""
                            : valueType === "NUMBER" && value === 0
                            ? value
                            : value || "";

                        return {
                            dataElement: id,
                            value: dataValue.toString(),
                        };
                    }
                );

                return {
                    event: "",
                    occurredAt: new Date().getTime().toString(),
                    status: "COMPLETED",
                    trackedEntity: productDataTrackedEntity.trackedEntityId,
                    enrollment: productDataTrackedEntity.enrollmentId,
                    enrollmentStatus: "ACTIVE",
                    program: AMC_PRODUCT_REGISTER_PROGRAM_ID,
                    programStage: AMR_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID,
                    orgUnit: orgUnitId,
                    orgUnitName,
                    dataValues,
                };
            }
        })
        .filter(Boolean) as D2TrackerEvent[];
}
