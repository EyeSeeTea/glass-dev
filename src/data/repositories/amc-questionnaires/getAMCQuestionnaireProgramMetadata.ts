import { D2Api, D2ProgramSchema, SelectedPick } from "../../../types/d2-api";
import { apiToFuture } from "../../../utils/futures";
import { assertOrError } from "../utils/AssertOrError";
import { AMR_GLASS_PRO_AMC_DQ_PROGRAM_ID } from "./AMCQuestionnaireConstants";

export function getAMCQuestionnaireProgramMetadata(api: D2Api) {
    return apiToFuture(
        api.models.programs.get({
            fields: programFields,
            filter: {
                id: { eq: AMR_GLASS_PRO_AMC_DQ_PROGRAM_ID },
            },
        })
    ).flatMap(response => assertOrError(response.objects[0], "AMC Questionnaire program"));
}

const programFields = {
    id: true,
    code: true,
    displayName: true,
    programTrackedEntityAttributes: {
        id: true,
        displayName: true,
        trackedEntityAttribute: {
            id: true,
            code: true,
            displayDescription: true,
        },
    },
    programStages: {
        id: true,
        code: true,
        programStageDataElements: {
            id: true,
            code: true,
            displayName: true,
            dataElement: {
                id: true,
                code: true,
                displayFormName: true,
            },
        },
    },
} as const;

export type D2ProgramMetadata = SelectedPick<D2ProgramSchema, typeof programFields>;
