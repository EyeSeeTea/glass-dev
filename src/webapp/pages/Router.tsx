import React from "react";
import { HashRouter, Route, Switch } from "react-router-dom";
import { DataSubmissionsHistoryPage } from "./data-submissions-history/DataSubmissionsHistoryPage";
import { CountryInformationPage } from "./country-information/CountryInformationPage";
import { CurrentDataSubmissionPage } from "./current-data-submission/CurrentDataSubmissionPage";
import { UploadPage } from "./upload/UploadPage";
import { LandingPage } from "./landing/LandingPage";
import { UploadHistoryPage } from "./upload-history/UploadHistoryPage";
import { CurrentOrgUnitContextProvider } from "../context-providers/CurrentOrgUnitContextProvider";
import { CurrentModuleContextProvider } from "../context-providers/CurrentModuleContextProvider";
import { PrivateRoute } from "../components/private-route/PrivateRoute";
import { QuestionnaireFormTest } from "../components/questionnaire/QuestionnaireFormTest";
import { CurrentPeriodContextProvider } from "../context-providers/CurrentPeriodContextProvider";
import { MainLayout } from "../components/layouts/main-layout/MainLayout";
import { ReportsPage } from "./reports/ReportsPage";

export const Router: React.FC = React.memo(() => {
    return (
        <HashRouter>
            <CurrentOrgUnitContextProvider>
                <CurrentModuleContextProvider>
                    <CurrentPeriodContextProvider>
                        <MainLayout>
                            <Switch>
                                <Route
                                    path="/data-submissions-history/"
                                    render={({ location }) => (
                                        <PrivateRoute pathname={location.pathname}>
                                            <DataSubmissionsHistoryPage />
                                        </PrivateRoute>
                                    )}
                                />
                                <Route
                                    path="/current-data-submission/"
                                    render={({ location }) => (
                                        <PrivateRoute pathname={location.pathname}>
                                            <CurrentDataSubmissionPage />
                                        </PrivateRoute>
                                    )}
                                />
                                <Route
                                    path="/reports/"
                                    render={({ location }) => (
                                        <PrivateRoute pathname={location.pathname}>
                                            <ReportsPage />
                                        </PrivateRoute>
                                    )}
                                />
                                <Route
                                    path="/upload/"
                                    render={({ location }) => (
                                        <PrivateRoute pathname={location.pathname}>
                                            <UploadPage />
                                        </PrivateRoute>
                                    )}
                                />
                                <Route
                                    path="/upload-history"
                                    render={({ location }) => (
                                        <PrivateRoute pathname={location.pathname}>
                                            <UploadHistoryPage />
                                        </PrivateRoute>
                                    )}
                                />
                                <Route
                                    path="/country-information"
                                    render={({ location }) => (
                                        <PrivateRoute pathname={location.pathname}>
                                            <CountryInformationPage />
                                        </PrivateRoute>
                                    )}
                                />
                                <Route
                                    path="/questionnaire"
                                    render={({ location }) => (
                                        <PrivateRoute pathname={location.pathname}>
                                            <QuestionnaireFormTest />
                                        </PrivateRoute>
                                    )}
                                />
                                <Route render={() => <LandingPage />} />
                            </Switch>
                        </MainLayout>
                    </CurrentPeriodContextProvider>
                </CurrentModuleContextProvider>
            </CurrentOrgUnitContextProvider>
        </HashRouter>
    );
});
