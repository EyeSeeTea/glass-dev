import { option, optional, string, Type } from "cmd-ts";
import _ from "lodash";
import { isElementOfUnion } from "../utils/ts-utils";
import { D2Api } from "../types/d2-api";
import { Instance } from "../data/entities/Instance";

export function getD2Api(url: string): D2Api {
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
};

export function getD2ApiFromArgs(args: D2ApiArgs): D2Api {
    const { baseUrl, auth } = args.auth ? { baseUrl: args.url, auth: args.auth } : getApiOptionsFromUrl(args.url);

    return new D2Api({ baseUrl, auth });
}

export function getInstance(args: D2ApiArgs): Instance {
    const instance = new Instance({ url: args.url, ...args.auth });
    return instance;
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
