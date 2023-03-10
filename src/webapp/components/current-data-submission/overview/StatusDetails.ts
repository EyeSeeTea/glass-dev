export type StatusCTAs =
    | "Upload dataset"
    | "Go to questionnaires"
    | "Send to WHO for revision"
    | "Display full status history"
    | "Upload/Delete datasets"
    | "Send submission"
    | "Read full message"
    | "Review the submitted datasets"
    | "Request data update";

export type CTAs = {
    label: StatusCTAs;
    url: string;
    color?: "primary" | "default" | "secondary";
    variant?: "text" | "outlined" | "contained";
};

export interface StatusDetails {
    title: string;
    description: string;
    colour: string;
    leftCTAs: CTAs[];
    rightCTAs: CTAs[];
    showUploadHistory: boolean;
    isActionRequired: boolean;
}
