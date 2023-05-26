export const isEditModeStatus = (statusTitle: string) => {
    //The following status can be considered as edit mode,
    //they allow New Dataset Uploads and Questionnaire edits.
    return (
        statusTitle === "NOT COMPLETED" ||
        statusTitle === "DATA TO BE APPROVED BY COUNTRY" ||
        statusTitle === "REJECTED BY WHO" ||
        statusTitle === "DATA UPDATE REQUEST ACCEPTED"
    );
};
