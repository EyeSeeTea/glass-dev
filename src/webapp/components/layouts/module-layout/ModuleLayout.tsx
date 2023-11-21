import React from "react";

import { MainLayout } from "../main-layout/MainLayout";
import { useGlassModule } from "../../../hooks/useGlassModule";
import { ContentLoader } from "../../content-loader/ContentLoader";
import { useHistory } from "react-router-dom";
import { useCurrentModuleContext } from "../../../contexts/current-module-context";

export const ModuleLayout: React.FC = ({ children }) => {
    const history = useHistory();
    const { resetCurrentModuleAccess } = useCurrentModuleContext();

    const module = useGlassModule();

    const onError = () => {
        resetCurrentModuleAccess();
        history.push("/");
    };

    return (
        <MainLayout>
            <ContentLoader content={module} showErrorAsSnackbar={true} onError={onError}>
                {children}
            </ContentLoader>
        </MainLayout>
    );
};
