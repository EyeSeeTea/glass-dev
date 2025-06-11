import { GeneralAMCQuestionId } from "../../../domain/entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { AMClassAMCQuestionId } from "../../../domain/entities/amc-questionnaires/AMClassAMCQuestionnaire";
import { Id } from "../../../domain/entities/Ref";
import { ComponentAMCQuestionId } from "../../../domain/entities/amc-questionnaires/ComponentAMCQuestionnaire";

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
    stratas: "AMR_GLASS_AMC_DE_STRATAS",
    estVolumeTotalHealthLevel: "AMR_GLASS_AMC_DE_VOL_TOTAL",
    estVolumeHospitalHealthLevel: "AMR_GLASS_AMC_DE_VOL_HOSP",
    estVolumeCommunityHealthLevel: "AMR_GLASS_AMC_DE_VOL_COMM",
} as const;

export type AMClassAMCQuestionnaireCode =
    typeof codesByAMClassAMCQuestionnaire[keyof typeof codesByAMClassAMCQuestionnaire];

export function isStringInAMClassAMCQuestionnaireCodes(code: string): code is AMClassAMCQuestionnaireCode {
    return (Object.values(codesByAMClassAMCQuestionnaire) as string[]).includes(code);
}

export const AMClassAMCQuestionnaireByTEAIds: Record<Id, AMClassAMCQuestionId> = {
    EUh63YWEA62: "antimicrobialClass",
    OlTdx6NFkw1: "stratas",
    pKR2EiIilTO: "estVolumeTotalHealthLevel",
    NapA76XUInT: "estVolumeHospitalHealthLevel",
    gAGTbAhWrgN: "estVolumeCommunityHealthLevel",
} as const;

export const codesByComponentAMCQuestionnaire: Record<ComponentAMCQuestionId, string> = {
    antibacterialStratum: "AMR_GLASS_AMC_DE_ATB_STRATUM",
    antifungalStratum: "AMR_GLASS_AMC_DE_ATF_STRATUM",
    antiviralStratum: "AMR_GLASS_AMC_DE_ATV_STRATUM",
    antituberculosisStratum: "AMR_GLASS_AMC_DE_ATT_STRATUM",
    antimalariaStratum: "AMR_GLASS_AMC_DE_ATM_STRATUM",
    excludedSubstances: "AMR_GLASS_AMC_DE_ATC_EXCL",
    listOfExcludedSubstances: "AMR_GLASS_AMC_DE_ATC_EXCL_DETAIL",
    typeOfDataReported: "AMR_GLASS_AMC_DE_DATA_LEVEL",
    procurementTypeOfDataReported: "AMR_GLASS_AMC_DE_PROC_SUBTYPE",
    mixedTypeOfData: "AMR_GLASS_AMC_DE_MIX_LEVEL_DETAIL",
    sourcesOfDataReported: "AMR_GLASS_AMC_DE_DATA_SOURCE",
    commentsForDataSources: "AMR_GLASS_AMC_DE_DATA_SOURCE_COMMENT",
    sameAsUNPopulation: "AMR_GLASS_AMC_DE_POP_SAME_UN",
    sourceOfNationalPopulation: "AMR_GLASS_AMC_DE_POP_NAT_SOURCE",
    otherSourceForNationalPopulation: "AMR_GLASS_AMC_DE_POP_NAT_SOURCE_OTHER",
    commentOnNationalPopulation: "AMR_GLASS_AMC_DE_POP_NAT_COMMENT",
    coverageVolumeWithinTheStratum: "AMR_GLASS_AMC_DE_COV_DATA_STRATUM",
    commentOnCoverageWithinTheStratum: "AMR_GLASS_AMC_DE_COV_DATA_STRATUM_COMMENT",
} as const;

export type ComponentAMCQuestionnaireCode =
    typeof codesByComponentAMCQuestionnaire[keyof typeof codesByComponentAMCQuestionnaire];

export function isStringInComponentAMCQuestionnaireCodes(code: string): code is ComponentAMCQuestionnaireCode {
    return (Object.values(codesByComponentAMCQuestionnaire) as string[]).includes(code);
}

export const ComponentAMCQuestionnaireByTEAIds: Record<Id, ComponentAMCQuestionId> = {
    T3iWvdmEWbt: "antibacterialStratum",
    BQ7rCgQ59wm: "antifungalStratum",
    moYkeUGjkh3: "antiviralStratum",
    NtkirtAJeGS: "antituberculosisStratum",
    A5rC9XbXlJE: "antimalariaStratum",
    KRE4eIuqosa: "excludedSubstances",
    EKzFXIafzZ3: "listOfExcludedSubstances",
    kWfwqRhsyyD: "typeOfDataReported",
    mfxlVTtBZ4A: "procurementTypeOfDataReported",
    HqgKnu4p7sk: "mixedTypeOfData",
    JJOoocMExpz: "sourcesOfDataReported",
    GDqvtXyMWdz: "commentsForDataSources",
    VNzlCDzQ1Og: "sameAsUNPopulation",
    OZIjuHp6Zbw: "sourceOfNationalPopulation",
    wpBicXvTZQA: "otherSourceForNationalPopulation",
    vm3tz1ARtzt: "commentOnNationalPopulation",
    jcsdkdI0SY1: "coverageVolumeWithinTheStratum",
    fpFoXP5lz7a: "commentOnCoverageWithinTheStratum",
} as const;
