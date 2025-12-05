import React, { useCallback, useEffect, useMemo, useState } from "react";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import _ from "lodash";

import { GlassUploads } from "../../../domain/entities/GlassUploads";
import { useAppContext } from "../../contexts/app-context";
import { Maybe } from "../../../types/utils";
import { isPrimaryFileType, isSecondaryFileType, ModuleDetails } from "../../../domain/utils/ModuleProperties";

const UPLOADED_STATUS = "uploaded";

type UsePreviousDataSubmissionsProps = {
    currentModuleProperties: Maybe<ModuleDetails>;
    batchId: string;
    setBatchId: React.Dispatch<React.SetStateAction<string>>;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
    uploadFileType: Maybe<string>;
    currentPeriod: string;
    orgUnitId: string;
};

export function useBatchedDataSubmissions(props: UsePreviousDataSubmissionsProps) {
    const { currentModuleProperties, batchId, setBatchId, uploadFileType, currentPeriod, orgUnitId, setLoading } =
        props;

    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();

    const [allValidDataSubmissionUploads, setAllValidDataSubmissionUploads] = useState<GlassUploads[]>([]);
    const [fetchingPreviousUploads, setFetchingPreviousUploads] = useState<boolean>(true);

    const uploadsByBatchId = useMemo(() => {
        return _(allValidDataSubmissionUploads)
            .groupBy(upload => upload.batchId)
            .mapValues(uploads => {
                const primary = uploads.find(upload => isPrimaryFileType(upload.fileType));
                const secondary = uploads.find(upload => isSecondaryFileType(upload.fileType));
                return { primary, secondary };
            })
            .value();
    }, [allValidDataSubmissionUploads]);

    const previousUploadBatches = useMemo(
        () =>
            Object.entries(uploadsByBatchId).map<PreviousUploadBatches>(([batchId, files]) => {
                const fileTypes = _([files.primary?.fileType, files.secondary?.fileType]).compact().value();
                return {
                    batchId,
                    files: fileTypes.length > 0 ? fileTypes : undefined,
                };
            }),
        [uploadsByBatchId]
    );

    const datasetOptions = useMemo(
        () =>
            datasetDropdownOptions.map(option => {
                const uploads = uploadsByBatchId[option.value];
                if (!uploads) return option;

                const disabled = currentModuleProperties?.isSecondaryRelated
                    ? Boolean(uploads.primary)
                    : Boolean(uploads);
                return {
                    ...option,
                    disabled,
                };
            }),
        [currentModuleProperties, uploadsByBatchId]
    );

    const showSecondary = useMemo(() => {
        const isSecondaryFileApplicable = currentModuleProperties?.isSecondaryRelated;
        const uploads = uploadsByBatchId[batchId];
        if (!uploads) return isSecondaryFileApplicable;

        return isSecondaryFileApplicable && !uploads.secondary;
    }, [currentModuleProperties, uploadsByBatchId, batchId]);

    const changeBatchId = useCallback(
        async (event: React.ChangeEvent<{ value: unknown }>) => {
            const batchId = event.target.value as string;
            const primaryUploadId = localStorage.getItem("primaryUploadId");
            const secondaryUploadId = localStorage.getItem("secondaryUploadId");
            setBatchId(batchId);

            const upload = (id: string, type: "primary" | "secondary") =>
                compositionRoot.glassUploads.setBatchId({ id, batchId }).mapError(() => {
                    console.debug(`error occurred while updating batch id to ${type} upload in datastore`);
                    setLoading(false);
                });

            if (primaryUploadId) {
                setLoading(true);
                upload(primaryUploadId, "primary").run(
                    () => {
                        if (secondaryUploadId) {
                            upload(secondaryUploadId, "secondary").run(
                                () => setLoading(false),
                                () => {}
                            );
                        } else setLoading(false);
                    },
                    () => {}
                );
            } else if (secondaryUploadId) {
                setLoading(true);
                upload(secondaryUploadId, "secondary").run(
                    () => setLoading(false),
                    () => {}
                );
            }
        },
        [compositionRoot.glassUploads, setLoading, setBatchId]
    );

    useEffect(() => {
        if (
            currentModuleProperties?.isbatchReq ||
            (currentModuleProperties?.isExternalSecondaryFile &&
                uploadFileType === currentModuleProperties.secondaryFileType)
        ) {
            setFetchingPreviousUploads(true);

            compositionRoot.glassUploads.getAMRUploadsForCurrentDataSubmission(orgUnitId, currentPeriod).run(
                uploads => {
                    setAllValidDataSubmissionUploads(
                        uploads.filter(
                            upload => upload.status.toLowerCase() !== UPLOADED_STATUS && upload.batchId !== ""
                        )
                    );
                    setFetchingPreviousUploads(false);
                },
                () => {
                    snackbar.error(i18n.t("Error fetching previous uploads."));
                    setFetchingPreviousUploads(false);
                }
            );
        } else {
            setFetchingPreviousUploads(false);
        }
    }, [compositionRoot.glassUploads, snackbar, currentPeriod, orgUnitId, currentModuleProperties, uploadFileType]);

    useEffect(() => {
        const firstSelectableBatchId = datasetDropdownOptions.find(
            ({ value }) => !previousUploadBatches.some(batch => batch.batchId === value)
        )?.value;
        setBatchId(firstSelectableBatchId || "");
    }, [previousUploadBatches, setBatchId]);

    return {
        changeBatchId,
        previousUploadBatches,
        fetchingPreviousUploads,
        datasetOptions,
        showSecondary,
    };
}

type PreviousUploadBatches = { batchId: string; files?: string[] };
export type DatasetOptions = { label: string; value: string; disabled?: boolean };

const datasetDropdownOptions: DatasetOptions[] = [
    {
        label: "Dataset 1",
        value: "DS1",
    },
    {
        label: "Dataset 2",
        value: "DS2",
    },
    {
        label: "Dataset 3",
        value: "DS3",
    },
    {
        label: "Dataset 4",
        value: "DS4",
    },
    {
        label: "Dataset 5",
        value: "DS5",
    },
    {
        label: "Dataset 6",
        value: "DS6",
    },
];
