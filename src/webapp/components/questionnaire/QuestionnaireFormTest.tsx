import React from "react";
import QuestionnaireForm from "./QuestionnaireForm";

export const QuestionnaireFormTest: React.FC = React.memo(() => {
    return (
        <QuestionnaireForm
            mode="edit"
            id="OYc0CihXiSn"
            orgUnitId="PdB4jUjgRj6"
            year={"2022"}
            onBackClick={console.debug}
            onSave={console.debug}
            validateAndUpdateDataSubmissionStatus={console.debug}
        />
    );
});
