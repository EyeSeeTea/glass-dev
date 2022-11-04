import { CustomDataProvider } from "@dhis2/app-runtime";
import { HeaderBar } from "@dhis2/ui";
import { D2ApiOptions } from "@eyeseetea/d2-api/api/types";
import { MuiThemeProvider } from "@material-ui/core/styles";
import React, { useEffect, useState } from "react";
import { getCompositionRoot } from "../../../CompositionRoot";
import { D2Api } from "../../../types/d2-api";
import { AppContext, AppContextState } from "../../contexts/app-context";
import { Router as Root } from "../../pages/Router";
import "./App.css";
import { muiTheme } from "./themes/dhis2.theme";

export interface AppProps {
    apiOptions: D2ApiOptions;
}

const App: React.FC<AppProps> = props => {
    const { apiOptions } = props;
    const [loading, setLoading] = useState(true);
    const [appContext, setAppContext] = useState<AppContextState | null>(null);

    useEffect(() => {
        async function setup() {
            const api = new D2Api({ ...apiOptions, backend: "fetch" });
            const compositionRoot = getCompositionRoot(api);

            setAppContext({ compositionRoot });
            setLoading(false);
        }
        setup();
    }, [apiOptions]);

    if (loading) return null;

    return (
        <MuiThemeProvider theme={muiTheme}>
            <CustomDataProvider data={fakeData}>
                <HeaderBar appName="Skeleton Test POC 1" />
            </CustomDataProvider>

            <div id="app" className="content">
                <AppContext.Provider value={appContext}>
                    <Root />
                </AppContext.Provider>
            </div>
        </MuiThemeProvider>
    );
};

const fakeData = {
    "action::menu/getModules": {
        modules: [],
    },
    me: {
        authorities: ["ALL"],
        email: "john_doe@dhis2.org",
        name: "John Doe",
        settings: {
            keyUiLocale: "en",
        },
    },
    "me/dashboard": {
        unreadInterpretations: 0,
        unreadMessageConversations: 0,
    },
    "systemSettings/applicationTitle": {
        applicationTitle: "EyeSeeTea",
    },
    "systemSettings/helpPageLink": {
        helpPageLink: "",
    },
};

export default React.memo(App);
