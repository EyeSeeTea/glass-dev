import React from "react";
import { Id } from "../../../../../domain/entities/Base";
import { AMCQuestionnaireFormType } from "../presentation-entities/AMCQuestionnaireFormType";
import { GeneralAMCQuestionnaireFormPage } from "./GeneralAMCQuestionnaireFormPage";
import { AMClassAMCQuestionnaireFormPage } from "./AMClassAMCQuestionnaireFormPage";
import { ComponentAMCQuestionnaireFormPage } from "./ComponentAMCQuestionnaireFormPage";

type AMCQuestionnaireFormPageProps = {
    formType: AMCQuestionnaireFormType;
    id?: Id;
    orgUnitId: Id;
    period: string;
    onSave?: () => void;
    onCancel?: () => void;
    isViewOnlyMode?: boolean;
    showFormButtons?: boolean;
};

export const AMCQuestionnaireFormPage: React.FC<AMCQuestionnaireFormPageProps> = React.memo(props => {
    const { formType, ...forwardProps } = props;
    switch (formType) {
        case "general-questionnaire":
            return <GeneralAMCQuestionnaireFormPage {...forwardProps} />;
        case "am-class-questionnaire":
            return <AMClassAMCQuestionnaireFormPage {...forwardProps} />;
        case "component-questionnaire":
            return <ComponentAMCQuestionnaireFormPage {...forwardProps} />;
        default:
            throw new Error(`Unsupported form type: ${formType}`);
    }
});
