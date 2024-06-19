import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { useAppContext } from "../../contexts/app-context";
import { EffectFn, useCallbackEffect } from "../../hooks/use-callback-effect";

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
};

export function useUploadContent(): UploadContentState {
    const { compositionRoot } = useAppContext();
    const [primaryFile, setPrimaryFile] = useState<File | null>(null);
    const [secondaryFile, setSecondaryFile] = useState<File | null>(null);
    const [hasSecondaryFile, setHasSecondaryFile] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [isLoadingPrimary, setIsLoadingPrimary] = useState<boolean>(false);
    const [isLoadingSecondary, setIsLoadingSecondary] = useState<boolean>(false);

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
    };
}
