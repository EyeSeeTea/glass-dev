import { Future, FutureData } from "../../../entities/Future";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { DataValuesRepository } from "../../../repositories/data-entry/DataValuesRepository";
import { RISDataRepository } from "../../../repositories/data-entry/RISDataRepository";
import {
    AMR_SPECIMEN_GENDER_AGE_ORIGIN_CC_ID,
    getCategoryOptionComboByDataElement,
    getCategoryOptionComboByOptionCodes,
} from "../utils/getCategoryOptionCombo";
import { mapDataValuesToImportSummary } from "../utils/mapDhis2Summary";
import { RISData } from "../../../entities/data-entry/amr-external/RISData";
import { AMR_AMR_DS_INPUT_FILES_RIS_DS_ID, AMR_DATA_PATHOGEN_ANTIBIOTIC_BATCHID_CC_ID } from "./ImportRISFile";
import { Maybe } from "../../../../utils/ts-utils";
import { deleteDataValues } from "../utils/deleteDataValues";

// NOTICE: code adapted for node environment from ImportRISFile.ts (only DELETE)
export class DeleteRISDataset {
    constructor(
        private options: {
            risDataRepository: RISDataRepository;
            metadataRepository: MetadataRepository;
            dataValuesRepository: DataValuesRepository;
        }
    ) {}

    public delete(arrayBuffer: ArrayBuffer, asyncDeleteChunkSize: Maybe<number>): FutureData<ImportSummary> {
        return this.options.risDataRepository
            .getFromArrayBuffer(arrayBuffer)
            .flatMap(risDataItems => {
                return Future.joinObj({
                    risDataItems: Future.success(risDataItems),
                    dataSet: this.options.metadataRepository.getDataSet(AMR_AMR_DS_INPUT_FILES_RIS_DS_ID),
                    dataSet_CC: this.options.metadataRepository.getCategoryCombination(
                        AMR_DATA_PATHOGEN_ANTIBIOTIC_BATCHID_CC_ID
                    ),
                    dataElement_CC: this.options.metadataRepository.getCategoryCombination(
                        AMR_SPECIMEN_GENDER_AGE_ORIGIN_CC_ID
                    ),
                    orgUnits: this.options.metadataRepository.getOrgUnitsByCode([
                        ...new Set(risDataItems.map(item => item.COUNTRY)),
                    ]),
                });
            })
            .flatMap(({ risDataItems, dataSet, dataSet_CC, dataElement_CC, orgUnits }) => {
                const blockingCategoryOptionErrors: { error: string; line: number }[] = [];

                const dataValues = risDataItems
                    .map((risData, index) => {
                        return dataSet.dataElements.map(dataElement => {
                            const dataSetCategoryOptionValues = dataSet_CC.categories.map(category =>
                                risData[category.code as keyof RISData].toString()
                            );

                            const { categoryOptionComboId: attributeOptionCombo, error: aocBlockingError } =
                                getCategoryOptionComboByOptionCodes(dataSet_CC, dataSetCategoryOptionValues);

                            if (aocBlockingError !== "")
                                blockingCategoryOptionErrors.push({ error: aocBlockingError, line: index + 1 });

                            const { categoryOptionComboId: categoryOptionCombo, error: ccoBlockingError } =
                                getCategoryOptionComboByDataElement(dataElement, dataElement_CC, risData);

                            if (ccoBlockingError !== "")
                                blockingCategoryOptionErrors.push({ error: ccoBlockingError, line: index + 1 });

                            const value = risData[dataElement.code as keyof RISData]?.toString() || "";

                            const dataValue = {
                                orgUnit: orgUnits.find(ou => ou.code === risData.COUNTRY)?.id || "",
                                period: risData.YEAR.toString(),
                                attributeOptionCombo: attributeOptionCombo,
                                dataElement: dataElement.id,
                                categoryOptionCombo: categoryOptionCombo,
                                value,
                            };

                            return dataValue;
                        });
                    })
                    .flat();

                return deleteDataValues(dataValues, asyncDeleteChunkSize, this.options.dataValuesRepository).map(
                    saveSummary => {
                        const importSummary = mapDataValuesToImportSummary(saveSummary, "DELETE");

                        return {
                            ...importSummary,
                            importTime: saveSummary.importTime,
                        };
                    }
                );
            });
    }
}
