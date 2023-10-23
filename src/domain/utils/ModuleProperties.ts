type ModuleDetails = {
    isbatchReq: boolean;
    isQuestionnaireReq: boolean;
    isSecondaryFileApplicable: boolean;
    isDryRunReq: boolean;
    importLoadingMsg: {
        line1: string;
        line2: string;
    };
    deleteConfirmation: {
        title: string;
        description: string;
    };
    primaryFileType: string;
    secondaryFileType: string;
    primaryUploadLabel: string;
    unit: string;
    isSpecimenReq: boolean;
    isDownloadEmptyTemplateReq: boolean;
    datasetString?: string;
};

export const moduleProperties = new Map<string, ModuleDetails>([
    [
        "AMR",
        {
            isbatchReq: true,
            isQuestionnaireReq: true,
            isSecondaryFileApplicable: true,
            isDryRunReq: true,
            importLoadingMsg: {
                line1: "Performing a dry run of the import to ensure that there are no errors.",
                line2: "This might take several minutes, do not refresh the page or press back.",
            },
            deleteConfirmation: {
                title: "Confirm Delete",
                description:
                    "Deleting this upload will delete both SAMPLE and RIS files for the given dataset. Are you sure you want to delete?",
            },
            primaryFileType: "RIS",
            secondaryFileType: "SAMPLE",
            primaryUploadLabel: "Choose RIS File",
            unit: "data value",
            isSpecimenReq: true,
            isDownloadEmptyTemplateReq: false,
            datasetString: "Upto 6 datasets",
        },
    ],
    [
        "EGASP",
        {
            isbatchReq: false,
            isQuestionnaireReq: false,
            isSecondaryFileApplicable: false,
            isDryRunReq: false,
            importLoadingMsg: {
                line1: "Importing data,",
                line2: "This might take several minutes, do not refresh the page or press back.",
            },
            deleteConfirmation: {
                title: "Confirm Delete",
                description: "Are you sure you want to delete this EGASP file and corresponding events?",
            },
            primaryFileType: "EGASP",
            secondaryFileType: "",
            primaryUploadLabel: "Choose EGASP File",
            unit: "event",
            isSpecimenReq: false,
            isDownloadEmptyTemplateReq: true,
        },
    ],
    [
        "AMR - Individual",
        {
            isbatchReq: false,
            isQuestionnaireReq: false,
            isSecondaryFileApplicable: false,
            isDryRunReq: false,
            importLoadingMsg: {
                line1: "Importing data,",
                line2: "This might take several minutes, do not refresh the page or press back.",
            },
            deleteConfirmation: {
                title: "Confirm Delete",
                description: "Are you sure you want to delete this RIS individual file and corresponding enrollments?",
            },
            primaryFileType: "RIS Individual",
            secondaryFileType: "",
            primaryUploadLabel: "Choose RIS Individual File",
            unit: "enrollment",
            isSpecimenReq: true,
            isDownloadEmptyTemplateReq: false,
        },
    ],
    [
        "AMR - Funghi",
        {
            isbatchReq: false,
            isQuestionnaireReq: false,
            isSecondaryFileApplicable: false,
            isDryRunReq: false,
            importLoadingMsg: {
                line1: "Importing data,",
                line2: "This might take several minutes, do not refresh the page or press back.",
            },
            deleteConfirmation: {
                title: "Confirm Delete",
                description: "Are you sure you want to delete this RIS individual file and corresponding enrollments?",
            },
            primaryFileType: "RIS Funghi",
            secondaryFileType: "",
            primaryUploadLabel: "Choose RIS Funghi File",
            unit: "enrollment",
            isSpecimenReq: true,
            isDownloadEmptyTemplateReq: false,
        },
    ],
]);
