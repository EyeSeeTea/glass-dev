import { boolean, command, flag, run } from "cmd-ts";
import { setupLogger, logger } from "../utils/logger";
import { getApiUrlOptions, getD2ApiFromArgs, getInstance } from "./common";
import { DataStoreClient } from "../data/data-store/DataStoreClient";
import { RecalculateConsumptionDataProductLevelForAllUseCase } from "../domain/usecases/data-entry/amc/RecalculateConsumptionDataProductLevelForAllUseCase";
import { RecalculateConsumptionDataSubstanceLevelForAllUseCase } from "../domain/usecases/data-entry/amc/RecalculateConsumptionDataSubstanceLevelForAllUseCase";
import { AMCProductDataDefaultRepository } from "../data/repositories/data-entry/AMCProductDataDefaultRepository";
import { GlassATCDefaultRepository } from "../data/repositories/GlassATCDefaultRepository";
import { AMCSubstanceDataDefaultRepository } from "../data/repositories/data-entry/AMCSubstanceDataDefaultRepository";
import { AMCProductDataRepository } from "../domain/repositories/data-entry/AMCProductDataRepository";
import { AMCSubstanceDataRepository } from "../domain/repositories/data-entry/AMCSubstanceDataRepository";
import { GlassATCRepository } from "../domain/repositories/GlassATCRepository";
import { GlassATCRecalculateDataInfo } from "../domain/entities/GlassAtcVersionData";
import { DisableAMCRecalculationsUseCase } from "../domain/usecases/data-entry/amc/DisableAMCRecalculationsUseCase";
import { GetRecalculateDataInfoUseCase } from "../domain/usecases/data-entry/amc/GetRecalculateDataInfoUseCase";
import { GetCurrentATCVersionData } from "../domain/usecases/data-entry/amc/GetCurrentATCVersionData";

async function main() {
    const cmd = command({
        name: "Recalculate consumption in product level data and substance level data for all orgnaisation units and all periods",
        description:
            "Recalculate for all registered products the raw substance consumption from raw product consumption and recalculate from raw substances consumption data the consumption data",
        args: {
            ...getApiUrlOptions(),
            debug: flag({
                type: boolean,
                long: "debug",
                description: "Option to print also logs in console",
            }),
            calculate: flag({
                type: boolean,
                long: "calculate",
                description:
                    "Option to enabling not only recalculate but also calculate producing the events if they do not exist",
            }),
        },
        handler: async args => {
            try {
                const api = getD2ApiFromArgs(args);
                const instance = getInstance(args);
                const dataStoreClient = new DataStoreClient(instance);
                const amcProductDataRepository = new AMCProductDataDefaultRepository(api);
                const amcSubstanceDataRepository = new AMCSubstanceDataDefaultRepository(api);
                const atcRepository = new GlassATCDefaultRepository(dataStoreClient);

                try {
                    await setupLogger(instance, { isDebug: args.debug });
                    logger.info(`Starting AMC recalculations...`);
                    const recalculateDataInfo = await getRecalculateDataInfo(atcRepository);
                    logger.debug(
                        `Recalculate data info: date=${recalculateDataInfo?.date}, recalculate=${
                            recalculateDataInfo?.recalculate
                        }, periods=${recalculateDataInfo?.periods.join(
                            ","
                        )} and orgUnitsIds=${recalculateDataInfo?.orgUnitsIds.join(",")}`
                    );
                    if (recalculateDataInfo && recalculateDataInfo.recalculate) {
                        logger.info(`Disabling AMC recalculations before start with calculations`);
                        await disableRecalculations(atcRepository);
                        if (args.calculate) {
                            logger.info(`Calculate flag enabled. Events will be created if they do not exist`);
                        }
                        await recalculateData({
                            periods: Array.from(new Set(recalculateDataInfo.periods)),
                            orgUnitsIds: Array.from(new Set(recalculateDataInfo.orgUnitsIds)),
                            amcProductDataRepository,
                            amcSubstanceDataRepository,
                            atcRepository,
                            allowCreationIfNotExist: args.calculate,
                        });
                    } else {
                        logger.info(`AMC recalculations are disabled`);
                    }
                    logger.info(`Waiting for next AMC recalculations...`);
                } catch (err) {
                    logger.info(`Disabling AMC recalculations`);
                    await disableRecalculations(atcRepository);
                    await logger.error(
                        `ERROR - AMC recalculations has not been properly executed because of the following error: ${err}. Recalculations will be rerun again on the next iteration if it's enabled.`
                    );
                    console.error(
                        `ERROR - AMC recalculations has not been properly executed because of the following error: ${err}. Recalculations will be rerun again on the next iteration if it's enabled.`
                    );
                    logger.info(`Waiting for next AMC recalculations...`);
                }
            } catch (err) {
                await logger.error(
                    `STOPPING AMC RECALCULATIONS SCRIPT: AMC recalculations have stopped with error ${err}. Please, restart again.`
                );
                console.error(`AMC recalculations have stopped with error: ${err}. Please, restart again.`);
                process.exit(1);
            }
        },
    });

    run(cmd, process.argv.slice(2));
}

export async function getRecalculateDataInfo(
    atcRepository: GlassATCRepository
): Promise<GlassATCRecalculateDataInfo | undefined> {
    const recalculateDataInfo = await new GetRecalculateDataInfoUseCase(atcRepository).execute().toPromise();
    return recalculateDataInfo;
}

export async function disableRecalculations(atcRepository: GlassATCRepository): Promise<void> {
    await new DisableAMCRecalculationsUseCase(atcRepository).execute().toPromise();
}

export async function recalculateData(params: {
    orgUnitsIds: string[];
    periods: string[];
    amcProductDataRepository: AMCProductDataRepository;
    amcSubstanceDataRepository: AMCSubstanceDataRepository;
    atcRepository: GlassATCRepository;
    allowCreationIfNotExist: boolean;
}): Promise<void> {
    const {
        orgUnitsIds,
        periods,
        amcProductDataRepository,
        amcSubstanceDataRepository,
        atcRepository,
        allowCreationIfNotExist,
    } = params;
    logger.info(
        `START - Recalculating AMC data for orgnanisations ${orgUnitsIds.join(",")} and periods ${periods.join(
            ","
        )} with new ATC version`
    );

    const { currentATCVersion, currentATCData } = await new GetCurrentATCVersionData(atcRepository)
        .execute()
        .toPromise();

    await new RecalculateConsumptionDataProductLevelForAllUseCase(amcProductDataRepository, amcSubstanceDataRepository)
        .execute(orgUnitsIds, periods, currentATCVersion, currentATCData, allowCreationIfNotExist)
        .toPromise();

    await new RecalculateConsumptionDataSubstanceLevelForAllUseCase(amcSubstanceDataRepository, atcRepository)
        .execute(orgUnitsIds, periods, currentATCVersion, currentATCData, allowCreationIfNotExist)
        .toPromise();

    logger.success(
        `END - End of AMC recalculations for orgnanisations ${orgUnitsIds.join(",")} and periods ${periods.join(",")}`
    );
}

main();
