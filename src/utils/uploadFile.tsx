import { D2Api } from "../types/d2-api";

export const uploadFile = async (api: D2Api, risFile: File) => {
    const { response } = api.files.upload({
        name: risFile?.name as string,
        data: risFile as Blob,
    });

    const fileResourceData = await response();
    const { fileResourceId, id } = fileResourceData.data;

    const document = {
        id,
        fileResourceId,
        createdAt: new Date().toISOString(),
    };

    return document;
};
