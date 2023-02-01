import React from "react";
import { HashRouter, Route, Switch } from "react-router-dom";
import { CallsHistoryPage } from "./calls-history/CallsHistoryPage";
import { CountryInformationPage } from "./country-information/CountryInformationPage";
import { CurrentCallPage } from "./current-call/CurrentCallPage";
import { DataSubmissionPage } from "./data-submission/DataSubmissionPage";
import { LandingPage } from "./landing/LandingPage";
import { UploadHistoryPage } from "./upload-history/UploadHistoryPage";

export const Router: React.FC = React.memo(() => {
    return (
        <HashRouter>
            <Switch>
                <Route path="/calls-history/" render={() => <CallsHistoryPage />} />

                <Route path="/current-call/" render={() => <CurrentCallPage />} />
                <Route path="/data-submission/" render={() => <DataSubmissionPage />} />

                <Route path="/upload-history" render={() => <UploadHistoryPage />} />
                <Route path="/country-information" render={() => <CountryInformationPage />} />

                <Route render={() => <LandingPage />} />
            </Switch>
        </HashRouter>
    );
});
