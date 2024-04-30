import { useCallback, useEffect, useState } from "react";
import { useGlassModule } from "../../hooks/useGlassModule";
import { SpreadsheetXlsxDataSource } from "../../../data/repositories/SpreadsheetXlsxDefaultRepository";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useAppContext } from "../../contexts/app-context";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";
import { useCurrentDataSubmissionId } from "../../hooks/useCurrentDataSubmissionId";
import { useCurrentPeriodContext } from "../../contexts/current-period-context";
import { FileRejection } from "react-dropzone";
import { useCallbackEffect } from "../../hooks/useCallbackEffect";

type ValidatedData = {
    isValid: boolean;
    rows: number;
    specimens: string[];
};

export function useUploadPrimaryFiles(
    batchId: string,
    setPrimaryFile: React.Dispatch<React.SetStateAction<File | null>>
) {
    const { compositionRoot } = useAppContext();
    const module = useGlassModule();
    const {
        currentModuleAccess: { moduleId, moduleName },
    } = useCurrentModuleContext();

    const {
        currentOrgUnitAccess: { orgUnitId, orgUnitCode },
    } = useCurrentOrgUnitContext();
    const { currentPeriod } = useCurrentPeriodContext();

    const dataSubmissionId = useCurrentDataSubmissionId(moduleId, moduleName, orgUnitId, currentPeriod);

    const [validatedPrimaryFileData, setValidatedPrimaryFileData] = useState<ValidatedData | undefined>(undefined);
    const [uploadedFile, setUploadedFile] = useState<File | undefined>(undefined);
    const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (validatedPrimaryFileData && uploadedFile) {
            if (validatedPrimaryFileData.isValid) {
                setPrimaryFile(uploadedFile);
                const primaryFileType = moduleProperties.get(moduleName)?.primaryFileType;
                const data = {
                    batchId,
                    fileType: primaryFileType !== undefined ? primaryFileType : moduleName,
                    dataSubmission: dataSubmissionId,
                    moduleId,
                    moduleName,
                    period: currentPeriod.toString(),
                    orgUnitId: orgUnitId,
                    orgUnitCode: orgUnitCode,
                    rows: validatedPrimaryFileData.rows,
                    specimens: validatedPrimaryFileData.specimens,
                };

                return compositionRoot.glassDocuments.upload({ file: uploadedFile, data }).run(
                    uploadId => {
                        localStorage.setItem("primaryUploadId", uploadId);
                        setIsLoading(false);
                    },
                    () => {
                        setErrorMessage("Error in file upload");
                        setIsLoading(false);
                    }
                );
            } else {
                setErrorMessage("Incorrect File Format. Please retry with a valid file");
                setIsLoading(false);
            }
        }
    }, [
        batchId,
        compositionRoot.glassDocuments,
        currentPeriod,
        dataSubmissionId,
        moduleId,
        moduleName,
        orgUnitCode,
        orgUnitId,
        setPrimaryFile,
        uploadedFile,
        validatedPrimaryFileData,
    ]);

    const onDropPrimaryFile = useCallback(
        async (files: File[], rejections: FileRejection[]) => {
            if (rejections.length > 0) {
                setErrorMessage("Multiple uploads not allowed, please select one file");
            } else {
                const uploadedPrimaryFile = files[0];
                if (uploadedPrimaryFile) {
                    setIsLoading(true);
                    setUploadedFile(uploadedPrimaryFile);
                    if (module.kind === "loaded") {
                        if (module.data.teiColumns && uploadedPrimaryFile) {
                            const data = await validate(
                                uploadedPrimaryFile,
                                module.data.dataColumns,
                                module.data.teiColumns
                            );

                            setValidatedPrimaryFileData(data);
                        } else {
                            setErrorMessage("An error occured in file validation");
                        }
                    }
                }
            }
        },
        [module]
    );

    const onRemoveFiles = useCallback(
        (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
            event.preventDefault();
            setIsLoading(true);
            const primaryUploadId = localStorage.getItem("primaryUploadId");
            if (primaryUploadId) {
                return compositionRoot.glassDocuments.deleteByUploadId(primaryUploadId).run(
                    () => {
                        localStorage.removeItem("primaryUploadId");
                        setPrimaryFile(null);
                        setIsLoading(false);
                    },
                    errorMessage => {
                        setErrorMessage(errorMessage);
                        setPrimaryFile(null);
                        setIsLoading(false);
                    }
                );
            } else {
                setPrimaryFile(null);
                setIsLoading(false);
            }
        },
        [compositionRoot.glassDocuments, setPrimaryFile]
    );

    const onRemoveFilesEffect = useCallbackEffect(onRemoveFiles);

    return {
        onDropPrimaryFile,
        onRemoveFiles: onRemoveFilesEffect,
        errorMessage,
        isLoading,
    };
}

async function validate(
    file: File,
    rawProductDataColumns: string[],
    teiDataColumns: string[]
): Promise<{
    isValid: boolean;
    rows: number;
    specimens: never[];
}> {
    const spreadsheet = await new SpreadsheetXlsxDataSource().read(file);

    const teiSheet = spreadsheet.sheets[0]; //First sheet is tracked entity instance data
    const teiHeaderRow = teiSheet?.rows[0]; //The second row has header details for AMC template.

    const rawProductSheet = spreadsheet.sheets[1]; //Second sheet is raw product level data
    const rawProductHeaderRow = rawProductSheet?.rows[0];

    if (rawProductHeaderRow && teiHeaderRow) {
        const sanitizedRawProductHeaders = Object.values(rawProductHeaderRow).map(header =>
            header.replace(/[* \n\r]/g, "")
        );
        const allRawProductCols = rawProductDataColumns.map(col => sanitizedRawProductHeaders.includes(col));
        const allRawProductColsPresent = _.every(allRawProductCols, c => c === true);

        const sanitizedTEIHeaders = Object.values(teiHeaderRow).map(header => header.replace(/[* \n\r]/g, ""));
        const allTEICols = teiDataColumns.map(col => sanitizedTEIHeaders.includes(col));
        const allTEIColsPresent = _.every(allTEICols, c => c === true);

        return {
            isValid: allRawProductColsPresent && allTEIColsPresent ? true : false,
            rows: teiSheet.rows.length - 1, //one row for header
            specimens: [],
        };
    }

    return {
        isValid: false,
        rows: 0,
        specimens: [],
    };
}
