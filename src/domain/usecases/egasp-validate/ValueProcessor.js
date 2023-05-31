import { isString } from "lodash";
import { trimQuotes, typeKeys } from "./RulesEngine";

export const errorCreator = message => details => ({
    ...details,
    message,
});

export const mapTypeToInterfaceFnName = {
    [typeKeys.TEXT]: "convertText",
    [typeKeys.LONG_TEXT]: "convertLongText",
    [typeKeys.LETTER]: "convertLetter",
    [typeKeys.PHONE_NUMBER]: "convertPhoneNumber",
    [typeKeys.EMAIL]: "convertEmail",
    [typeKeys.BOOLEAN]: "convertBoolean",
    [typeKeys.TRUE_ONLY]: "convertTrueOnly",
    [typeKeys.DATE]: "convertDate",
    [typeKeys.DATETIME]: "convertDateTime",
    [typeKeys.TIME]: "convertTime",
    [typeKeys.NUMBER]: "convertNumber",
    [typeKeys.INTEGER]: "convertInteger",
    [typeKeys.INTEGER_POSITIVE]: "convertIntegerPositive",
    [typeKeys.INTEGER_NEGATIVE]: "convertIntegerNegative",
    [typeKeys.INTEGER_ZERO_OR_POSITIVE]: "convertIntegerZeroOrPositive",
    [typeKeys.PERCENTAGE]: "convertPercentage",
    [typeKeys.URL]: "convertUrl",
    [typeKeys.AGE]: "convertAge",
    [typeKeys.FILE_RESOURCE]: "convertFile",
    [typeKeys.ORGANISATION_UNIT]: "convertOrganisationUnit",
    [typeKeys.IMAGE]: "convertImage",
    [typeKeys.USERNAME]: "convertUserName",
    [typeKeys.COORDINATE]: "convertCoordinate",
};

export class ValueProcessor {
    static errorMessages = {
        CONVERTER_NOT_FOUND: "converter for type is missing",
    };

    static addQuotesToValueIfString(value) {
        return isString(value) ? `'${value}'` : value;
    }

    constructor(converterObject) {
        this.converterObject = converterObject;
        this.processValue = this.processValue.bind(this);
    }

    processValue(value, type) {
        if (isString(value)) {
            value = trimQuotes(value);
        }

        // $FlowFixMe[prop-missing] automated comment
        const convertFnName = mapTypeToInterfaceFnName[type];
        if (!convertFnName) {
            console.warn(errorCreator(ValueProcessor.errorMessages.CONVERTER_NOT_FOUND)({ type }));
            return value;
        }

        // $FlowFixMe[incompatible-use] automated comment
        const convertedValue = ValueProcessor.addQuotesToValueIfString(this.converterObject[convertFnName](value));
        return convertedValue;
    }
}
