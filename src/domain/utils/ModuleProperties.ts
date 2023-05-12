type ModuleDetails = {
    isbatchReq: boolean;
    isSecondaryReq: boolean;
    isDryRunReq: boolean;
    importLoadingMsg: {
        line1: string;
        line2: string;
    };
    primaryFileType: string;
    secondaryFileType: string;
    primaryUploadLabel: string;
};

export const moduleProperties = new Map<string, ModuleDetails>([
    [
        "AMR",
        {
            isbatchReq: true,
            isSecondaryReq: true,
            isDryRunReq: true,
            importLoadingMsg: {
                line1: "Performing a dry run of the import to ensure that there are no errors.",
                line2: "This might take several minutes, do not refresh the page or press back.",
            },
            primaryFileType: "RIS",
            secondaryFileType: "SAMPLE",
            primaryUploadLabel: "Choose RIS File",
        },
    ],
    [
        "EGASP",
        {
            isbatchReq: false,
            isSecondaryReq: false,
            isDryRunReq: false,
            importLoadingMsg: {
                line1: "Importing data,",
                line2: "This might take several minutes, do not refresh the page or press back.",
            },
            primaryFileType: "EGASP",
            secondaryFileType: "",
            primaryUploadLabel: "Choose EGASP File",
        },
    ],
]);
