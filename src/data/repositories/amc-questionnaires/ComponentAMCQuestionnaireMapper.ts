import { D2TrackerEventToPost } from "@eyeseetea/d2-api/api/trackerEvents";
import { ComponentAMCQuestionnaire } from "../../../domain/entities/amc-questionnaires/ComponentAMCQuestionnaire";
import { dataLevelOption } from "../../../domain/entities/amc-questionnaires/DataLevelOption";
import { nationalPopulationDataSourceOption } from "../../../domain/entities/amc-questionnaires/NationalPopulationDataSourceOption";
import { procurementLevelOption } from "../../../domain/entities/amc-questionnaires/ProcurementLevelOption";
import { proportion50to100UnknownOption } from "../../../domain/entities/amc-questionnaires/Proportion50to100UnknownOption";
import { strataOption } from "../../../domain/entities/amc-questionnaires/StrataOption";
import { yesNoOption } from "../../../domain/entities/amc-questionnaires/YesNoOption";
import { yesNoUnknownOption } from "../../../domain/entities/amc-questionnaires/YesNoUnknownOption";
import { D2ProgramStageMetadata } from "../utils/MetadataHelper";
import {
    AMR_GLASS_PRO_AMC_DQ_PROGRAM_ID,
    codesByComponentAMCQuestionnaire,
    ComponentAMCQuestionnaireByTEAIds,
    ComponentAMCQuestionnaireCode,
    isStringInComponentAMCQuestionnaireCodes,
} from "./AMCQuestionnaireConstants";
import { D2Event, D2TrackedEntity } from "./D2Types";
import _ from "lodash";
import { dataSourceOption } from "../../../domain/entities/amc-questionnaires/DataSourceOption";

export function mapD2EventToComponentAMCQuestionnaire(d2Event: D2Event): ComponentAMCQuestionnaire {
    const fromMap = (key: keyof typeof codesByComponentAMCQuestionnaire) => getValueFromMap(key, d2Event);
    const getStratum = (key: keyof typeof codesByComponentAMCQuestionnaire) =>
        _.compact(
            fromMap(key)
                .split(",")
                .map(strata => strataOption.getSafeValue(strata))
        );
    const excludedSubstances = yesNoUnknownOption.getSafeValue(fromMap("excludedSubstances"));
    const typeOfDataReported = dataLevelOption.getSafeValue(fromMap("typeOfDataReported"));
    const sameAsUNPopulation = yesNoOption.getSafeValue(fromMap("sameAsUNPopulation"));
    const coverageVolumeWithinTheStratum = proportion50to100UnknownOption.getSafeValue(
        fromMap("coverageVolumeWithinTheStratum")
    );
    const sourcesOfDataReported = _.compact(
        fromMap("sourcesOfDataReported")
            .split(",")
            .map(source => dataSourceOption.getSafeValue(source))
    );
    if (
        !excludedSubstances ||
        !typeOfDataReported ||
        !sameAsUNPopulation ||
        !coverageVolumeWithinTheStratum ||
        !sourcesOfDataReported.length
    ) {
        throw new Error(`Missing required fields in D2Event for ComponentAMCQuestionnaire: ${JSON.stringify(d2Event)}`);
    }
    const antibacterialStratum = getStratum("antibacterialStratum");
    const antifungalStratum = getStratum("antifungalStratum");
    const antiviralStratum = getStratum("antiviralStratum");
    const antituberculosisStratum = getStratum("antituberculosisStratum");
    const antimalariaStratum = getStratum("antimalariaStratum");
    if (
        !antibacterialStratum.length &&
        !antifungalStratum.length &&
        !antiviralStratum.length &&
        !antituberculosisStratum.length &&
        !antimalariaStratum.length
    ) {
        throw new Error(
            `At least one stratum must be selected in D2Event for ComponentAMCQuestionnaire: ${JSON.stringify(d2Event)}`
        );
    }
    const componentAMCQuestionnaire = new ComponentAMCQuestionnaire({
        id: d2Event.event,
        antibacterialStratum: antibacterialStratum,
        antifungalStratum: antifungalStratum,
        antiviralStratum: antiviralStratum,
        antituberculosisStratum: antituberculosisStratum,
        antimalariaStratum: antimalariaStratum,
        excludedSubstances: excludedSubstances,
        listOfExcludedSubstances: fromMap("listOfExcludedSubstances"),
        typeOfDataReported: typeOfDataReported,
        procurementTypeOfDataReported: procurementLevelOption.getSafeValue(fromMap("procurementTypeOfDataReported")),
        mixedTypeOfData: fromMap("mixedTypeOfData"),
        sourcesOfDataReported: sourcesOfDataReported,
        commentsForDataSources: fromMap("commentsForDataSources"),
        sameAsUNPopulation: sameAsUNPopulation,
        unPopulation: fromMap("unPopulation") ? parseInt(fromMap("unPopulation")) : undefined,
        populationCovered: fromMap("populationCovered") ? parseFloat(fromMap("populationCovered")) : undefined,
        sourceOfNationalPopulation: nationalPopulationDataSourceOption.getSafeValue(
            fromMap("sourceOfNationalPopulation")
        ),
        nationalCoverage: fromMap("nationalCoverage") ? parseFloat(fromMap("nationalCoverage")) : undefined,
        unPopulationCoverage: fromMap("unPopulationCoverage") ? parseFloat(fromMap("unPopulationCoverage")) : undefined,
        commentOnNationalPopulation: fromMap("commentOnNationalPopulation"),
        coverageVolumeWithinTheStratum: coverageVolumeWithinTheStratum,
        commentOnCoverageWithinTheStratum: fromMap("commentOnCoverageWithinTheStratum"),
        status: "ACTIVE",
    });
    return componentAMCQuestionnaire;
}

