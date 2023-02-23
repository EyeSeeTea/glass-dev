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
import QuestionnaireForm from "../components/questionnaire/QuestionnaireForm";

export const Router: React.FC = React.memo(() => {
    return (
        <HashRouter>
            <CurrentOrgUnitContextProvider>
                <CurrentModuleContextProvider>
                    <Switch>
                        <Route path="/data-submissions-history/" render={() => <DataSubmissionsHistoryPage />} />
                        <Route path="/current-data-submission/" render={() => <CurrentDataSubmissionPage />} />
                        <Route path="/upload/" render={() => <UploadPage />} />
                        <Route path="/upload-history" render={() => <UploadHistoryPage />} />
                        <Route path="/country-information" render={() => <CountryInformationPage />} />
                        <Route
                            path="/questionnaire"
                            render={() => (
                                <QuestionnaireForm
                                    id="OYc0CihXiSn"
                                    orgUnitId="PdB4jUjgRj6"
                                    year={2022}
                                    onBackClick={console.debug}
                                    onSave={console.debug}
                                    disabled={false}
                                />
                            )}
                        />
                        <Route render={() => <LandingPage />} />
                    </Switch>
                </CurrentModuleContextProvider>
            </CurrentOrgUnitContextProvider>
        </HashRouter>
    );
});
