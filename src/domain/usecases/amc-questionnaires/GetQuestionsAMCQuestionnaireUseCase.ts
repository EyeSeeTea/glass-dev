import { UseCase } from "../../../CompositionRoot";
import { AMCQuestionnaireQuestions } from "../../entities/amc-questionnaires/AMCQuestionnaireQuestions";
import { FutureData } from "../../entities/Future";
import { QuestionsAMCQuestionnaireRepository } from "../../repositories/amc-questionnaires/QuestionsAMCQuestionnaireRepository";

export class GetQuestionsAMCQuestionnaireUseCase implements UseCase {
    constructor(private questionsAMCQuestionnaireRepository: QuestionsAMCQuestionnaireRepository) {}

    public execute(): FutureData<AMCQuestionnaireQuestions> {
        return this.questionsAMCQuestionnaireRepository.get();
    }
}
