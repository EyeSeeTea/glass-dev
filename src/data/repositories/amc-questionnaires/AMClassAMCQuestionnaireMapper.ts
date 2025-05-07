import { SelectedPick } from "../../../types/d2-api";
import { D2TrackerEventSchema, D2TrackerEventToPost } from "@eyeseetea/d2-api/api/trackerEvents";
import { AMClassAMCQuestionnaire } from "../../../domain/entities/amc-questionnaires/AMClassAMCQuestionnaire";
import { AMClassAMCQuestionnaireByTEAIds, codesByAMClassAMCQuestionnaire } from "./AMCQuestionnaireConstants";
import { antimicrobialClassOption } from "../../../domain/entities/amc-questionnaires/AntimicrobialClassOption";
import { healthSectorOption } from "../../../domain/entities/amc-questionnaires/HealthSectorOption";
import { healthLevelOption } from "../../../domain/entities/amc-questionnaires/HealthLevelOption";
import { proportion50to100Option } from "../../../domain/entities/amc-questionnaires/Proportion50to100Option";
import { D2ProgramStageMetadata } from "../utils/MetadataHelper";

export function mapD2EventToAMClassAMCQuestionnaire(d2Event: D2Event): AMClassAMCQuestionnaire {
    const fromMap = (key: keyof typeof codesByAMClassAMCQuestionnaire) => getValueFromMap(key, d2Event);
    const antimicrobialClass = antimicrobialClassOption.getSafeValue(fromMap("antimicrobialClass"));
    const healthSector = healthSectorOption.getSafeValue(fromMap("healthSector"));
    const healthLevel = healthLevelOption.getSafeValue(fromMap("healthLevel"));
    if (!antimicrobialClass || !healthSector || !healthLevel) {
        throw new Error(`Missing required fields in D2Event for AMClassAMCQuestionnaire: ${JSON.stringify(d2Event)}`);
    }
    const amClassAMCQuestionnaire = new AMClassAMCQuestionnaire({
        id: d2Event.event,
        antimicrobialClass: antimicrobialClass,
        healthSector: healthSector,
        healthLevel: healthLevel,
        estVolumeTotalHealthLevel: proportion50to100Option.getSafeValue(fromMap("estVolumeTotalHealthLevel")),
        estVolumeHospitalHealthLevel: proportion50to100Option.getSafeValue(fromMap("estVolumeHospitalHealthLevel")),
        estVolumeCommunityHealthLevel: proportion50to100Option.getSafeValue(fromMap("estVolumeCommunityHealthLevel")),
    });
    return amClassAMCQuestionnaire;
}

export function mapAMClassAMCQuestionnaireToD2Event(
    amClassAMCQuestionnaire: AMClassAMCQuestionnaire,
    stageMetadata: D2ProgramStageMetadata
): D2TrackerEventToPost {
    throw new Error("Not implemented");
    // const d2Event: D2TrackerEventToPost = {
    //     dataValues: [],
    //     trackedEntity: "",
    //     event: "",
    //     programStage: stageMetadata.id,

    // };
    // const toMap = (key: keyof typeof codesByAMClassAMCQuestionnaire) => {
    //     const value = amClassAMCQuestionnaire[key];
    //     const id = Object.entries(AMClassAMCQuestionnaireByTEAIds).find(([_, v]) => v === key)?.[0];
    //     if (!id) {
    //         return;
    //     }
    //     d2Event.dataValues.push({
    //         dataElement: id,
    //         value: value ?? "",
    //     });
    // };
    // toMap("antimicrobialClass");
    // toMap("healthSector");
    // toMap("healthLevel");
    // toMap("estVolumeTotalHealthLevel");
    // toMap("estVolumeHospitalHealthLevel");
    // toMap("estVolumeCommunityHealthLevel");
    // d2Event.trackedEntity = amClassAMCQuestionnaire.trackedEntity;
    // d2Event.event = amClassAMCQuestionnaire.event;
    // d2Event.updatedAt = amClassAMCQuestionnaire.updatedAt;
    // return d2Event;
}

function getValueFromMap(key: typeof AMClassAMCQuestionnaireByTEAIds["string"], d2Event: D2Event): string {
    // TODO: improve this? Map by code is possible? setup config for direct id lookup based on attr?
    const id = Object.entries(AMClassAMCQuestionnaireByTEAIds).find(([_, v]) => v === key)?.[0];
    if (!id) {
        return "";
    }
    return d2Event.dataValues?.find(dv => dv.dataElement === id)?.value ?? "";
}

// TODO: extract repeated types
const dataElementFields = {
    id: true,
    code: true,
    name: true,
} as const;

const eventFields = {
    dataValues: {
        dataElement: dataElementFields,
        value: true,
    },
    trackedEntity: true,
    event: true,
    updatedAt: true,
} as const;

export type D2Event = SelectedPick<D2TrackerEventSchema, typeof eventFields>;
