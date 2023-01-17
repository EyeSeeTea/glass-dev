import { CallStatusTypes } from "../../../../domain/entities/GlassCallStatus";
import { glassColors } from "../../../pages/app/themes/dhis2.theme";
import { StatusDetails } from "./StatusTypes";

//Map of Submission statuses with correponding UI details.
export const statusMap = new Map<CallStatusTypes, StatusDetails>([
    [
        "NOT_COMPLETED",
        {
            title: "NOT COMPLETED",
            description: "You need to send the mandatory uploads before validating the submissions for this call",
            colour: glassColors.yellow,
            cta: ["Upload dataset", "Go to questionnaire"],
        },
    ],
    [
        "COMPLETE",
        {
            title: "DATA TO BE APROVED BY COUNTRY",
            description:
                "ACTION REQUIRED. Datasets are already uploaded with all test passed. You must approve the submission for WHO revision to continue the process.",
            colour: glassColors.accentPrimary,
            cta: ["Send to WHO for revision"],
        },
    ],
    [
        "PENDING_APPROVAL",
        {
            title: "WAITING WHO APROVAL",
            description:
                "In this status the data is already submitted and you don’t have to take any action. WHO staff will review your data and mark it as ready to publish after the process is finished..",
            colour: glassColors.yellow,
            cta: ["Display full status history"],
        },
    ],
    [
        "APPROVED",
        {
            title: "APPROVED",
            description:
                "In this status the data is already submitted and you don’t have to take any action. WHO staff will review your data and mark it as ready to publish after the process is finished..",
            colour: glassColors.green,
            cta: ["Display full status history"],
        },
    ],
    [
        "REJECTED",
        {
            title: "REJECTED BY WHO",
            description:
                "Please review the authorisation report to find about the causes of this rejection. Please upload new files",
            colour: glassColors.red,
            cta: ["Display full status history"],
        },
    ],
    [
        "PENDING_UPDATE_APPROVAL",
        {
            title: "WAITING for WHO TO ACCEPT THE DATA UPDATE",
            description: "When WHO admins aprove your request you will be able to upload new data",
            colour: glassColors.red,
            cta: ["Display full status history"],
        },
    ],
]);
