const cleanDhis2Url = (baseUrl: string, path: string) =>
    [baseUrl.replace(/\/$/, ""), path.replace(/^\//, "")].join("/");

export const goToDhis2Url = (baseUrl: string, path: string) => {
    if (baseUrl && path) window.location = cleanDhis2Url(baseUrl, path) as unknown as Location;
};
