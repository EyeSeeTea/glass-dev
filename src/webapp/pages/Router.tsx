import React from "react";
import { HashRouter, Route, Switch } from "react-router-dom";
import { FakeCurrentCallPage } from "./landing/FakeCurrentCallPage";
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
                <Route render={() => <FakeLandingPage />} />
                <Route path="/current-call" render={() => <FakeCurrentCallPage />} />

            </Switch>
        </HashRouter>
    );
});
