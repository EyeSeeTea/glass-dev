import React from "react";
import { HashRouter, Route, Switch } from "react-router-dom";
import { DataSubmissionsHistoryPage } from "./data-submissions-history/DataSubmissionsHistoryPage";
import { CountryInformationPage } from "./country-information/CountryInformationPage";
import { CurrentDataSubmissionPage } from "./current-data-submission/CurrentDataSubmissionPage";
import { UploadPage } from "./upload/UploadPage";
import { LandingPage } from "./landing/LandingPage";
import { UploadHistoryPage } from "./upload-history/UploadHistoryPage";
import { UserAccessContextProvider } from "../context-providers/CurrentAccessContextProvider";
import { GlobalQueryParamHandler } from "../components/global-query-param/GlobalQueryParamHandler";

export const Router: React.FC = React.memo(() => {
    return (
        <HashRouter>
            <UserAccessContextProvider>
                <Switch>
                    <Route
                        path="/data-submissions-history/"
                        render={() => (
                            <GlobalQueryParamHandler>
                                <DataSubmissionsHistoryPage />
                            </GlobalQueryParamHandler>
                        )}
                    />
                    <Route
                        path="/current-data-submission/"
                        render={() => (
                            <GlobalQueryParamHandler>
                                <CurrentDataSubmissionPage />
                            </GlobalQueryParamHandler>
                        )}
                    />
                    <Route
                        path="/upload/"
                        render={() => (
                            <GlobalQueryParamHandler>
                                <UploadPage />
                            </GlobalQueryParamHandler>
                        )}
                    />
                    <Route
                        path="/upload-history"
                        render={() => (
                            <GlobalQueryParamHandler>
                                <UploadHistoryPage />
                            </GlobalQueryParamHandler>
                        )}
                    />
                    <Route
                        path="/country-information"
                        render={() => (
                            <GlobalQueryParamHandler>
                                <CountryInformationPage />
                            </GlobalQueryParamHandler>
                        )}
                    />
                    <Route
                        render={() => (
                            <GlobalQueryParamHandler>
                                <LandingPage />
                            </GlobalQueryParamHandler>
                        )}
                    />
                </Switch>
            </UserAccessContextProvider>
        </HashRouter>
    );
});
