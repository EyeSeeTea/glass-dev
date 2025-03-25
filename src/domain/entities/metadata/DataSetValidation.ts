import { Id } from "../Ref";

export type DataSetValidation = {
    validationRuleViolations: Array<{
        id: number;
        validationRule: {
            name: string;
            id: Id;
        };
        period: {
            code: string;
            name: string;
            id: string;
        };
        organisationUnit: {
            code: string;
            name: string;
            id: Id;
        };
        attributeOptionCombo: {
            code: string;
            name: string;
            id: Id;
        };
        leftsideValue: number;
        rightsideValue: number;
        dayInPeriod: number;
        notificationSent: boolean;
    }>;
};
