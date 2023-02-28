import React from "react";

import { MainLayout } from "../main-layout/MainLayout";
import { useGlassModule } from "../../../hooks/useGlassModule";
import { useAppContext } from "../../../contexts/app-context";
import { ContentLoader } from "../../content-loader/ContentLoader";

export const ModuleLayout: React.FC = ({ children }) => {
    const { compositionRoot } = useAppContext();

    const module = useGlassModule(compositionRoot);

    return (
        <MainLayout>
            <ContentLoader content={module} showErrorAsSnackbar={true}>
                {children}
            </ContentLoader>
        </MainLayout>
    );
};
