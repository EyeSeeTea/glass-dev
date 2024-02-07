import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { CircularProgress } from "material-ui";
import React, { ReactNode, useEffect } from "react";

type loadingStatus = "loading" | "error" | "loaded";

export interface ContentLoaderValue {
    kind: loadingStatus;
    message?: string;
    data?: unknown;
}

export interface ContentLoaderProps {
    content: ContentLoaderValue;
    children: ReactNode;
    showErrorAsSnackbar?: boolean;
    onError?: () => void;
}

export const ContentLoader: React.FC<ContentLoaderProps> = ({ content, children, showErrorAsSnackbar, onError }) => {
    const snackbar = useSnackbar();

    useEffect(() => {
        if (content.kind === "error" && showErrorAsSnackbar) {
            snackbar.error(content.message);
        }

        if (content.kind === "error" && onError) {
            onError();
        }
    }, [content, snackbar, showErrorAsSnackbar, onError]);

    switch (content.kind) {
        case "loading":
            return <CircularProgress />;
        case "error":
            if (showErrorAsSnackbar) {
                return null;
            } else {
                return <>{children}</>;
            }
        case "loaded":
            return <>{children}</>;
    }
};
