import { Future, FutureData } from "../../../entities/Future";
import { GlassATCHistory, createAtcVersionKey } from "../../../entities/GlassATC";
import { Id } from "../../../entities/Ref";
import { RawSubstanceConsumptionData } from "../../../entities/data-entry/amc/RawSubstanceConsumptionData";
import { GlassATCRepository } from "../../../repositories/GlassATCRepository";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { AMCSubstanceDataRepository } from "../../../repositories/data-entry/AMCSubstanceDataRepository";
import { getStringFromFile } from "../utils/fileToString";
import { calculateConsumptionSubstanceLevelData } from "./utils/calculationConsumptionSubstanceLevelData";

export class CalculateConsumptionDataSubstanceLevelUseCase {
    constructor(
        private glassUploadsRepository: GlassUploadsRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private amcSubstanceDataRepository: AMCSubstanceDataRepository,
        private atcRepository: GlassATCRepository
    ) {}

    public execute(uploadId: Id, period: string, orgUnitId: Id, orgUnitName: string): FutureData<void> {
        return this.getEventsIdsFromUploadId(uploadId)
            .flatMap(eventsIds => {
                return Future.joinObj({
                    rawSubstanceConsumptionData:
                        this.amcSubstanceDataRepository.getRawSubstanceConsumptionDataByEventsIds(orgUnitId, eventsIds),
                    atcVersionHistory: this.atcRepository.getAtcHistory(),
                });
            })
            .flatMap(result => {
                const { rawSubstanceConsumptionData, atcVersionHistory } = result as {
                    rawSubstanceConsumptionData: RawSubstanceConsumptionData[] | undefined;
                    atcVersionHistory: GlassATCHistory[];
                };

                if (!rawSubstanceConsumptionData) {
                    return Future.error("Cannot find Raw Substance Consumption Data");
                }

                const atcVersionKeys: string[] = rawSubstanceConsumptionData?.map(
                    ({ atc_version_manual }) => atc_version_manual
                );

                const atcCurrentVersionInfo = atcVersionHistory.find(({ currentVersion }) => currentVersion);

                if (!atcCurrentVersionInfo) {
                    return Future.error("Cannot find current version of ATC");
                }

                const currentAtcVersionKey = createAtcVersionKey(
                    atcCurrentVersionInfo.year,
                    atcCurrentVersionInfo.version
                );

                return this.atcRepository.getAtcVersion(currentAtcVersionKey).flatMap(atcCurrentVersionData => {
                    return this.atcRepository.getListOfAtcVersionsByKeys(atcVersionKeys).flatMap(atcVersionsByKeys => {
                        const allATCClassificationsByVersion = {
                            ...atcVersionsByKeys,
                            [currentAtcVersionKey]: atcCurrentVersionData,
                        };

                        const consumptionSubstanceLevelData = calculateConsumptionSubstanceLevelData(
                            period,
                            orgUnitId,
                            rawSubstanceConsumptionData,
                            allATCClassificationsByVersion,
                            currentAtcVersionKey
                        );
                        return Future.success(undefined);
                    });
                });
            });
    }

    private getEventsIdsFromUploadId(uploadId: Id): FutureData<string[]> {
        return this.glassUploadsRepository.getEventListFileIdByUploadId(uploadId).flatMap(eventListFileId => {
            return this.glassDocumentsRepository.download(eventListFileId).flatMap(file => {
                return Future.fromPromise(getStringFromFile(file)).flatMap(_events => {
                    const eventIdList: string[] = JSON.parse(_events);
                    return Future.success(eventIdList);
                });
            });
        });
    }
}
