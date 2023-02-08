const cleanDhis2Url = (baseUrl: string, path: string) =>
    [baseUrl.replace(/\/$/, ""), path.replace(/^\//, "")].join("/");

export const goToDhis2Url = (baseUrl: string, path: string) => {
    if (baseUrl && path) window.location = cleanDhis2Url(baseUrl, path) as unknown as Location;
};

export const getUrlParam = (param: string) => {
    const search = window.location.search;
    let params = new URLSearchParams(search);
    if (!search) {
        const queryString = window.location.hash;
        params = new URLSearchParams(queryString.toString().split("?")[1]);
    }
    return params.get(param);
};
