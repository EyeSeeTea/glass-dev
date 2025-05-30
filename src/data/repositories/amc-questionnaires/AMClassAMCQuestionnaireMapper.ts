import { D2TrackerEventToPost } from "@eyeseetea/d2-api/api/trackerEvents";
import { AMClassAMCQuestionnaire } from "../../../domain/entities/amc-questionnaires/AMClassAMCQuestionnaire";
import {
    AMClassAMCQuestionnaireByTEAIds,
    AMClassAMCQuestionnaireCode,
    AMR_GLASS_PRO_AMC_DQ_PROGRAM_ID,
    codesByAMClassAMCQuestionnaire,
    isStringInAMClassAMCQuestionnaireCodes,
} from "./AMCQuestionnaireConstants";
import { antimicrobialClassOption } from "../../../domain/entities/amc-questionnaires/AntimicrobialClassOption";
import { proportion50to100Option } from "../../../domain/entities/amc-questionnaires/Proportion50to100Option";
import { D2ProgramStageMetadata } from "../utils/MetadataHelper";
import { D2Event, D2TrackedEntity } from "./D2Types";
import { strataOption } from "../../../domain/entities/amc-questionnaires/StrataOption";

export function mapD2EventToAMClassAMCQuestionnaire(d2Event: D2Event): AMClassAMCQuestionnaire {
    const fromMap = (key: keyof typeof codesByAMClassAMCQuestionnaire) => getValueFromMap(key, d2Event);
    const antimicrobialClass = antimicrobialClassOption.getSafeValue(fromMap("antimicrobialClass"));
    const stratas = _.compact(
        fromMap("stratas")
            .split(",")
            .map(strata => strataOption.getSafeValue(strata))
    );
    if (!antimicrobialClass || !stratas) {
        throw new Error(`Missing required fields in D2Event for AMClassAMCQuestionnaire: ${JSON.stringify(d2Event)}`);
    }
    const amClassAMCQuestionnaire = new AMClassAMCQuestionnaire({
        id: d2Event.event,
        antimicrobialClass: antimicrobialClass,
        stratas: stratas,
        estVolumeTotalHealthLevel: proportion50to100Option.getSafeValue(fromMap("estVolumeTotalHealthLevel")),
        estVolumeHospitalHealthLevel: proportion50to100Option.getSafeValue(fromMap("estVolumeHospitalHealthLevel")),
        estVolumeCommunityHealthLevel: proportion50to100Option.getSafeValue(fromMap("estVolumeCommunityHealthLevel")),
    });
    return amClassAMCQuestionnaire;
}

function getValueFromAMClassAMCQuestionnaire(
    amClassAMCQuestionnaire: AMClassAMCQuestionnaire
): Record<AMClassAMCQuestionnaireCode, string> {
    return {
        AMR_GLASS_AMC_DE_AM_CLASS: amClassAMCQuestionnaire.antimicrobialClass,
        AMR_GLASS_AMC_DE_STRATAS: amClassAMCQuestionnaire.stratas.join(","),
        AMR_GLASS_AMC_DE_VOL_TOTAL: amClassAMCQuestionnaire.estVolumeTotalHealthLevel ?? "",
        AMR_GLASS_AMC_DE_VOL_HOSP: amClassAMCQuestionnaire.estVolumeHospitalHealthLevel ?? "",
        AMR_GLASS_AMC_DE_VOL_COMM: amClassAMCQuestionnaire.estVolumeCommunityHealthLevel ?? "",
    };
}

export function mapAMClassAMCQuestionnaireToD2Event(
    amClassAMCQuestionnaire: AMClassAMCQuestionnaire,
    stageMetadata: D2ProgramStageMetadata,
    trackedEntity: D2TrackedEntity
): D2TrackerEventToPost {
    const values = getValueFromAMClassAMCQuestionnaire(amClassAMCQuestionnaire);

    const dataValues = stageMetadata.programStageDataElements.reduce<{ dataElement: string; value: string }[]>(
        (acc, dataElement) => {
            if (isStringInAMClassAMCQuestionnaireCodes(dataElement.dataElement.code)) {
                const typedCode: AMClassAMCQuestionnaireCode = dataElement.dataElement.code;
                const value = values[typedCode];
                return value !== undefined
                    ? [
                          ...acc,
                          {
                              dataElement: dataElement.dataElement.id,
                              value: value,
                          },
                      ]
                    : acc;
            } else {
                return acc;
            }
        },
        []
    );

    const d2Event: D2TrackerEventToPost = {
        occurredAt: new Date().toISOString(), // TODO: use the correct date
        orgUnit: trackedEntity.orgUnit,
        enrollment: trackedEntity.enrollments[0]?.enrollment,
        program: AMR_GLASS_PRO_AMC_DQ_PROGRAM_ID,
        dataValues: dataValues,
        trackedEntity: trackedEntity.trackedEntity,
        status: "ACTIVE",
        programStage: stageMetadata.id,
        event: amClassAMCQuestionnaire.id,
    };
    return d2Event;
}

function getValueFromMap(key: typeof AMClassAMCQuestionnaireByTEAIds["string"], d2Event: D2Event): string {
    // TODO: improve this? Map by code is possible? setup config for direct id lookup based on attr?
    const id = Object.entries(AMClassAMCQuestionnaireByTEAIds).find(([_, v]) => v === key)?.[0];
    if (!id) {
        return "";
    }
    return d2Event.dataValues?.find(dv => dv.dataElement === id)?.value ?? "";
}
