import { DataSubmissionStatusTypes } from "../../../domain/entities/GlassDataSubmission";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { StatusDetails } from "./overview/StatusDetails";

//Map of data submission statuses with correponding UI details.
export const statusMap = new Map<DataSubmissionStatusTypes, StatusDetails>([
    [
        "NOT_COMPLETED",
        {
            title: "NOT COMPLETED",
            description:
                "You need to complete the mandatory uploads before validating the uploads for this data submission",
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
                "Datasets are already uploaded with all test passed. You must approve the upload for WHO revision to continue the process.",
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
                "In this status the data is already submitted and you don’t have to take any action. WHO staff will review your data and mark it as ready to publish after the process is finished..",
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
                "In this status the data is already submitted and you don’t have to take any action. WHO staff will review your data and mark it as ready to publish after the process is finished..",
            colour: glassColors.green,
            leftCTAs: [
                {
                    label: "Review the submitted datasets",
                    variant: "text",
                    url: "/upload-history",
                },
            ],
            rightCTAs: [
                {
                    label: "Request data update",
                    variant: "text",
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
                "Please review the authorisation report to find about the causes of this rejection. Please upload new files",
            colour: glassColors.red,
            leftCTAs: [
                {
                    label: "Read full message",
                    color: "default",
                    variant: "outlined",
                    url: "/",
                },
                {
                    label: "Upload dataset",
                    url: "/upload",
                },
            ],
            rightCTAs: [],
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
            colour: glassColors.red,
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
