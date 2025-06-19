import { Id } from "../../../../../domain/entities/Ref";

export type AMCQuestionnaireFormPageProps = {
    id?: Id;
    orgUnitId: Id;
    period: string;
    onSave?: () => void;
    onCancel?: () => void;
    isViewOnlyMode?: boolean;
    showFormButtons?: boolean;
};
