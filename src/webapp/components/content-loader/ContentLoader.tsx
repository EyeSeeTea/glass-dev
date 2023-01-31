import { Typography } from "@material-ui/core";
import { CircularProgress } from "material-ui";
import React, { ReactNode } from "react";

type loadingStatus = "loading" | "error" | "loaded";

export interface ContentLoaderValue {
    kind: loadingStatus;
    message?: string;
    data?: unknown;
}

export interface ContentLoaderProps {
    content: ContentLoaderValue;
    children: ReactNode;
}

export const ContentLoader: React.FC<ContentLoaderProps> = props => {
    const { content, children } = props;
    
    switch (content.kind) {
        case "loading":
            return <CircularProgress />;
        case "error":
            return <Typography variant="h6">{content.message}</Typography>;
        case "loaded":
            return <>{children}</>;
    }
};
