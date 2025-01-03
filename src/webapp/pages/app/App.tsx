import { SnackbarProvider } from "@eyeseetea/d2-ui-components";
import { MuiThemeProvider } from "@material-ui/core/styles";
import _ from "lodash";
//@ts-ignore
import OldMuiThemeProvider from "material-ui/styles/MuiThemeProvider";
import React, { useEffect, useState } from "react";
import { appConfig } from "../../../app-config";
import { getCompositionRoot } from "../../../CompositionRoot";
import { Instance } from "../../../data/entities/Instance";
import { D2Api } from "../../../types/d2-api";
import { AppContext, AppContextState } from "../../contexts/app-context";
import { Router } from "../Router";
import "./App.css";
import { AppConfig } from "./AppConfig";
import muiThemeLegacy from "./themes/dhis2-legacy.theme";
import { muiTheme } from "./themes/dhis2.theme";
import sodium from "libsodium-wrappers";

export interface AppProps {
    api: D2Api;
    d2: D2;
    instance: Instance;
}

export const App: React.FC<AppProps> = React.memo(function App({ api, d2, instance }) {
    // const [showShareButton, setShowShareButton] = useState(false);
    const [loading, setLoading] = useState(true);
    const [appContext, setAppContext] = useState<AppContextState | null>(null);

    useEffect(() => {
        const encryptPatientId = async () => {
            await sodium.ready;

            const key = sodium.crypto_secretbox_keygen();
            const base64Key = sodium.to_base64(key);

            const patientId1 = "123456789abcd";
            const encrypted1 = await encryptString(patientId1, base64Key);
            console.log("encrypted1", encrypted1);

            const decrypted1 = await decryptString(encrypted1, base64Key);
            console.log("decrypted1", decrypted1);

            const patientId2 = "123456789abcd";
            const encrypted2 = await encryptString(patientId2, base64Key);
            console.log("encrypted2", encrypted2);

            const decrypted2 = await decryptString(encrypted2, base64Key);
            console.log("decrypted2", decrypted2);

            const patientId3 = "zxy12345--..__";
            const encrypted3 = await encryptString(patientId3, base64Key);
            console.log("encrypted3", encrypted3);

            const decrypted3 = await decryptString(encrypted3, base64Key);
            console.log("decrypted3", decrypted3);

            const patientId4 = "zxy12345--..__";
            const encrypted4 = await encryptString(patientId4, base64Key);
            console.log("encrypted4", encrypted4);

            const decrypted4 = await decryptString(encrypted4, base64Key);
            console.log("decrypted4", decrypted4);
        };

        encryptPatientId();
    }, []);

    useEffect(() => {
        async function setup() {
            const compositionRoot = getCompositionRoot(instance);
            const { data: currentUser } = await compositionRoot.instance.getCurrentUser().runAsync();
            const { data: allCountries } = await compositionRoot.countries.getAll().runAsync();

            if (!currentUser) throw new Error("User not logged in");

            await compositionRoot.glassModules.validate().runAsync();

            // const isShareButtonVisible = _(appConfig).get("appearance.showShareButton") || false;

            setAppContext({ api, currentUser, compositionRoot, instance: instance, allCountries: allCountries ?? [] });
            // setShowShareButton(isShareButtonVisible);
            if (process.env.NODE_ENV !== "production") initFeedbackTool(d2, appConfig);
            setLoading(false);
        }
        setup();
    }, [d2, api, instance]);

    if (loading) return null;

    return (
        <MuiThemeProvider theme={muiTheme}>
            <OldMuiThemeProvider muiTheme={muiThemeLegacy}>
                <SnackbarProvider>
                    {/* <HeaderBar appName="Skeleton App" /> */}

                    <div id="app" className="content">
                        <AppContext.Provider value={appContext}>
                            <Router />
                        </AppContext.Provider>
                    </div>

                    {/* <Share visible={showShareButton} /> */}
                </SnackbarProvider>
            </OldMuiThemeProvider>
        </MuiThemeProvider>
    );
});

type D2 = object;

function initFeedbackTool(d2: D2, appConfig: AppConfig): void {
    const appKey = _(appConfig).get("appKey");

    if (appConfig && appConfig.feedback) {
        const feedbackOptions = {
            ...appConfig.feedback,
            i18nPath: "feedback-tool/i18n",
        };
        window.$.feedbackDhis2(d2, appKey, feedbackOptions);
    }
}

const encryptString = async (input: string, keyBase64: string): Promise<string> => {
    await sodium.ready;

    const key = sodium.from_base64(keyBase64);

    const inputBytes = sodium.from_string(input);

    const nonce = sodium.from_string("123456789012345678901234");

    const encrypted = sodium.crypto_secretbox_easy(inputBytes, nonce, key);

    return sodium.to_base64(nonce) + ":" + sodium.to_base64(encrypted);
};

const decryptString = async (encryptedData: string, keyBase64: string): Promise<string> => {
    await sodium.ready;

    const [nonceBase64, encryptedBase64] = encryptedData.split(":");
    if (!nonceBase64 || !encryptedBase64) throw new Error("Invalid encrypted data");

    const nonce = sodium.from_base64(nonceBase64);
    const encrypted = sodium.from_base64(encryptedBase64);

    const key = sodium.from_base64(keyBase64);

    const decrypted = sodium.crypto_secretbox_open_easy(encrypted, nonce, key);

    return sodium.to_string(decrypted);
};
