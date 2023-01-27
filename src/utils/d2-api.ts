import _ from "lodash";
import { Instance } from "../data/entities/Instance";
import { D2Api } from "../types/d2-api";

type ApiType = {
    api: D2Api;
    key: "documents" | "country-information" | "modules" | "calls" | "submissions" | "news";
};

type SaveObject = ApiType & {
    object: { [key: string]: unknown };
};

export function getMajorVersion(version: string): number {
    const apiVersion = _.get(version.split("."), 1);
    if (!apiVersion) throw new Error(`Invalid version: ${version}`);
    return Number(apiVersion);
}

export function getD2APiFromInstance(instance: Instance) {
    return new D2Api({ baseUrl: instance.url, auth: instance.auth, backend: "fetch" });
}

export const getMetadataByKey = async ({ api, key }: ApiType): Promise<{ [key: string]: unknown }[]> => {
    const { response } = api.dataStore("glass").getMetadata(key);
    const responseData = (await response()).data;
    const data = responseData?.value && JSON.parse(responseData?.value);

    return data;
};

export const saveToDataStore = async ({ api, key, object }: SaveObject) => {
    const currentElements = await getMetadataByKey({ api, key });

    await api
        .dataStore("glass")
        .save(key, [...currentElements, object])
        .response();
};
