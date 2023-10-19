import { Dhis2EventsDefaultRepository } from "../../data/repositories/Dhis2EventsDefaultRepository";
import { Id } from "../entities/Base";
import { Future, FutureData } from "../entities/Future";
import { GlassModule } from "../entities/GlassModule";
import { AMCDataQuestionnaire, QuestionnaireBase } from "../entities/Questionnaire";
import { QuestionnaireRepository } from "../repositories/QuestionnaireRepository";

export class GetQuestionnaireListUseCase {
    constructor(
        private questionnaireRepository: QuestionnaireRepository,
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository
    ) {}

    splitAMCDataQuestionnaire(
        questionnaire: QuestionnaireBase,
        orgUnitId: Id,
        year: string
    ): FutureData<QuestionnaireBase[]> {
        // const splitAMCQuestionnaires: QuestionnaireBase[] = [];
        //1. Get all events for given org Unit and period.
        return this.dhis2EventsDefaultRepository
            .getAMCDataQuestionnaireEventsByOrgUnit(orgUnitId, year)
            .flatMap(events => {
                //Questionnaire has not been filled yet, display single questionnaire will all options enabled.
                if (events.length === 0) {
                    return Future.success([questionnaire]);
                } else {
                    return Future.success([questionnaire]);
                }
            });
    }

    execute(module: GlassModule, options: { orgUnitId: Id; year: string }, captureAccess: boolean) {
        if (module.questionnairesType === "Dataset")
            return this.questionnaireRepository.getDatasetList(module, options, captureAccess);
        else {
            return this.questionnaireRepository.getProgramList(module, options).flatMap(questionnaires => {
                const amcDataQuestionnaire = questionnaires.find(q => q.id === AMCDataQuestionnaire);
                if (amcDataQuestionnaire) {
                    //For AMC - Data questionnaire, there is a special Questionnaire splitting required.
                    return this.splitAMCDataQuestionnaire(
                        amcDataQuestionnaire,
                        options.orgUnitId,
                        options.year
                    ).flatMap(splitAMCQuestionnaires => {
                        const otherQuestionnaires = questionnaires.filter(q => q.id !== AMCDataQuestionnaire);
                        return Future.success([...splitAMCQuestionnaires, ...otherQuestionnaires]);
                    });
                } else return Future.success(questionnaires);
            });
        }
    }
}
