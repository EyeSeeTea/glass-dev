import React from "react";
import { HashRouter, Route, Switch } from "react-router-dom";
import { DataSubmissionsHistoryPage } from "./data-submissions-history/DataSubmissionsHistoryPage";
import { CountryInformationPage } from "./country-information/CountryInformationPage";
import { CurrentDataSubmissionPage } from "./current-data-submission/CurrentDataSubmissionPage";
import { UploadPage } from "./upload/UploadPage";
import { LandingPage } from "./landing/LandingPage";
import { UploadHistoryPage } from "./upload-history/UploadHistoryPage";

export const Router: React.FC = React.memo(() => {
    return (
        <HashRouter>
            <Switch>
                <Route path="/data-submissions-history/" render={() => <DataSubmissionsHistoryPage />} />
                <Route path="/current-data-submission/" render={() => <CurrentDataSubmissionPage />} />
                <Route path="/upload/" render={() => <UploadPage />} />
                <Route path="/upload-history" render={() => <UploadHistoryPage />} />
                <Route path="/country-information" render={() => <CountryInformationPage />} />
                <Route render={() => <LandingPage />} />
            </Switch>
        </HashRouter>
    );
});
