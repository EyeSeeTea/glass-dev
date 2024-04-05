import { useCallback, useState } from "react";
import { moduleProperties } from "../../../../domain/utils/ModuleProperties";
import { useCurrentModuleContext } from "../../../contexts/current-module-context";
import { useAppContext } from "../../../contexts/app-context";
import { useCurrentOrgUnitContext } from "../../../contexts/current-orgUnit-context";
import { useCurrentPeriodContext } from "../../../contexts/current-period-context";

import { Future } from "../../../../domain/entities/Future";
import { ImportSummary } from "../../../../domain/entities/data-entry/ImportSummary";

export function useFileSubmission(
    changeStep: (step: number) => void,
    primaryFile: File | null,
    secondaryFile: File | null,
    batchId: string,
    setPrimaryFileImportSummary: React.Dispatch<React.SetStateAction<ImportSummary | undefined>>,
    setSecondaryFileImportSummary: React.Dispatch<React.SetStateAction<ImportSummary | undefined>>
) {
    const { compositionRoot } = useAppContext();
    const {
        currentModuleAccess: { moduleName },
    } = useCurrentModuleContext();
    const { currentPeriod } = useCurrentPeriodContext();
    const {
        currentOrgUnitAccess: { orgUnitId, orgUnitName, orgUnitCode },
    } = useCurrentOrgUnitContext();
    const currentModuleProperties = moduleProperties.get(moduleName);

    const [hasSecondaryFile, setHasSecondaryFile] = useState<boolean>(secondaryFile ? true : false);
    const [importLoading, setImportLoading] = useState<boolean>(false);
    const [uploadFileType, setUploadFileType] = useState(
        secondaryFile ? currentModuleProperties?.secondaryFileType : currentModuleProperties?.primaryFileType
    );

    const changeFileType = (event: React.ChangeEvent<{ value: unknown }>) => {
        const fileType = event.target.value as string;
        setUploadFileType(fileType);
    };

    const uploadPrimaryAndSecondaryFile = useCallback(
        (primaryFile: File) => {
            setImportLoading(true);

            Future.joinObj({
                importPrimaryFileSummary: compositionRoot.fileSubmission.primaryFile(
                    moduleName,
                    primaryFile,
                    batchId,
                    currentPeriod,
                    "CREATE_AND_UPDATE",
                    orgUnitId,
                    orgUnitName,
                    orgUnitCode,
                    true,
                    ""
                ),
                importSecondaryFileSummary: secondaryFile
                    ? compositionRoot.fileSubmission.secondaryFile(
                          secondaryFile,
                          batchId,
                          moduleName,
                          currentPeriod,
                          "CREATE_AND_UPDATE",
                          orgUnitId,
                          orgUnitName,
                          orgUnitCode,
                          true,
                          ""
                      )
                    : Future.success(undefined),
            }).run(
                ({ importPrimaryFileSummary, importSecondaryFileSummary }) => {
                    setPrimaryFileImportSummary(importPrimaryFileSummary);

                    if (importSecondaryFileSummary) {
                        setSecondaryFileImportSummary(importSecondaryFileSummary);
                    }

                    const primaryUploadId = localStorage.getItem("primaryUploadId");

                    if (primaryUploadId) {
                        const secondaryUploadId = localStorage.getItem("secondaryUploadId");

                        const params = secondaryUploadId
                            ? {
                                  primaryUploadId,
                                  primaryImportSummaryErrors: {
                                      nonBlockingErrors: importPrimaryFileSummary?.nonBlockingErrors || [],
                                      blockingErrors: importPrimaryFileSummary?.blockingErrors || [],
                                  },
                                  secondaryUploadId,
                                  secondaryImportSummaryErrors: {
                                      nonBlockingErrors: importSecondaryFileSummary?.nonBlockingErrors || [],
                                      blockingErrors: importSecondaryFileSummary?.blockingErrors || [],
                                  },
                              }
                            : {
                                  primaryUploadId,
                                  primaryImportSummaryErrors: {
                                      nonBlockingErrors: importPrimaryFileSummary?.nonBlockingErrors || [],
                                      blockingErrors: importPrimaryFileSummary?.blockingErrors || [],
                                  },
                              };

                        compositionRoot.glassUploads.saveImportSummaryErrorsOfFiles(params).run(
                            () => {},
                            () => {}
                        );
                    }

                    setImportLoading(false);
                    changeStep(2);
                },
                error => {
                    setPrimaryFileImportSummary({
                        status: "ERROR",
                        importCount: { ignored: 0, imported: 0, deleted: 0, updated: 0 },
                        nonBlockingErrors: [],
                        blockingErrors: [{ error: error, count: 1 }],
                    });
                    setImportLoading(false);
                    changeStep(2);
                }
            );
        },
        [
            batchId,
            changeStep,
            compositionRoot,
            currentPeriod,
            moduleName,
            orgUnitCode,
            orgUnitId,
            orgUnitName,
            secondaryFile,
            setPrimaryFileImportSummary,
            setSecondaryFileImportSummary,
        ]
    );

    const uploadSecondaryFile = useCallback(
        (secondaryFile: File) => {
            setImportLoading(true);
            compositionRoot.fileSubmission
                .secondaryFile(
                    secondaryFile,
                    batchId,
                    moduleName,
                    currentPeriod,
                    "CREATE_AND_UPDATE",
                    orgUnitId,
                    orgUnitName,
                    orgUnitCode,
                    true,
                    ""
                )
                .run(
                    importSubstanceFileSummary => {
                        if (importSubstanceFileSummary) {
                            setPrimaryFileImportSummary(importSubstanceFileSummary);
                        }
                        setImportLoading(false);
                        changeStep(2);
                    },
                    error => {
                        setPrimaryFileImportSummary({
                            status: "ERROR",
                            importCount: { ignored: 0, imported: 0, deleted: 0, updated: 0 },
                            nonBlockingErrors: [],
                            blockingErrors: [{ error: error, count: 1 }],
                        });
                        setImportLoading(false);
                        changeStep(2);
                    }
                );
        },
        [
            batchId,
            changeStep,
            compositionRoot,
            currentPeriod,
            moduleName,
            orgUnitCode,
            orgUnitId,
            orgUnitName,
            setPrimaryFileImportSummary,
        ]
    );

    const uploadFileSubmissions = useCallback(() => {
        if (primaryFile) {
            uploadPrimaryAndSecondaryFile(primaryFile);
        } //secondary file upload only
        else if (secondaryFile) {
            uploadSecondaryFile(secondaryFile);
        }
    }, [primaryFile, secondaryFile, uploadPrimaryAndSecondaryFile, uploadSecondaryFile]);

    const continueClick = () => {
        if (!hasSecondaryFile) {
            localStorage.removeItem("secondaryUploadId");
            uploadFileSubmissions();
        } else if (!moduleProperties.get(moduleName)?.isSecondaryRelated) {
            uploadFileSubmissions();
        }
        //update the secondary file with primary file upload id.
        else {
            setImportLoading(true);
            const primaryUploadId = localStorage.getItem("primaryUploadId");
            const secondaryUploadId = localStorage.getItem("secondaryUploadId");
            if (secondaryUploadId && primaryUploadId)
                compositionRoot.glassDocuments.updateSecondaryFileWithPrimaryId(secondaryUploadId, primaryUploadId).run(
                    () => {
                        uploadFileSubmissions();
                    },
                    () => {
                        console.debug("Error updating datastore");
                    }
                );
        }
    };

    return {
        changeFileType,
        continueClick,
        uploadFileType,
        setHasSecondaryFile,
        importLoading,
    };
}
