import React from "react";
import { LandingContent } from "../../components/landing-content/LandingContent";
import { MainLayout } from "../../components/main-layout/MainLayout";

export const LandingPage: React.FC = React.memo(() => {
    return (
        <MainLayout>
            <LandingContent />
        </MainLayout>
    );
});
