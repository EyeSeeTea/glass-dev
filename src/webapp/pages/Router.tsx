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

export const Router: React.FC = React.memo(() => {
    return (
        <HashRouter>
            <CurrentOrgUnitContextProvider>
                <CurrentModuleContextProvider>
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
                </CurrentModuleContextProvider>
            </CurrentOrgUnitContextProvider>
        </HashRouter>
    );
});
