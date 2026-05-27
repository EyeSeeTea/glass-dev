import _ from "lodash";
import { Instance } from "../data/entities/Instance";
import { D2Api } from "../types/d2-api";

export function getMajorVersion(version: string): number {
    const apiVersion = _.get(version.split("."), 1);
    if (!apiVersion) throw new Error(`Invalid version: ${version}`);
    return Number(apiVersion);
}

export function getD2APiFromInstance(instance: Instance): D2Api {
    if (instance.token) {
        // Dummy auth forces credentials:"omit"; ApiToken header overrides Basic auth (extraHeaders win in FetchHttpClientRepository)
        const api = new D2Api({ baseUrl: instance.url, auth: { username: "_", password: "_" }, backend: "fetch" });
        patchWithApiToken(api.baseConnection, instance.token);
        patchWithApiToken(api.apiConnection, instance.token);
        return api;
    }
    return new D2Api({ baseUrl: instance.url, auth: instance.auth, backend: "fetch" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function patchWithApiToken(connection: any, token: string): void {
    const original = connection.request.bind(connection);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connection.request = (options: any) =>
        original({ ...options, headers: { ...options.headers, Authorization: `ApiToken ${token}` } });
}
