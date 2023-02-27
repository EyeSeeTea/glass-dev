import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { Typography } from "@material-ui/core";
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
}

export const ContentLoader: React.FC<ContentLoaderProps> = props => {
    const { content, children, showErrorAsSnackbar } = props;
    const snackbar = useSnackbar();

    useEffect(() => {
        if (content.kind === "error" && showErrorAsSnackbar) {
            snackbar.error(content.message);
        }
    }, [content, snackbar, showErrorAsSnackbar]);

    switch (content.kind) {
        case "loading":
            return <CircularProgress />;
        case "error":
            if (showErrorAsSnackbar) {
                return null;
            } else {
                return <Typography variant="h6">{content.message}</Typography>;
            }

        case "loaded":
            return <>{children}</>;
    }
};
