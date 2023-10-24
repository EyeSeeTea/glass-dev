import { Question, Questionnaire } from "../entities/Questionnaire";
import { Id } from "../entities/Ref";

interface AMCQuestionDisableMap {
    id: Id;
    questionsToDisable: Id[];
}

//Community sector levels
const sl_pub_com = "OyEpE54Ni9M";
const sl_pri_com = "iEiUvYuiZ67";
const sl_glo_com = "q0I3VtGouPX";
//Hospital sector levels
const sl_pub_hos = "uIeCXoTa56d";
const sl_pri_hos = "Owcxj6ieun0";
const sl_glo_hos = "u2YDekmc8YR";
//Total sector levels
const sl_glo_pub = "mQS6OUXAaRr";
const sl_glo_pri = "GWac7iDfHv3";
const sl_glo_tot = "mks6wWdSZRq";

const amcQuestionMap: AMCQuestionDisableMap[] = [
    //Community sector levels
    {
        id: sl_pub_com,
        questionsToDisable: [sl_glo_com, sl_glo_pub, sl_glo_tot],
    },
    {
        id: sl_pri_com,
        questionsToDisable: [sl_glo_com, sl_glo_pri, sl_glo_tot],
    },
    {
        id: sl_glo_com,
        questionsToDisable: [sl_pub_com, sl_pri_com, sl_glo_tot],
    },
    //Hospital sector levels
    {
        id: sl_pub_hos,
        questionsToDisable: [sl_glo_hos, sl_glo_pub, sl_glo_tot],
    },
    {
        id: sl_pri_hos,
        questionsToDisable: [sl_glo_hos, sl_glo_pri, sl_glo_tot],
    },
    {
        id: sl_glo_hos,
        questionsToDisable: [sl_pub_hos, sl_pri_hos, sl_glo_tot],
    },
    //Total sector levels
    {
        id: sl_glo_pub,
        questionsToDisable: [sl_glo_tot, sl_pub_com, sl_pub_hos],
    },
    {
        id: sl_glo_pri,
        questionsToDisable: [sl_glo_tot, sl_pri_com, sl_pri_hos],
    },
    {
        id: sl_glo_tot,
        questionsToDisable: [
            sl_glo_pub,
            sl_glo_pri,
            sl_pub_com,
            sl_pri_com,
            sl_glo_com,
            sl_pub_hos,
            sl_pri_hos,
            sl_glo_hos,
        ],
    },
];

export class ApplyProgramQuestionnaireValidationUseCase {
    public execute(moduleName: string, question: Question, questionnaire: Questionnaire): Questionnaire {
        //update question in questionnaire
        const sectionToBeUpdated = questionnaire?.sections.filter(sec =>
            sec.questions.find(q => q.id === question?.id)
        );
        if (sectionToBeUpdated) {
            const questionToBeUpdated = sectionToBeUpdated[0]?.questions.filter(q => q.id === question.id);
            if (questionToBeUpdated && questionToBeUpdated[0]) questionToBeUpdated[0].value = question.value;
        }

        const mappedQuestionUpdated = amcQuestionMap.find(qm => qm.id === question.id);
        //For AMC Questionnaire, apply intra Questionnaire validation logic.
        //If the Question is one of the level and sector selectors
        if (moduleName === "AMC" && mappedQuestionUpdated) {
            //For the currently updated question, enable/disable corresponding questions based on value.
            const currentQuestionUpdates = amcQuestionMap.filter(qm => qm.id === question.id)[0]?.questionsToDisable;
            currentQuestionUpdates?.map(cqm => {
                const questionToUpdate = _(questionnaire.sections.map(qs => qs.questions.find(q => q.id === cqm)))
                    .compact()
                    .value();
                if (questionToUpdate && questionToUpdate[0] && questionToUpdate[0].type === "singleCheck") {
                    questionToUpdate[0].disabled = question.value ? true : false;
                } else {
                    console.debug("An error occured, there should be a corresponding question");
                }
            });

            //For all other checked questions, disable corresponding questions
            const questionsToDisable = questionnaire.sections.flatMap(s => {
                console.debug(s);

                const enabledQs = s.questions.filter(
                    eq => eq.value === true && amcQuestionMap.some(qm => qm.id === eq.id)
                );

                const qToDisable = _(
                    enabledQs.flatMap(enQ => {
                        const disQ = amcQuestionMap.find(enQm => enQm.id === enQ.id)?.questionsToDisable;
                        return disQ;
                    })
                )
                    .compact()
                    .value();

                return qToDisable;
            });

            questionsToDisable.map(qd => {
                const questionToUpdate = _(questionnaire.sections.map(qs => qs.questions.find(q => q.id === qd)))
                    .compact()
                    .value();

                if (questionToUpdate && questionToUpdate[0] && questionToUpdate[0].type === "singleCheck") {
                    questionToUpdate[0].disabled = true;
                } else {
                    console.debug("An error occured, there should be a corresponding question");
                }
            });
        }

        return questionnaire;
    }
}
