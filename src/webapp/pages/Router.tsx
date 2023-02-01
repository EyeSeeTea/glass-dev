import React from "react";
import { HashRouter, Route, Switch } from "react-router-dom";
import { DataSubmissionsHistoryPage } from "./data-submissions-history/DataSubmissionsHistoryPage";
import { CountryInformationPage } from "./country-information/CountryInformationPage";
import { CurrentDataSubmissionPage } from "./current-data-submission/CurrentDataSubmissionPage";
import { UploadPage } from "./upload/UploadPage";
import { FakeLandingPage } from "./landing/FakeLandingPage";
import { UploadHistoryPage } from "./upload-history/UploadHistoryPage";

export const Router: React.FC = React.memo(() => {
    return (
        <HashRouter>
            <Switch>
                {/* <Route
                    path="/for/:name?"
                    render={({ match }) => <ExamplePage name={match.params.name ?? "Stranger"} />}
                />

          
                <Route render={() => <LandingPage />} /> */}

                {/* Default route */}
                <Route
                    path="/current-data-submission/:module"
                    render={({ match }) => <CurrentDataSubmissionPage moduleName={match.params.module} />}
                />
                <Route path="/upload/:module" render={({ match }) => <UploadPage moduleName={match.params.module} />} />
                <Route
                    path="/data-submissions-history/:module"
                    render={({ match }) => <DataSubmissionsHistoryPage moduleName={match.params.module} />}
                />
                <Route
                    path="/upload-history/:module"
                    render={({ match }) => <UploadHistoryPage moduleName={match.params.module} />}
                />
                <Route
                    path="/country-information/:module"
                    render={({ match }) => <CountryInformationPage moduleName={match.params.module} />}
                />

                <Route render={() => <FakeLandingPage />} />
            </Switch>
        </HashRouter>
    );
});
