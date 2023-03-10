export type StatusCTAs =
    | "Upload dataset"
    | "Go to questionnaire"
    | "Send to WHO for revision"
    | "Display full status history"
    | "Upload/Delete datasets >";

export interface StatusDetails {
    title: string;
    description: string;
    colour: string;
    cta: StatusCTAs[];
    showUploadHistory: boolean;
}
