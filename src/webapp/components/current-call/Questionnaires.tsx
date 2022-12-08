import React from "react";
import styled from "styled-components";
import { glassColors } from "../../pages/app/themes/dhis2.theme";

export const Questionnaires: React.FC = () => {
    return (
        <QuestionnairesGrid>
            <QuestionnaireCard>
                <div className="head">
                    <h3>Questionnaire 1</h3>
                    <span className="desc">Description</span>
                </div>
                <span className="mand">mandatory</span>
                <span className="comp">Not completed</span>
                <div className="buttons">
                    <button>Report</button>
                    <button>Run Validation</button>
                </div>
            </QuestionnaireCard>
            <QuestionnaireCard>
                <div className="head">
                    <h3>Questionnaire 2</h3>
                    <span className="desc">Description</span>
                </div>
                <span className="comp">Not completed</span>
                <div className="buttons">
                    <button>Report</button>
                    <button>Run Validation</button>
                </div>
            </QuestionnaireCard>
            <QuestionnaireCard>
                <div className="head">
                    <h3>Questionnaire 3</h3>
                    <span className="desc">Description</span>
                </div>
                <span className="comp completed">Completed</span>
                <div className="buttons">
                    <button>Report</button>
                    <button>Run Validation</button>
                </div>
            </QuestionnaireCard>
        </QuestionnairesGrid>
    );
};


const QuestionnairesGrid = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 30px;
    .head {
       * { 
            display: block;
       }

    }
    .mand {
        margin: 0 0 0 auto;
    }
    .comp {
        width: 100%;
        text-transform: uppercase;
        font-size: 12px;
        color: ${glassColors.orange};
        &.completed {
            color: ${glassColors.green};
        }
    }
    .buttons {
        margin: 0 0 0 auto;
        display: flex;
        gap: 10px;
    }
`;

const QuestionnaireCard = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10px;
    padding: 20px;
    min-width: calc(50% - 15px);
    box-shadow: rgb(0 0 0 / 12%) 0px 1px 6px, rgb(0 0 0 / 12%) 0px 1px 4px;
    .mand {
        text-transform: uppercase;
        font-size: 12px;
        font-weight: 500;
        color: ${glassColors.mainPrimary};
    }
`;
