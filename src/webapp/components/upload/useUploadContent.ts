import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { useAppContext } from "../../contexts/app-context";
import { EffectFn, useCallbackEffect } from "../../hooks/use-callback-effect";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useCurrentPeriodContext } from "../../contexts/current-period-context";
import { useCurrentDataSubmissionId } from "../../hooks/useCurrentDataSubmissionId";
import { Maybe } from "../../../utils/ts-utils";

export type UploadContentState = {
    errorMessage: string;
    isLoadingPrimary: boolean;
    setIsLoadingSecondary: Dispatch<SetStateAction<boolean>>;
    isLoadingSecondary: boolean;
    setIsLoadingPrimary: Dispatch<SetStateAction<boolean>>;
    primaryFile: File | null;
    setPrimaryFile: Dispatch<SetStateAction<File | null>>;
    secondaryFile: File | null;
    setSecondaryFile: (maybeFile: File | null) => void;
    hasSecondaryFile: boolean;
    setHasSecondaryFile: Dispatch<SetStateAction<boolean>>;
    removePrimaryFile: EffectFn<[event: React.MouseEvent<HTMLButtonElement, MouseEvent>]>;
    removeSecondaryFile: EffectFn<[event: React.MouseEvent<HTMLButtonElement, MouseEvent>]>;
    dataSubmissionId: string | undefined;
    isRunningCalculation: boolean;
    setIsRunningCalculation: Dispatch<SetStateAction<boolean>>;
    setPrimaryFileTotalRows: React.Dispatch<React.SetStateAction<Maybe<number>>>;
    primaryFileTotalRows: Maybe<number>;
    setSecondaryFileTotalRows: React.Dispatch<React.SetStateAction<Maybe<number>>>;
    secondaryFileTotalRows: Maybe<number>;
};

export function useUploadContent(): UploadContentState {
    const { compositionRoot } = useAppContext();
    const {
        currentModuleAccess: { moduleId, moduleName },
    } = useCurrentModuleContext();
    const {
        currentOrgUnitAccess: { orgUnitId },
    } = useCurrentOrgUnitContext();

    const { currentPeriod } = useCurrentPeriodContext();
    const dataSubmissionId = useCurrentDataSubmissionId(moduleId, moduleName, orgUnitId, currentPeriod);

    const [primaryFile, setPrimaryFile] = useState<File | null>(null);
    const [secondaryFile, setSecondaryFile] = useState<File | null>(null);
    const [hasSecondaryFile, setHasSecondaryFile] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [isLoadingPrimary, setIsLoadingPrimary] = useState<boolean>(false);
    const [isLoadingSecondary, setIsLoadingSecondary] = useState<boolean>(false);
    const [isRunningCalculation, setIsRunningCalculation] = useState<boolean>(false);
    const [primaryFileTotalRows, setPrimaryFileTotalRows] = useState<number | undefined>(undefined);
    const [secondaryFileTotalRows, setSecondaryFileTotalRows] = useState<number | undefined>(undefined);

    const onSetSecondaryFile = useCallback((maybeFile: File | null) => {
        setSecondaryFile(maybeFile);
        setHasSecondaryFile(maybeFile ? true : false);
    }, []);

    const onRemovePrimaryFile = useCallback(
        (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
            event.preventDefault();
            setIsLoadingPrimary(true);
            const primaryUploadId = localStorage.getItem("primaryUploadId");
            if (primaryUploadId) {
                return compositionRoot.glassDocuments.deleteByUploadId(primaryUploadId).run(
                    () => {
                        localStorage.removeItem("primaryUploadId");
                        setPrimaryFile(null);
                        setIsLoadingPrimary(false);
                    },
                    errorMessage => {
                        setErrorMessage(errorMessage);
                        setPrimaryFile(null);
                        setIsLoadingPrimary(false);
                    }
                );
            } else {
                setPrimaryFile(null);
                setIsLoadingPrimary(false);
            }
        },
        [compositionRoot.glassDocuments]
    );

    const onRemoveSecondaryFile = useCallback(
        (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
            event.preventDefault();
            setIsLoadingSecondary(true);
            const sampleUploadId = localStorage.getItem("secondaryUploadId");
            if (sampleUploadId) {
                return compositionRoot.glassDocuments.deleteByUploadId(sampleUploadId).run(
                    () => {
                        localStorage.removeItem("secondaryUploadId");
                        onSetSecondaryFile(null);
                        setIsLoadingSecondary(false);
                    },
                    errorMessage => {
                        setErrorMessage(errorMessage);
                        onSetSecondaryFile(null);
                        setIsLoadingSecondary(false);
                    }
                );
            } else {
                onSetSecondaryFile(null);
                setIsLoadingSecondary(false);
            }
        },
        [compositionRoot.glassDocuments, onSetSecondaryFile]
    );

    const removePrimaryFile = useCallbackEffect(onRemovePrimaryFile);
    const removeSecondaryFile = useCallbackEffect(onRemoveSecondaryFile);

    return {
        errorMessage,
        isLoadingPrimary,
        setIsLoadingPrimary,
        isLoadingSecondary,
        setIsLoadingSecondary,
        primaryFile,
        setPrimaryFile,
        removePrimaryFile,
        secondaryFile,
        setSecondaryFile: onSetSecondaryFile,
        removeSecondaryFile,
        hasSecondaryFile,
        setHasSecondaryFile,
        dataSubmissionId,
        isRunningCalculation,
        setIsRunningCalculation,
        setPrimaryFileTotalRows,
        primaryFileTotalRows,
        setSecondaryFileTotalRows,
        secondaryFileTotalRows,
    };
}
