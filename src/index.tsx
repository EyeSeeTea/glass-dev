import { App } from "./webapp/pages/app/App";

import ReactDOM from "react-dom";

async function main() {
    try {
        const baseUrl = await getBaseUrl();
        const [username = "", password = ""] = (process.env.REACT_APP_DHIS2_AUTH || "").split(":");
        const auth = { username, password };
        const apiOptions = { baseUrl, auth };
        ReactDOM.render(<App apiOptions={apiOptions} />, document.getElementById("root"));
    } catch (err: any) {
        console.error(err);
        const message = err.toString();
        ReactDOM.render(<div>{message}</div>, document.getElementById("root"));
    }
}

async function getBaseUrl() {
    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
        const baseUrl = process.env.REACT_APP_DHIS2_BASE_URL;
        if (!baseUrl) throw new Error("REACT_APP_DHIS2_BASE_URL not set");
        return baseUrl;
    } else {
        const manifest: Manifest = await fetch("manifest.webapp").then(res => res.json());
        return manifest.activities.dhis.href;
    }
}

interface Manifest {
    activities: { dhis: { href: string } };
}

main();

