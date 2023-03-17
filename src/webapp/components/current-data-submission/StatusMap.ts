import { DataSubmissionStatusTypes } from "../../../domain/entities/GlassDataSubmission";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { StatusDetails } from "./overview/StatusDetails";

//Map of data submission statuses with correponding UI details.
export const statusMap = new Map<DataSubmissionStatusTypes, StatusDetails>([
    [
        "NOT_COMPLETED",
        {
            title: "NOT COMPLETED",
            description: "You need to fill at least the mandatory uploads before submitting for this data submission",
            colour: glassColors.yellow,
            leftCTAs: [
                {
                    label: "Upload dataset",
                    url: "/upload",
                },
                {
                    label: "Go to questionnaires",
                    url: "/",
                },
            ],
            rightCTAs: [],
            showUploadHistory: true,
            isActionRequired: false,
        },
    ],
    [
        "COMPLETE",
        {
            title: "DATA TO BE APROVED BY COUNTRY",
            description:
                "Your submission contains all the mandatory fields. You can still add or remove datasets. Please check that everything is included and once everythiong is fine send it to WHO for revision.",
            colour: glassColors.accentPrimary,
            leftCTAs: [
                {
                    label: "Upload/Delete datasets",
                    color: "default",
                    variant: "outlined",
                    url: "/upload-history",
                },
                {
                    label: "Go to questionnaires",
                    color: "default",
                    variant: "outlined",
                    url: "/",
                },
            ],
            rightCTAs: [
                {
                    label: "Send submission",
                    url: "/",
                },
            ],
            showUploadHistory: true,
            isActionRequired: true,
        },
    ],
    [
        "PENDING_APPROVAL",
        {
            title: "WAITING WHO APROVAL",
            description:
                'We have received your submission. You don\'t have to take action at this point. WHO staff will review your data and mark it as "ready" or contact you in case you need to modify something.',
            colour: glassColors.yellow,
            leftCTAs: [],
            rightCTAs: [],
            showUploadHistory: false,
            isActionRequired: false,
        },
    ],
    [
        "APPROVED",
        {
            title: "APPROVED",
            description:
                "Congratulations, your submission of data for year 2022 was accepted.\n\nPlease note that since your submission has been approved you can't modify it directly. If you want to update or add more data you need to request an update.",
            colour: glassColors.green,
            leftCTAs: [
                {
                    label: "Review the submitted datasets",
                    variant: "text",
                    color: "primary",
                    url: "/upload-history",
                },
            ],
            rightCTAs: [
                {
                    label: "Request data update",
                    variant: "text",
                    color: "primary",
                    url: "/",
                },
            ],
            showUploadHistory: false,
            isActionRequired: false,
        },
    ],
    [
        "REJECTED",
        {
            title: "REJECTED BY WHO",
            description:
                "Please review the messages and the reports to find about the causes of this rejection.\n You have to upload new datasets.",
            colour: glassColors.red,
            leftCTAs: [
                {
                    label: "Read full message",
                    color: "default",
                    variant: "outlined",
                    url: "/",
                },
            ],
            rightCTAs: [
                {
                    label: "Upload dataset",
                    url: "/upload",
                },
            ],
            showUploadHistory: false,
            isActionRequired: true,
        },
    ],
    [
        "PENDING_UPDATE_APPROVAL",
        {
            title: "WAITING for WHO TO ACCEPT THE DATA UPDATE REQUEST",
            description:
                "When WHO admins aprove your request you will be able to modify your upload. \n You will be notified when that happens.",
            colour: glassColors.red,
            leftCTAs: [
                {
                    label: "Display full status history",
                    variant: "text",
                    url: "/",
                },
            ],
            rightCTAs: [],
            showUploadHistory: false,
            isActionRequired: false,
        },
    ],
    [
        "UPDATE_REQUEST_ACCEPTED",
        {
            title: "DATA UPDATE REQUEST ACCEPTED",
            description:
                "Your upload contains all necessary fields. You can still remove or add datasets. Please check that everything is included and once everything is fine send to WHO for revision",
            colour: glassColors.accentPrimary,
            leftCTAs: [
                {
                    label: "Upload/Delete datasets",
                    color: "default",
                    variant: "outlined",
                    url: "/upload-history",
                },
                {
                    label: "Go to questionnaires",
                    color: "default",
                    variant: "outlined",
                    url: "/",
                },
            ],
            rightCTAs: [
                {
                    label: "Send submission",
                    url: "/",
                },
            ],
            showUploadHistory: true,
            isActionRequired: true,
        },
    ],
]);
