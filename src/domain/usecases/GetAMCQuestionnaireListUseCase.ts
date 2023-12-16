import { DataValue } from "@eyeseetea/d2-api/api/trackerEvents";
import { Dhis2EventsDefaultRepository } from "../../data/repositories/Dhis2EventsDefaultRepository";
import { Id } from "../entities/Base";

import { Future, FutureData } from "../entities/Future";
import { GlassModule } from "../entities/GlassModule";
import { AMCDataQuestionnaire, QuestionnaireBase } from "../entities/Questionnaire";
import { QuestionnaireRepository } from "../repositories/QuestionnaireRepository";
import { amcQuestionMap } from "./ApplyAMCQuestionUpdationUseCase";

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
            .getAMCDataQuestionnaireEvtsByOUAndPeriod(orgUnitId, year)
            .flatMap(events => {
                //Questionnaire has not been filled yet, display single questionnaire with all options enabled.
                if (events.length === 0) {
                    return Future.success([questionnaire]);
                } else {
                    //For each event, create a Questionnaire Base/Grid with
                    //sub questionnaire details filled in.
                    const splitAMCQuestionnaires: QuestionnaireBase[] = events.map((e, index) => {
                        //Get selected Sub Questionnaires
                        const selectedSQs: DataValue[] = e.dataValues.filter(
                            dv => amcQuestionMap.some(qm => qm.id === dv.dataElement) && dv.value === "true"
                        );

                        return {
                            id: questionnaire.id,
                            name: `${questionnaire.name} - PART ${index + 1}`,
                            orgUnit: questionnaire.orgUnit,
                            year: questionnaire.year,
                            description: questionnaire.description,
                            isCompleted: false, //TO DO : fetch status of program.
                            isMandatory: questionnaire.isMandatory,
                            rules: [],
                            subQuestionnaires: _(
                                selectedSQs.map(de => {
                                    const deDetails = amcQuestionMap.find(qm => qm.id === de.dataElement);
                                    if (deDetails) return { id: deDetails?.id ?? "", name: deDetails?.name ?? "" };
                                })
                            )
                                .compact()
                                .value(),
                            eventId: e.event,
                        };
                    });

                    //Check if any sub questionnaires are still enabled, requiring an empty Questionnaire form to be displayed
                    const allSelectedQuestiosMap = _(
                        splitAMCQuestionnaires.flatMap(q =>
                            q.subQuestionnaires?.flatMap(sq => {
                                return amcQuestionMap.filter(qm => qm.id === sq.id);
                            })
                        )
                    )
                        .compact()
                        .value();
                    const uniqSubQuestionnairesToDisable = _(
                        allSelectedQuestiosMap.flatMap(qm => qm.questionsToDisable)
                    )
                        .uniq()
                        .value();

                    const updatedSplitAMCQuestionnaires = splitAMCQuestionnaires.map(sq => {
                        sq.aggSubQuestionnaires = allSelectedQuestiosMap.map(sq => {
                            return { id: sq.id, name: sq.name };
                        });

                        return sq;
                    });

                    //Check If there is already an empty Questionnaire
                    let emptyQuestionnaireExists = false;

                    updatedSplitAMCQuestionnaires.forEach((q, index) => {
                        //Save the first questionnaire's event id as parent id,
                        //to populate general section of AMC Data Questionnaire.
                        if (index !== 0) {
                            q.parentEventId = updatedSplitAMCQuestionnaires[0]?.eventId;
                        }
                        if (!q.subQuestionnaires || q.subQuestionnaires.length === 0) {
                            emptyQuestionnaireExists = true;
                        }
                    });

                    //If all sub questionnaires are not filled
                    if (uniqSubQuestionnairesToDisable.length + allSelectedQuestiosMap.length < 9) {
                        //And an empty questionnaire does not already exist
                        if (!emptyQuestionnaireExists) {
                            //Add an empty questionnaire form
                            questionnaire.aggSubQuestionnaires = allSelectedQuestiosMap.map(sq => {
                                return { id: sq.id, name: sq.name };
                            });
                            //Save the first questionnaire's event id as parent id,
                            //to populate general section of AMC Data Questionnaire.
                            questionnaire.parentEventId = updatedSplitAMCQuestionnaires[0]?.eventId;
                            updatedSplitAMCQuestionnaires.push(questionnaire);
                        }
                    } else {
                        updatedSplitAMCQuestionnaires.map(cq => (cq.isCompleted = true));
                    }
                    return Future.success(updatedSplitAMCQuestionnaires);
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
