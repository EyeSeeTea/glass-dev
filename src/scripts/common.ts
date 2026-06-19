import { option, optional, string, Type } from "cmd-ts";
import _ from "lodash";
import { isElementOfUnion } from "../utils/ts-utils";
import { D2Api } from "../types/d2-api";
import { Instance } from "../data/entities/Instance";

export function getD2Api(url: string): D2Api {
    const token = process.env.REACT_APP_DHIS2_TOKEN;
    if (token) {
        const { baseUrl } = getApiOptionsFromUrl(url);
        return createD2ApiWithToken(baseUrl, token);
    }
    const { baseUrl, auth } = getApiOptionsFromUrl(url);
    return new D2Api({ baseUrl, auth });
}

function getApiOptionsFromUrl(url: string): { baseUrl: string; auth: Auth } {
    const urlObj = new URL(url);
    const decode = decodeURIComponent;
    const auth = { username: decode(urlObj.username), password: decode(urlObj.password) };
    return { baseUrl: urlObj.origin + urlObj.pathname, auth };
}

type Auth = {
    username: string;
    password: string;
};

type D2ApiArgs = {
    url: string;
    auth?: Auth;
    token?: string;
};

export function getD2ApiFromArgs(args: D2ApiArgs): D2Api {
    const token = args.token || process.env.REACT_APP_DHIS2_TOKEN;
    if (token) {
        return createD2ApiWithToken(args.url, token);
    }
    const { baseUrl, auth } = args.auth ? { baseUrl: args.url, auth: args.auth } : getApiOptionsFromUrl(args.url);
    return new D2Api({ baseUrl, auth });
}

export function getInstance(args: D2ApiArgs): Instance {
    const token = args.token || process.env.REACT_APP_DHIS2_TOKEN;
    if (token) {
        return new Instance({ url: args.url, token });
    }
    return new Instance({ url: args.url, ...args.auth });
}

function createD2ApiWithToken(baseUrl: string, token: string): D2Api {
    // Dummy auth forces credentials:"omit"; ApiToken header overrides Basic auth (extraHeaders win in FetchHttpClientRepository)
    const api = new D2Api({ baseUrl, auth: { username: "_", password: "_" } });
    patchWithApiToken(api.baseConnection, token);
    patchWithApiToken(api.apiConnection, token);
    return api;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function patchWithApiToken(connection: any, token: string): void {
    const original = connection.request.bind(connection);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connection.request = (options: any) =>
        original({ ...options, headers: { ...options.headers, Authorization: `ApiToken ${token}` } });
}

export function getApiUrlOption(options?: { long: string }) {
    return option({
        type: string,
        long: options?.long ?? "url",
        description: "https://[USERNAME:PASSWORD]@HOST:PORT",
    });
}

export function getApiUrlOptions() {
    return {
        url: option({
            type: string,
            long: "url",
            description: "http[s]://[USERNAME:PASSWORD@]HOST:PORT",
        }),
        auth: option({
            type: optional(AuthString),
            long: "auth",
            description: "USERNAME:PASSWORD",
        }),
    };
}

export const AuthString: Type<string, Auth> = {
    async from(str) {
        const [username, password] = str.split(":");
        if (!username || !password) throw new Error(`Invalid pair: ${str} (expected USERNAME:PASSWORD)`);
        return { username, password };
    },
};

export const StringsSeparatedByCommas: Type<string, string[]> = {
    async from(str) {
        const values = str.split(",").filter(s => s);
        if (_.isEmpty(values)) throw new Error("Value cannot be empty");
        return values;
    },
};

export function choiceOf<T extends string>(values: readonly T[]): Type<string, T> {
    return {
        async from(str) {
            if (!isElementOfUnion<T>(str, values)) throw new Error(`Valid values: ${values.join(",")}`);
            return str;
        },
    };
}

export function sleep(milliseconds: number) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

/**
 * DHIS2 workaround: a bug in certain DHIS2 versions causes PAT (Personal Access Token)
 * sessions to fail on the first real API call. Calling GET /me first forces the server
 * to fully initialize the session, after which all subsequent calls succeed normally.
 * Call this once per script run, right after creating the D2Api instance.
 */
export async function warmUpSession(api: D2Api): Promise<void> {
    const user = await api.get<{ id: string; username: string }>("/me").getData();
    console.log(`[auth] Session initialized for user: ${user.username} (${user.id})`);
}
