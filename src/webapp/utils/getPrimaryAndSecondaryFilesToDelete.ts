import { ModuleDetails } from "../../domain/utils/ModuleProperties";
import { UploadsDataItem } from "../entities/uploads";

export type PrimaryAndSecondaryFilesToDelete = {
    primaryFileToDelete: UploadsDataItem | undefined;
    secondaryFileToDelete: UploadsDataItem | undefined;
};

export function getPrimaryAndSecondaryFilesToDelete(
    rowToDelete: UploadsDataItem,
    moduleProperties: Map<string, ModuleDetails>,
    currentModuleName: string,
    allUploads?: UploadsDataItem[]
): PrimaryAndSecondaryFilesToDelete {
    let primaryFileToDelete: UploadsDataItem | undefined, secondaryFileToDelete: UploadsDataItem | undefined;
    if (
        moduleProperties.get(currentModuleName)?.isSecondaryFileApplicable &&
        moduleProperties.get(currentModuleName)?.isSecondaryRelated
    ) {
        //For AMR, Ris file is mandatory, so there will be a ris file with given batch id.
        //Sample file is optional and could be absent
        if (
            rowToDelete.fileType.toLowerCase() ===
            moduleProperties.get(currentModuleName)?.primaryFileType.toLowerCase()
        ) {
            primaryFileToDelete = rowToDelete;
            secondaryFileToDelete = allUploads
                ?.filter(sample => sample.correspondingRisUploadId === rowToDelete.id)
                ?.at(0);
        } else {
            secondaryFileToDelete = rowToDelete;
            primaryFileToDelete = allUploads?.filter(ris => ris.id === rowToDelete.correspondingRisUploadId)?.at(0);
        }
    } else if (!moduleProperties.get(currentModuleName)?.isSecondaryRelated) {
        if (rowToDelete.fileType === moduleProperties.get(currentModuleName)?.primaryFileType) {
            primaryFileToDelete = rowToDelete;
        } else {
            secondaryFileToDelete = rowToDelete;
        }
    } else {
        primaryFileToDelete = rowToDelete;
        secondaryFileToDelete = undefined;
    }

    return {
        primaryFileToDelete: primaryFileToDelete,
        secondaryFileToDelete: secondaryFileToDelete,
    };
}
