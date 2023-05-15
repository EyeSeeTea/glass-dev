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
            colour: glassColors.statusActionReq,
            leftCTAs: [
                {
                    label: "Upload/Delete datasets",
                    url: "/upload",
                    color: "primary",
                    variant: "outlined",
                },
            ],
            rightCTAs: [
                {
                    label: "Go to questionnaires",
                    url: "/",
                },
            ],
            showUploadHistory: true,
            isActionRequired: true,
            actionReqText: "Please complete all mandatory questionnaires.",
        },
    ],
    [
        "COMPLETE",
        {
            title: "DATA TO BE APPROVED BY COUNTRY",
            description:
                "Your submission contains all the mandatory fields. You can still add or remove datasets. Please check that everything is included and once everythiong is fine send it to WHO for revision.",
            colour: glassColors.statusActionReq,
            leftCTAs: [
                {
                    label: "Upload/Delete datasets",
                    color: "primary",
                    variant: "outlined",
                    url: "/data-file-history",
                },
                {
                    label: "Go to questionnaires",
                    color: "primary",
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
            actionReqText:
                "Please click on 'Send submission' in overview tab to submit after reviewing the data submission",
        },
    ],
    [
        "PENDING_APPROVAL",
        {
            title: "WAITING WHO APROVAL",
            description:
                'We have received your submission. You don\'t have to take action at this point. WHO staff will review your data and mark it as "ready" or contact you in case you need to modify something.',
            colour: glassColors.statusNeutral,
            leftCTAs: [],
            rightCTAs: [],
            showUploadHistory: false,
            isActionRequired: false,
            actionReqText: "",
        },
    ],
    [
        "APPROVED",
        {
            title: "APPROVED",
            description:
                "Congratulations, your submission of data for year 2022 was accepted.\n\nPlease note that since your submission has been approved you can't modify it directly. If you want to update or add more data you need to request an update.",
            colour: glassColors.statusPositive,
            leftCTAs: [
                {
                    label: "Review submitted datasets",
                    variant: "outlined",
                    color: "primary",
                    url: "/data-file-history",
                },
            ],
            rightCTAs: [
                {
                    label: "Request data update",
                    color: "primary",
                    variant: "contained",
                    url: "/",
                },
            ],
            showUploadHistory: false,
            isActionRequired: false,
            actionReqText: "",
        },
    ],
    [
        "REJECTED",
        {
            title: "REJECTED BY WHO",
            description:
                "Please review the messages and the reports to find about the causes of this rejection.\n You have to upload new datasets.",
            colour: glassColors.statusNegative,
            leftCTAs: [
                {
                    label: "Display full status history",
                    color: "primary",
                    variant: "outlined",
                    url: "/",
                },
            ],
            rightCTAs: [
                {
                    label: "Upload/Delete datasets",
                    url: "/upload",
                },
            ],
            showUploadHistory: false,
            isActionRequired: true,
            actionReqText:
                "Please re-complete the questionnaire correctly and ensure you have uploaded correct datasets, as your previous submisison was rejected by WHO.",
        },
    ],
    [
        "PENDING_UPDATE_APPROVAL",
        {
            title: "WAITING for WHO TO ACCEPT THE DATA UPDATE REQUEST",
            description:
                "When WHO admins approve your request you will be able to modify your upload. \n You will be notified when that happens.",
            colour: glassColors.statusNeutral,
            leftCTAs: [
                {
                    label: "Display full status history",
                    variant: "contained",
                    color: "primary",
                    url: "/",
                },
            ],
            rightCTAs: [],
            showUploadHistory: false,
            isActionRequired: false,
            actionReqText: "",
        },
    ],
    [
        "UPDATE_REQUEST_ACCEPTED",
        {
            title: "DATA UPDATE REQUEST ACCEPTED",
            description:
                "Your upload contains all necessary fields. You can still remove or add datasets. Please check that everything is included and once everything is fine send to WHO for revision",
            colour: glassColors.statusActionReq,
            leftCTAs: [
                {
                    label: "Upload/Delete datasets",
                    color: "primary",
                    variant: "outlined",
                    url: "/data-file-history",
                },
                {
                    label: "Go to questionnaires",
                    color: "primary",
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
            actionReqText:
                "Please complete all mandatory questionnaires and review datasets, then click on 'Send Submission' in the overview tab to submit",
        },
    ],
]);
