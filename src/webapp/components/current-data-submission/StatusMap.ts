import i18n from "@eyeseetea/d2-ui-components/locales";
import { DataSubmissionStatusTypes } from "../../../domain/entities/GlassDataSubmission";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { StatusDetails } from "./overview/StatusDetails";

//Map of data submission statuses with correponding UI details.
export const statusMap = new Map<DataSubmissionStatusTypes, StatusDetails>([
    [
        "NOT_COMPLETED",
        {
            title: i18n.t("NOT COMPLETED"),
            description: i18n.t(
                "You need to fill at least the mandatory questionnaires/uploads before submitting for this data submission"
            ),
            colour: glassColors.statusActionReq,
            leftCTAs: [
                {
                    key: 0,
                    label: "Go to questionnaires",
                    url: "/",
                    variant: "outlined",
                },
            ],
            rightCTAs: [
                {
                    key: 1,
                    label: "Upload/Delete datasets",
                    url: "/upload",
                    color: "primary",
                },
            ],
            showUploadHistory: true,
            isActionRequired: true,
            actionReqText: i18n.t("Please complete all mandatory questionnaires/uploads."),
            isSubmissionStatus: false,
        },
    ],
    [
        "COMPLETE",
        {
            title: i18n.t("DATA TO BE APPROVED BY COUNTRY"),
            description: i18n.t(
                "Your submission contains all the mandatory fields. You can still add or remove datasets. Please check that everything is included and once everything is fine send it to WHO for revision."
            ),
            colour: glassColors.statusActionReq,
            leftCTAs: [
                {
                    key: 2,
                    label: "Go to questionnaires",
                    color: "primary",
                    variant: "outlined",
                    url: "/",
                },
                {
                    key: 3,
                    label: "Upload/Delete datasets",
                    color: "primary",
                    variant: "outlined",
                    url: "/data-file-history",
                },
                {
                    key: 4,
                    label: "Go to submission",
                    color: "primary",
                    variant: "outlined",
                    url: "/",
                },
            ],
            rightCTAs: [],
            showUploadHistory: true,
            isActionRequired: true,
            actionReqText:
                "Please click on 'Send submission' in Submission tab to submit after reviewing the data submission",
            isSubmissionStatus: true,
        },
    ],
    [
        "PENDING_APPROVAL",
        {
            title: i18n.t("WAITING WHO APROVAL"),
            description: i18n.t(
                'We have received your submission. You don\'t have to take action at this point. WHO staff will review your data and mark it as "ready" or contact you in case you need to modify something.'
            ),
            colour: glassColors.statusNeutral,
            leftCTAs: [],
            rightCTAs: [],
            showUploadHistory: false,
            isActionRequired: false,
            actionReqText: "",
            isSubmissionStatus: false,
        },
    ],
    [
        "APPROVED",
        {
            title: i18n.t("APPROVED"),
            description: i18n.t(
                "Congratulations, your submission of data for year 2022 was accepted.\n\nPlease note that since your submission has been approved you can't modify it directly. If you want to update or add more data you need to request an update."
            ),
            colour: glassColors.statusPositive,
            leftCTAs: [
                {
                    key: 5,
                    label: "Review submitted datasets",
                    variant: "outlined",
                    color: "primary",
                    url: "/data-file-history",
                },
            ],
            rightCTAs: [
                {
                    key: 6,
                    label: "Request data update",
                    color: "primary",
                    variant: "contained",
                    url: "/",
                },
            ],
            showUploadHistory: false,
            isActionRequired: false,
            actionReqText: "",
            isSubmissionStatus: false,
        },
    ],
    [
        "REJECTED",
        {
            title: i18n.t("REJECTED BY WHO"),
            description: i18n.t(
                "Please review the messages and the reports to find about the causes of this rejection.\n You have to upload new datasets."
            ),
            colour: glassColors.statusNegative,
            leftCTAs: [
                {
                    key: 7,
                    label: "Display full status history",
                    color: "primary",
                    variant: "outlined",
                    url: "/",
                },
            ],
            rightCTAs: [
                {
                    key: 8,
                    label: "Upload/Delete datasets",
                    url: "/upload",
                },
            ],
            showUploadHistory: false,
            isActionRequired: true,
            actionReqText: i18n.t(
                "Please re-complete the questionnaire correctly and ensure you have uploaded correct datasets, as your previous submisison was rejected by WHO."
            ),
            isSubmissionStatus: false,
        },
    ],
    [
        "PENDING_UPDATE_APPROVAL",
        {
            title: i18n.t("WAITING for WHO TO ACCEPT THE DATA UPDATE REQUEST"),
            description: i18n.t(
                "When WHO admins approve your request you will be able to modify your upload. \n You will be notified when that happens."
            ),
            colour: glassColors.statusNeutral,
            leftCTAs: [
                {
                    key: 9,
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
            isSubmissionStatus: false,
        },
    ],
    [
        "UPDATE_REQUEST_ACCEPTED",
        {
            title: i18n.t("DATA UPDATE REQUEST ACCEPTED"),
            description: i18n.t(
                "Your upload contains all necessary fields. You can still remove or add datasets. Please check that everything is included and once everything is fine send to WHO for revision"
            ),
            colour: glassColors.statusActionReq,
            leftCTAs: [
                {
                    key: 10,
                    label: "Go to questionnaires",
                    color: "primary",
                    variant: "outlined",
                    url: "/",
                },
                {
                    key: 11,
                    label: "Upload/Delete datasets",
                    color: "primary",
                    variant: "outlined",
                    url: "/data-file-history",
                },
                {
                    key: 12,
                    label: "Go to submission",
                    color: "primary",
                    variant: "outlined",
                    url: "/",
                },
            ],
            rightCTAs: [],
            showUploadHistory: true,
            isActionRequired: true,
            actionReqText:
                "Please complete all mandatory questionnaires and review datasets, then click on 'Send Submission' in the Submission tab to submit",
            isSubmissionStatus: true,
        },
    ],
]);