function getValuesFromComponentAMCQuestionnaire(
    componentAMCQuestionnaire: ComponentAMCQuestionnaire
): Record<ComponentAMCQuestionnaireCode, string> {
    const values: Record<ComponentAMCQuestionnaireCode, string> = {
        AMR_GLASS_AMC_DE_ATB_STRATUM: componentAMCQuestionnaire.antibacterialStratum.join(","),
        AMR_GLASS_AMC_DE_ATF_STRATUM: componentAMCQuestionnaire.antifungalStratum.join(","),
        AMR_GLASS_AMC_DE_ATV_STRATUM: componentAMCQuestionnaire.antiviralStratum.join(","),
        AMR_GLASS_AMC_DE_ATT_STRATUM: componentAMCQuestionnaire.antituberculosisStratum.join(","),
        AMR_GLASS_AMC_DE_ATM_STRATUM: componentAMCQuestionnaire.antimalariaStratum.join(","),
        AMR_GLASS_AMC_DE_ATC_EXCL: componentAMCQuestionnaire.excludedSubstances,
        AMR_GLASS_AMC_DE_ATC_EXCL_DETAIL: componentAMCQuestionnaire.listOfExcludedSubstances ?? "",
        AMR_GLASS_AMC_DE_DATA_LEVEL: componentAMCQuestionnaire.typeOfDataReported,
        AMR_GLASS_AMC_DE_PROC_SUBTYPE: componentAMCQuestionnaire.procurementTypeOfDataReported ?? "",
        AMR_GLASS_AMC_DE_MIX_LEVEL_DETAIL: componentAMCQuestionnaire.mixedTypeOfData ?? "",
        AMR_GLASS_AMC_DE_DATA_SOURCE: componentAMCQuestionnaire.sourcesOfDataReported.join(","),
        AMR_GLASS_AMC_DE_DATA_SOURCE_COMMENT: componentAMCQuestionnaire.commentsForDataSources ?? "",
        AMR_GLASS_AMC_DE_POP_SAME_UN: componentAMCQuestionnaire.sameAsUNPopulation,
        AMR_GLASS_AMC_DE_POP_UN: componentAMCQuestionnaire.unPopulation?.toString() ?? "",
        AMR_GLASS_AMC_DE_POP_NAT: componentAMCQuestionnaire.populationCovered?.toString() ?? "",
        AMR_GLASS_AMC_DE_POP_NAT_SOURCE: componentAMCQuestionnaire.sourceOfNationalPopulation ?? "",
        AMR_GLASS_AMC_DE_POP_NAT_COV: componentAMCQuestionnaire.nationalCoverage?.toString() ?? "",
        AMR_GLASS_AMC_DE_POP_UN_COV: componentAMCQuestionnaire.unPopulationCoverage?.toString() ?? "",
        AMR_GLASS_AMC_DE_POP_NAT_COMMENT: componentAMCQuestionnaire.commentOnNationalPopulation ?? "",
        AMR_GLASS_AMC_DE_COV_DATA_STRATUM: componentAMCQuestionnaire.coverageVolumeWithinTheStratum,
        AMR_GLASS_AMC_DE_COV_DATA_STRATUM_COMMENT: componentAMCQuestionnaire.commentOnCoverageWithinTheStratum ?? "",
    };
    return values;
}

export function mapComponentAMCQuestionnaireToD2Event(
    componentAMCQuestionnaire: ComponentAMCQuestionnaire,
    stageMetadata: D2ProgramStageMetadata,
    trackedEntity: D2TrackedEntity
): D2TrackerEventToPost {
    const values = getValuesFromComponentAMCQuestionnaire(componentAMCQuestionnaire);

    const dataValues = stageMetadata.programStageDataElements.reduce<{ dataElement: string; value: string }[]>(
        (acc, dataElement) => {
            if (isStringInComponentAMCQuestionnaireCodes(dataElement.dataElement.code)) {
                const typedCode: ComponentAMCQuestionnaireCode = dataElement.dataElement.code;
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
        event: componentAMCQuestionnaire.id,
    };
    return d2Event;
}

function getValueFromMap(key: typeof ComponentAMCQuestionnaireByTEAIds["string"], d2Event: D2Event): string {
    // TODO: improve this? Map by code is possible? setup config for direct id lookup based on attr?
    const id = Object.entries(ComponentAMCQuestionnaireByTEAIds).find(([_, v]) => v === key)?.[0];
    if (!id) {
        return "";
    }
    return d2Event.dataValues?.find(dv => dv.dataElement === id)?.value ?? "";
}
