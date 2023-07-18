export const getStringFromFile = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsText(file, "utf-8");
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = error => reject(error);
    });
};
