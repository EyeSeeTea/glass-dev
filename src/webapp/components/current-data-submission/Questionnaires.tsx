import { useSnackbar } from "@eyeseetea/d2-ui-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { Button, LinearProgress } from "@material-ui/core";
import React from "react";
import styled from "styled-components";
import { Id } from "../../../domain/entities/Base";
import { QuestionnaireSimple } from "../../../domain/entities/Questionnaire";
import { useAppContext } from "../../contexts/app-context";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useGlassCaptureAccess } from "../../hooks/useGlassCaptureAccess";
import { useGlassModule } from "../../hooks/useGlassModule";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import QuestionnarieForm, { QuestionnarieFormProps } from "../questionnaire/QuestionnaireForm";

export const Questionnaires: React.FC = () => {
    const hasCurrentUserCaptureAccess = useGlassCaptureAccess();

    const { compositionRoot } = useAppContext();
    const module = useGlassModule(compositionRoot);
    const [questionnaires, setQuestionnaires] = React.useState<QuestionnaireSimple[]>();
    const snackbar = useSnackbar();

    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const { orgUnitId } = currentOrgUnitAccess;
    const year = 2022; // TODO: dynamic

    React.useEffect(() => {
        if (module.kind !== "loaded") return;

        return compositionRoot.questionnaires
            .getList(module.data, {
                orgUnitId: orgUnitId,
                year: year,
            })
            .run(setQuestionnaires, err => snackbar.error(err));
    }, [compositionRoot, snackbar, module, orgUnitId, year]);

    type QuestionnaireFormState = { mode: "closed" } | { mode: "show"; id: Id } | { mode: "edit"; id: Id };

    const [formState, setFormState] = React.useState<QuestionnaireFormState>({ mode: "closed" });

    const goToQuestionnarie = React.useCallback(
        (questionnaire: QuestionnaireSimple, options: { mode: "show" | "edit" }) => {
            setFormState({ mode: options.mode, id: questionnaire.id });
        },
        []
    );

    const closeQuestionnarie = React.useCallback(() => {
        setFormState({ mode: "closed" });
    }, []);

    const updateQuestionnarie = React.useCallback<QuestionnarieFormProps["onSave"]>(updatedQuestionnaire => {
        setQuestionnaires(prevQuestionnaries =>
            prevQuestionnaries?.map(questionnarire =>
                questionnarire.id === updatedQuestionnaire.id ? updatedQuestionnaire : questionnarire
            )
        );
    }, []);

    if (!questionnaires) return <LinearProgress />;

    if (formState.mode !== "closed") {
        return (
            <QuestionnarieForm
                id={formState.id}
                orgUnitId={orgUnitId}
                year={year}
                onBackClick={closeQuestionnarie}
                disabled={formState.mode === "show"}
                onSave={updateQuestionnarie}
            />
        );
    }

    return (
        <QuestionnairesGrid>
            {questionnaires.map(questionnaire => (
                <QuestionnaireCard key={questionnaire.id}>
                    <div className="head">
                        <h3>{questionnaire.name}</h3>
                        <span className="desc">{questionnaire.description}</span>
                    </div>

                    {questionnaire.isMandatory && <span className="mand">{i18n.t("mandatory")}</span>}

                    {questionnaire.isCompleted ? (
                        <span className="comp completed">{i18n.t("Completed")}</span>
                    ) : (
                        <span className="comp">{i18n.t("Not completed")}</span>
                    )}

                    <div className="buttons">
                        {questionnaire.isCompleted && (
                            <Button onClick={() => goToQuestionnarie(questionnaire, { mode: "show" })}>
                                {i18n.t("View")}
                            </Button>
                        )}

                        <Button
                            variant="contained"
                            color="primary"
                            disabled={!hasCurrentUserCaptureAccess}
                            onClick={() => goToQuestionnarie(questionnaire, { mode: "edit" })}
                        >
                            {i18n.t("Go")}
                        </Button>
                    </div>
                </QuestionnaireCard>
            ))}
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
        margin: 20px 0 0 auto;
        display: flex;
        gap: 10px;
        button {
            padding: 8px 16px;
        }
    }
`;

const QuestionnaireCard = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10px;
    padding: 20px;
    width: calc(50% - 60px);
    box-shadow: rgb(0 0 0 / 12%) 0px 1px 6px, rgb(0 0 0 / 12%) 0px 1px 4px;
    .mand {
        text-transform: uppercase;
        font-size: 12px;
        font-weight: 500;
        color: ${glassColors.mainPrimary};
    }
`;
