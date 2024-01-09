type ModuleDetails = {
    isbatchReq: boolean;
    isQuestionnaireReq: boolean;
    completeStatusChange: "QUESTIONNAIRE" | "DATASET" | "QUESTIONNAIRE_AND_DATASET";
    isSecondaryFileApplicable: boolean;
    isSecondaryRelated?: boolean;
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
    secondaryUploadLabel?: string;
    secondaryFileType: string;
    primaryUploadLabel: string;
    unit: string;
    isSpecimenReq: boolean;
    isDownloadEmptyTemplateReq: boolean;
    applyQuestionnaireValidation: boolean;
    datasetString?: string;
    isDatasetMandatory: boolean;
    isSingleFileTypePerSubmission?: boolean; //For AMC, you cans choose either product or substance file , never both
    autoGenerateDataSubmission: boolean;
    isCalculationRequired?: boolean;
};

export const moduleProperties = new Map<string, ModuleDetails>([
    [
        "AMR",
        {
            isbatchReq: true,
            isQuestionnaireReq: true,
            completeStatusChange: "QUESTIONNAIRE",
            isSecondaryFileApplicable: true,
            isSecondaryRelated: true,
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
            secondaryUploadLabel: "SAMPLE File,(not required)",
            unit: "data value",
            isSpecimenReq: true,
            isDownloadEmptyTemplateReq: false,
            applyQuestionnaireValidation: false,
            datasetString: "Upto 6 datasets",
            isDatasetMandatory: false,
            autoGenerateDataSubmission: true,
        },
    ],
    [
        "EGASP",
        {
            isbatchReq: false,
            isQuestionnaireReq: false,
            completeStatusChange: "DATASET",
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
            applyQuestionnaireValidation: false,
            isDatasetMandatory: true,
            autoGenerateDataSubmission: true,
        },
    ],
    [
        "AMR - Individual",
        {
            isbatchReq: false,
            isQuestionnaireReq: true,
            completeStatusChange: "DATASET",
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
            applyQuestionnaireValidation: false,
            isDatasetMandatory: true,
            autoGenerateDataSubmission: true,
        },
    ],
    [
        "AMC",
        {
            isbatchReq: false,
            isQuestionnaireReq: true,
            completeStatusChange: "QUESTIONNAIRE_AND_DATASET",
            isSecondaryFileApplicable: true,
            isDryRunReq: false,
            importLoadingMsg: {
                line1: "Importing data,",
                line2: "This might take several minutes, do not refresh the page or press back.",
            },
            deleteConfirmation: {
                title: "Confirm Delete",
                description: "Are you sure you want to delete this file",
            },
            primaryFileType: "Product Level Data",
            secondaryFileType: "Substance Level Data",
            primaryUploadLabel: "Choose File",
            secondaryUploadLabel: "Choose File",
            unit: "event",
            isSpecimenReq: false,
            isDownloadEmptyTemplateReq: true,
            applyQuestionnaireValidation: true,
            isSingleFileTypePerSubmission: true,
            isDatasetMandatory: true,
            autoGenerateDataSubmission: true,
            isCalculationRequired: true,
        },
    ],
    [
        "AMR - Funghi",
        {
            isbatchReq: false,
            isQuestionnaireReq: true,
            completeStatusChange: "DATASET",
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
            applyQuestionnaireValidation: false,
            isDatasetMandatory: true,
            autoGenerateDataSubmission: true,
        },
    ],
]);
