export type StatusCTAs =
    | "Go to questionnaires"
    | "Display full status history"
    | "Upload/Delete datasets"
    | "Send submission"
    | "Read full message"
    | "Review submitted datasets"
    | "Request data update"
    | "Go to submission";

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
    actionReqText: string;
    isSubmissionStatus: boolean;
}
