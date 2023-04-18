import { Maybe } from "../../types/utils";
import { Code, Id } from "../../domain/entities/Base";

export type DataElement = DataElementBoolean | DataElementNumber | DataElementText;

interface DataElementBase {
    id: Id;
    name: string;
    code: Code;
    disaggregation: CategoryOptionCombo[];
}

export interface CategoryOptionCombo {
    id: Id;
    name: string;
}

export interface DataElementBoolean extends DataElementBase {
    type: "BOOLEAN";
    options: Maybe<Options>;
    storeFalse: boolean;
}

export interface DataElementNumber extends DataElementBase {
    type: "NUMBER";
    numberType: NumberType;
    options: Maybe<Options>;
}

export interface DataElementText extends DataElementBase {
    type: "TEXT";
    options: Maybe<Options>;
    multiline: boolean;
}

interface Options {
    id: Id; // On DHIS2: ID of categoryCombo or optionSet
    isMultiple: boolean;
    items: Option<string>[];
}

type NumberType =
    | "NUMBER"
    | "INTEGER_ZERO_OR_POSITIVE"
    | "INTEGER"
    | "INTEGER_NEGATIVE"
    | "INTEGER_POSITIVE"
    | "INTEGER_ZERO_OR_POSITIVE";

export type DataElementType = DataElement["type"];

export interface Option<Value> {
    name: string;
    value: Value;
}
