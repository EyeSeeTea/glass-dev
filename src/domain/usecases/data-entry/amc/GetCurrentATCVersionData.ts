import { Future, FutureData } from "../../../entities/Future";
import { logger } from "../../../../utils/logger";
import { GlassATCRepository } from "../../../repositories/GlassATCRepository";
import { GlassATCVersion, createAtcVersionKey } from "../../../entities/GlassATC";

export class GetCurrentATCVersionData {
    constructor(private atcRepository: GlassATCRepository) {}

    public execute(): FutureData<{
        currentATCVersion: string;
        currentATCData: GlassATCVersion;
    }> {
        logger.info("Getting current ATC version data");
        return this.atcRepository.getAtcHistory().flatMap(atcVersionHistory => {
            const atcCurrentVersionInfo = atcVersionHistory.find(({ currentVersion }) => currentVersion);
            if (!atcCurrentVersionInfo) {
                logger.error(`Cannot find current version of ATC in version history.`);
                logger.debug(
                    `Cannot find current version of ATC in version history: ${JSON.stringify(atcVersionHistory)}`
                );
                return Future.error("Cannot find current version of ATC in version history.");
            }
            const currentAtcVersionKey = createAtcVersionKey(atcCurrentVersionInfo.year, atcCurrentVersionInfo.version);
            logger.info(`Current ATC version: ${currentAtcVersionKey}`);
            return this.atcRepository.getAtcVersion(currentAtcVersionKey).flatMap(atcCurrentVersionData => {
                return Future.success({
                    currentATCVersion: currentAtcVersionKey,
                    currentATCData: atcCurrentVersionData,
                });
            });
        });
    }
}
