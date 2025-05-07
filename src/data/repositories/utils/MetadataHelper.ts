import { Id } from "../../../domain/entities/Ref";
import { apiToFuture } from "../../../utils/futures";
import { D2Api, SelectedPick, D2DataElementSchema, D2ProgramStageSchema } from "../../../types/d2-api";

const dataElementFields = {
    id: true,
    valueType: true,
    code: true,
    name: true,
} as const;

const programStageFields = {
    id: true,
    programStageDataElements: {
        dataElement: dataElementFields,
    },
} as const;

export function getProgramStage(api: D2Api, stageId: Id) {
    return apiToFuture(
        api.models.programStages.get({
            fields: programStageFields,
            filter: {
                id: { eq: stageId },
            },
        })
    );
}

export type D2ProgramStageMetadata = SelectedPick<D2ProgramStageSchema, typeof programStageFields>;

export type D2ProgramStageDataElementsMetadata = {
    dataElement: SelectedPick<D2DataElementSchema, typeof dataElementFields>;
};
