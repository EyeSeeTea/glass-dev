import React from "react";
import { HashRouter, Route, Switch } from "react-router-dom";
import { CurrentCallPage } from "./current-call/CurrentCallPage";
import { DataSubmissionPage } from "./data-submission/DataSubmissionPage";
import { FakeLandingPage } from "./landing/FakeLandingPage";

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
                    path="/current-call/:module"
                    render={({ match }) => <CurrentCallPage moduleName={match.params.module} />}
                />
                <Route
                    path="/data-submission/:module"
                    render={({ match }) => <DataSubmissionPage moduleName={match.params.module} />}
                />

                <Route render={() => <FakeLandingPage />} />
            </Switch>
        </HashRouter>
    );
});
