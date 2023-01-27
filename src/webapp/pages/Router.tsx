import React from "react";
import { HashRouter, Route, Switch } from "react-router-dom";
import { CallsHistoryPage } from "./calls-history/CallsHistoryPage";
import { CountryInformationPage } from "./country-information/CountryInformationPage";
import { CurrentCallPage } from "./current-call/CurrentCallPage";
import { DataSubmissionPage } from "./data-submission/DataSubmissionPage";
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
                    render={({ match }) => <CurrentCallPage moduleName={match.params.module} />}
                />
                <Route
                    path="/data-submission/:module"
                    render={({ match }) => <DataSubmissionPage moduleName={match.params.module} />}
                />
                <Route
                    path="/data-submissions-history/:module"
                    render={({ match }) => <CallsHistoryPage moduleName={match.params.module} />}
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
