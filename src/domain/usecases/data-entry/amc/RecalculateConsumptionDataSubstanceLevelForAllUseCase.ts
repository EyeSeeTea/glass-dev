import _ from "lodash";
import { logger } from "../../../../utils/logger";
import { Id } from "../../../entities/Ref";
import { Future, FutureData } from "../../../entities/Future";
import { CODE_PRODUCT_NOT_HAVE_ATC, GlassAtcVersionData } from "../../../entities/GlassAtcVersionData";
import { RawSubstanceConsumptionData } from "../../../entities/data-entry/amc/RawSubstanceConsumptionData";
import { SubstanceConsumptionCalculated } from "../../../entities/data-entry/amc/SubstanceConsumptionCalculated";
import { GlassATCRepository } from "../../../repositories/GlassATCRepository";
import { AMCSubstanceDataRepository } from "../../../repositories/data-entry/AMCSubstanceDataRepository";
import { getConsumptionDataSubstanceLevel } from "./utils/getConsumptionDataSubstanceLevel";
import { updateRecalculatedConsumptionData } from "./utils/updateRecalculatedConsumptionData";
import { Maybe } from "../../../../utils/ts-utils";
import consoleLogger from "../../../../utils/consoleLogger";

export class RecalculateConsumptionDataSubstanceLevelForAllUseCase {
    constructor(
        private amcSubstanceDataRepository: AMCSubstanceDataRepository,
        private atcRepository: GlassATCRepository
    ) {}
    public execute(
        orgUnitsIds: Id[],
        periods: string[],
        currentATCVersion: string,
        currentATCData: GlassAtcVersionData,
        allowCreationIfNotExist: boolean,
        importCalculationChunkSize: Maybe<number>
    ): FutureData<void> {
        logger.info(
            `[${new Date().toISOString()}] Calculate consumption data of substance level for orgUnitsIds=${orgUnitsIds.join(
                ","
            )} and periods=${periods.join(",")}. Current ATC version ${currentATCVersion}`
        );

        const allCombinations = orgUnitsIds.flatMap(orgUnitId => periods.map(period => ({ orgUnitId, period })));

        return Future.sequential(
            allCombinations.map(({ orgUnitId, period }) => {
                return Future.fromPromise(new Promise(resolve => setTimeout(resolve, 500))).flatMap(() => {
                    consoleLogger.debug(
                        `[${new Date().toISOString()}] Waiting 500 milliseconds... orgUnit: ${orgUnitId}, period: ${period}`
                    );
                    return this.calculateByOrgUnitAndPeriod(
                        orgUnitId,
                        period,
                        currentATCVersion,
                        currentATCData,
                        allowCreationIfNotExist,
                        importCalculationChunkSize
                    ).toVoid();
                });
            })
        ).toVoid();
    }

    private calculateByOrgUnitAndPeriod(
        orgUnitId: Id,
        period: string,
        currentATCVersion: string,
        currentATCData: GlassAtcVersionData,
        allowCreationIfNotExist: boolean,
        importCalculationChunkSize: Maybe<number>
    ): FutureData<void> {
        logger.info(
            `[${new Date().toISOString()}] Calculating consumption data of substance level for orgUnitsId ${orgUnitId} and period ${period}`
        );
        return this.getDataForRecalculations(orgUnitId, period).flatMap(
            ({ rawSubstanceConsumptionData, currentCalculatedConsumptionData }) => {
                if (_.isEmpty(rawSubstanceConsumptionData)) {
                    logger.info(
                        `[${new Date().toISOString()}] Substance level: there are no raw substance consumption data for orgUnitId ${orgUnitId} and period ${period}`
                    );
                    return Future.success(undefined);
                }

                if (
                    !allowCreationIfNotExist &&
                    (!currentCalculatedConsumptionData || _.isEmpty(currentCalculatedConsumptionData))
                ) {
                    logger.info(
                        `[${new Date().toISOString()}] Substance level: there are no current calculated data to update for orgUnitId ${orgUnitId} and period ${period}`
                    );
                    return Future.success(undefined);
                }

                return getConsumptionDataSubstanceLevel({
                    orgUnitId,
                    period,
                    atcRepository: this.atcRepository,
                    rawSubstanceConsumptionData,
                    currentAtcVersionKey: currentATCVersion,
                    atcCurrentVersionData: currentATCData,
                }).flatMap(newCalculatedConsumptionData => {
                    if (_.isEmpty(newCalculatedConsumptionData)) {
                        logger.error(
                            `[${new Date().toISOString()}] Substance level: there are no new calculated data to update current data for orgUnitId ${orgUnitId} and period ${period}`
                        );
                        return Future.success(undefined);
                    }

                    return updateRecalculatedConsumptionData(
                        orgUnitId,
                        period,
                        newCalculatedConsumptionData,
                        currentCalculatedConsumptionData,
                        this.amcSubstanceDataRepository,
                        allowCreationIfNotExist,
                        importCalculationChunkSize
                    );
                });
            }
        );
    }

    private getDataForRecalculations(
        orgUnitId: Id,
        period: string
    ): FutureData<{
        rawSubstanceConsumptionData: RawSubstanceConsumptionData[] | undefined;
        currentCalculatedConsumptionData: SubstanceConsumptionCalculated[] | undefined;
    }> {
        logger.info(
            `[${new Date().toISOString()}] Getting raw substance consumption data and current calculated consumption data for orgUnitId ${orgUnitId} and period ${period}`
        );
        return Future.joinObj({
            rawSubstanceConsumptionData: this.amcSubstanceDataRepository.getAllRawSubstanceConsumptionDataByByPeriod(
                orgUnitId,
                period
            ),
            currentCalculatedConsumptionData:
                this.amcSubstanceDataRepository.getAllCalculatedSubstanceConsumptionDataByByPeriod(orgUnitId, period),
        }).flatMap(({ rawSubstanceConsumptionData, currentCalculatedConsumptionData }) => {
            const validRawSubstanceConsumptionData = rawSubstanceConsumptionData?.filter(
                ({ atc_manual }) => atc_manual !== CODE_PRODUCT_NOT_HAVE_ATC
            );
            return Future.success({
                rawSubstanceConsumptionData: validRawSubstanceConsumptionData,
                currentCalculatedConsumptionData,
            });
        });
    }
}
