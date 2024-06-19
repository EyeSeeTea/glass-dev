import { Future, FutureData } from "../../../entities/Future";
import { logger } from "../../../../utils/logger";
import { GlassATCRepository } from "../../../repositories/GlassATCRepository";
import { GlassAtcVersionData, createAtcVersionKey } from "../../../entities/GlassAtcVersionData";

export class GetCurrentATCVersionData {
    constructor(private atcRepository: GlassATCRepository) {}

    public execute(): FutureData<{
        currentATCVersion: string;
        currentATCData: GlassAtcVersionData;
    }> {
        logger.info(`[${new Date().toISOString()}] Getting current ATC version data`);
        return this.atcRepository.getAtcHistory().flatMap(atcVersionHistory => {
            const atcCurrentVersionInfo = atcVersionHistory.find(({ currentVersion }) => currentVersion);
            if (!atcCurrentVersionInfo) {
                logger.error(`[${new Date().toISOString()}] Cannot find current version of ATC in version history.`);
                logger.debug(
                    `[${new Date().toISOString()}] Cannot find current version of ATC in version history: ${JSON.stringify(
                        atcVersionHistory
                    )}`
                );
                return Future.error("Cannot find current version of ATC in version history.");
            }
            const currentAtcVersionKey = createAtcVersionKey(atcCurrentVersionInfo.year, atcCurrentVersionInfo.version);
            logger.info(`[${new Date().toISOString()}] Current ATC version: ${currentAtcVersionKey}`);
            return this.atcRepository.getAtcVersion(currentAtcVersionKey).flatMap(atcCurrentVersionData => {
                return Future.success({
                    currentATCVersion: currentAtcVersionKey,
                    currentATCData: atcCurrentVersionData,
                });
            });
        });
    }
}
