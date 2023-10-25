import { DataValue } from "@eyeseetea/d2-api/api/trackerEvents";
import { Dhis2EventsDefaultRepository } from "../../data/repositories/Dhis2EventsDefaultRepository";
import { Id } from "../entities/Base";

import { Future, FutureData } from "../entities/Future";
import { GlassModule } from "../entities/GlassModule";
import { AMCDataQuestionnaire, QuestionnaireBase } from "../entities/Questionnaire";
import { QuestionnaireRepository } from "../repositories/QuestionnaireRepository";
import { amcQuestionMap } from "./ApplyProgramQuestionnaireValidationUseCase";

export class GetAMCQuestionnaireListUseCase {
    constructor(
        private questionnaireRepository: QuestionnaireRepository,
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository
    ) {}

    splitAMCDataQuestionnaire(
        questionnaire: QuestionnaireBase,
        orgUnitId: Id,
        year: string
    ): FutureData<QuestionnaireBase[]> {
        //1. Get all events for given org Unit and period.
        return this.dhis2EventsDefaultRepository
            .getAMCDataQuestionnaireEventsByOrgUnit(orgUnitId, year)
            .flatMap(events => {
                //Questionnaire has not been filled yet, display single questionnaire will all options enabled.
                if (events.length === 0) {
                    return Future.success([questionnaire]);
                } else {
                    //For each event, create a Questionnaire Base/Grid with
                    //sub questionnaire details filled in.

                    const splitAMCQuestionnaires: QuestionnaireBase[] = events.map((e, index) => {
                        //Get all Sub Questionnaire data elements
                        const subQuestionnaireDEs = e.dataValues.filter(dv =>
                            amcQuestionMap.some(qm => qm.id === dv.dataElement)
                        );

                        //Get all selected Sub Questionnaire data elements
                        const selectedSQDEs: DataValue[] = subQuestionnaireDEs.filter(sqde => sqde.value === "true");

                        return {
                            id: questionnaire.id,
                            name: `${questionnaire.name} - PART ${index + 1}`,
                            orgUnit: questionnaire.orgUnit,
                            year: questionnaire.year,
                            description: questionnaire.description,
                            isCompleted: false, //TO DO : fetch status of program.
                            isMandatory: questionnaire.isMandatory,
                            rules: [],
                            selectedSubQuestionnaires: _(
                                selectedSQDEs.map(de => {
                                    const deDetails = amcQuestionMap.find(qm => qm.id === de.dataElement);
                                    if (deDetails) return { id: deDetails?.id ?? "", name: deDetails?.name ?? "" };
                                })
                            )
                                .compact()
                                .value(),
                            eventId: e.event,
                        };
                    });

                    //Get all filled sub questionaires across events
                    const allSelectedSQs = splitAMCQuestionnaires.flatMap(q => q.selectedSubQuestionnaires);

                    //Get all disabled sub questionnaires based on AMC split logic.
                    const sqsToDisable: string[] = [];
                    allSelectedSQs.forEach(selSQ => {
                        if (selSQ) {
                            sqsToDisable.push(selSQ.id);
                            const sqMap = amcQuestionMap.find(qm => qm.id === selSQ.id);
                            if (sqMap) sqsToDisable.push(...sqMap.questionsToDisable);
                        }
                    });
                    splitAMCQuestionnaires.forEach(sq => {
                        sq.disabledSubQuestionnaires = sqsToDisable;
                    });

                    if (sqsToDisable.length < 9) {
                        splitAMCQuestionnaires.push(questionnaire);
                    }

                    return Future.success(splitAMCQuestionnaires);
                }
            });
    }

    getQuestionnaires(module: GlassModule, options: { orgUnitId: Id; year: string }) {
        return this.questionnaireRepository.getProgramList(module, options).flatMap(questionnaires => {
            const amcDataQuestionnaire = questionnaires.find(q => q.id === AMCDataQuestionnaire);
            if (amcDataQuestionnaire) {
                //For AMC - Data questionnaire, there is a special Questionnaire logic splitting required.
                return this.splitAMCDataQuestionnaire(amcDataQuestionnaire, options.orgUnitId, options.year).flatMap(
                    splitAMCQuestionnaires => {
                        const otherQuestionnaires = questionnaires.filter(q => q.id !== AMCDataQuestionnaire);
                        return Future.success([...splitAMCQuestionnaires, ...otherQuestionnaires]);
                    }
                );
            } else return Future.success(questionnaires);
        });
    }
}
