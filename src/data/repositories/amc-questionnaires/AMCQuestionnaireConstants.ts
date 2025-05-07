import { GeneralAMCQuestionId } from "../../../domain/entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { AMClassAMCQuestionId } from "../../../domain/entities/amc-questionnaires/AMClassAMCQuestionnaire";
import { Id } from "../../../domain/entities/Ref";

export const AMR_GLASS_PRO_AMC_DQ_PROGRAM_ID = "f9Jl9O4CYZf";
export const AMR_TET_AMC_DQuestionnaire_TRACKED_ENTITY_TYPE_ID = "W9nZpnHEGxQ";
export const AMR_GLASS_AMC_AM_CLASS_QUESTIONNAIRE_CODE = "AMR_GLASS_AMC_DQ_AM";
export const AMR_GLASS_AMC_AM_CLASS_QUESTIONNAIRE_STAGE_ID = "BXTwobBUjLK";
export const AMR_GLASS_AMC_AM_COMPONENT_QUESTIONNAIRE_CODE = "AMR_GLASS_AMC_DQ_NAT_COMP";
export const AMR_GLASS_AMC_AM_COMPONENT_QUESTIONNAIRE_STAGE_ID = "nnZVAdx3zwP";

export const codesByGeneralAMCQuestionnaire: Record<GeneralAMCQuestionId, string> = {
    isSameAsLastYear: "AMR_GLASS_AMC_TEA_SAME_PREV_YEAR",
    shortageInPublicSector: "AMR_GLASS_AMC_TEA_SHORTAGE_PUB",
    detailOnShortageInPublicSector: "AMR_GLASS_AMC_TEA_SHORTAGE_PUB_DESCR",
    shortageInPrivateSector: "AMR_GLASS_AMC_TEA_SHORTAGE_PRV",
    detailOnShortageInPrivateSector: "AMR_GLASS_AMC_TEA_SHORTAGE_PRV_DESCR",
    generalComments: "AMR_GLASS_AMC_TEA_GEN_COMMENTS",
    antibacterials: "AMR_GLASS_AMC_TEA_ATB",
    antifungals: "AMR_GLASS_AMC_TEA_ATF",
    antivirals: "AMR_GLASS_AMC_TEA_ATV",
    antituberculosis: "AMR_GLASS_AMC_TEA_ATT",
    antimalaria: "AMR_GLASS_AMC_TEA_ATM",
} as const;

export type GeneralAMCQuestionnaireCode =
    typeof codesByGeneralAMCQuestionnaire[keyof typeof codesByGeneralAMCQuestionnaire];

export function isStringInGeneralAMCQuestionnaireCodes(code: string): code is GeneralAMCQuestionnaireCode {
    return (Object.values(codesByGeneralAMCQuestionnaire) as string[]).includes(code);
}

export const generalAMCQuestionnaireByTEAIds: Record<Id, GeneralAMCQuestionId> = {
    Tfa9gLIci1G: "isSameAsLastYear",
    SgmkuzKsZcv: "shortageInPublicSector",
    L4i4LA6rZjS: "detailOnShortageInPublicSector",
    xBsRZ7MfQno: "shortageInPrivateSector",
    Wm8cRaJytdw: "detailOnShortageInPrivateSector",
    SHF4Hzhenvr: "generalComments",
    h15ltjSxYDC: "antibacterials",
    fZUBnl9eFj3: "antifungals",
    VLwzYm63c5Y: "antivirals",
    BZbWaqfCmuZ: "antituberculosis",
    PY1TmLpZU2u: "antimalaria",
} as const;

export const codesByAMClassAMCQuestionnaire: Record<AMClassAMCQuestionId, string> = {
    antimicrobialClass: "AMR_GLASS_AMC_DE_AM_CLASS",
    healthSector: "AMR_GLASS_AMC_DE_H_SECTOR",
    healthLevel: "AMR_GLASS_AMC_DE_H_LEVEL",
    estVolumeTotalHealthLevel: "AMR_GLASS_AMC_DE_VOL_TOTAL",
    estVolumeHospitalHealthLevel: "AMR_GLASS_AMC_DE_VOL_HOSP",
    estVolumeCommunityHealthLevel: "AMR_GLASS_AMC_DE_VOL_COMM",
} as const;

export const AMClassAMCQuestionnaireByTEAIds: Record<Id, AMClassAMCQuestionId> = {
    EUh63YWEA62: "antimicrobialClass",
    U51LiIT3mKk: "healthSector",
    Fv9NNL4rmrm: "healthLevel",
    pKR2EiIilTO: "estVolumeTotalHealthLevel",
    NapA76XUInT: "estVolumeHospitalHealthLevel",
    gAGTbAhWrgN: "estVolumeCommunityHealthLevel",
} as const;
