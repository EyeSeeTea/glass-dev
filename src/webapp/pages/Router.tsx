import React from "react";
import { HashRouter, Route, Switch } from "react-router-dom";
import { DataSubmissionsHistoryPage } from "./data-submissions-history/DataSubmissionsHistoryPage";
import { CountryInformationPage } from "./country-information/CountryInformationPage";
import { CurrentDataSubmissionPage } from "./current-data-submission/CurrentDataSubmissionPage";
import { UploadPage } from "./upload/UploadPage";
import { LandingPage } from "./landing/LandingPage";
import { DataFileHistoryPage } from "./data-file-history/DataFileHistoryPage";
import { UserProfilePage } from "./user-profile/UserProfilePage";
import { CurrentOrgUnitContextProvider } from "../context-providers/CurrentOrgUnitContextProvider";
import { CurrentModuleContextProvider } from "../context-providers/CurrentModuleContextProvider";
import { PrivateRoute } from "../components/private-route/PrivateRoute";
import { QuestionnaireFormTest } from "../components/questionnaire/QuestionnaireFormTest";
import { CurrentPeriodContextProvider } from "../context-providers/CurrentPeriodContextProvider";
import { MainLayout } from "../components/layouts/main-layout/MainLayout";
import { ReportsPage } from "./reports/ReportsPage";
import { UserSettingsPage } from "./user-profile/UserSettings";
import { SignalsPage } from "./signals/SignalsPage";
import { NewSignalPage } from "./new-signal/NewSignalPage";
import { SignalPage } from "./new-signal/SignalPage";

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
                                    path="/data-file-history"
                                    render={({ location }) => (
                                        <PrivateRoute pathname={location.pathname}>
                                            <DataFileHistoryPage />
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
                                <Route
                                    path="/user-profile"
                                    render={({ location }) => (
                                        <PrivateRoute pathname={location.pathname}>
                                            <UserProfilePage />
                                        </PrivateRoute>
                                    )}
                                />
                                <Route
                                    path="/user-settings"
                                    render={({ location }) => (
                                        <PrivateRoute pathname={location.pathname}>
                                            <UserSettingsPage />
                                        </PrivateRoute>
                                    )}
                                />
                                <Route
                                    path="/signals"
                                    render={({ location }) => (
                                        <PrivateRoute pathname={location.pathname}>
                                            <SignalsPage />
                                        </PrivateRoute>
                                    )}
                                />
                                <Route
                                    path="/new-signal"
                                    render={({ location }) => (
                                        <PrivateRoute pathname={location.pathname}>
                                            <NewSignalPage />
                                        </PrivateRoute>
                                    )}
                                />

                                <Route
                                    path="/signal/:id"
                                    render={({ location }) => (
                                        <PrivateRoute pathname={location.pathname}>
                                            <SignalPage />
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
