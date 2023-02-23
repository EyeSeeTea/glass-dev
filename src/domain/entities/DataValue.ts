import _ from "lodash";
import { Maybe } from "../../types/utils";
import { Id } from "./Base";
import { DataElement, DataElementBoolean, DataElementNumber, DataElementText } from "./DataElement";

interface DataValueBase {
    orgUnitId: Id;
    period: Period;
    categoryOptionComboId: Id;
}

export interface DataValueBoolean extends DataValueBase {
    type: "BOOLEAN";
    isMultiple: false;
    dataElement: DataElementBoolean;
    value: Maybe<boolean>;
}

export interface DataValueNumberSingle extends DataValueBase {
    type: "NUMBER";
    isMultiple: false;
    dataElement: DataElementNumber;
    value: string;
}

export interface DataValueNumberMultiple extends DataValueBase {
    type: "NUMBER";
    isMultiple: true;
    dataElement: DataElementNumber;
    values: string[];
}

export interface DataValueTextSingle extends DataValueBase {
    type: "TEXT";
    isMultiple: false;
    dataElement: DataElementText;
    value: string;
}

export interface DataValueTextMultiple extends DataValueBase {
    type: "TEXT";
    isMultiple: true;
    dataElement: DataElementText;
    values: string[];
}

export type DataValue =
    | DataValueBoolean
    | DataValueNumberSingle
    | DataValueNumberMultiple
    | DataValueTextSingle
    | DataValueTextMultiple;

export type Period = string;

type DataValueSelector = string; // `${dataElementId.categoryOptionComboId}`
export type DataValueStoreD = Record<DataValueSelector, DataValue>;

export class DataValueStore {
    constructor(private store: DataValueStoreD) {}

    static from(dataValues: DataValue[]): DataValueStore {
        const store = _.keyBy(dataValues, dv =>
            getStoreKey({
                dataElementId: dv.dataElement.id,
                categoryOptionComboId: dv.categoryOptionComboId,
            })
        );
        return new DataValueStore(store);
    }

    set(dataValue: DataValue): DataValueStore {
        const key = getStoreKey({
            dataElementId: dataValue.dataElement.id,
            categoryOptionComboId: dataValue.categoryOptionComboId,
        });
        return new DataValueStore({ ...this.store, [key]: dataValue });
    }

    getOrEmpty(dataElement: DataElement, base: DataValueBase): DataValue {
        const key = getStoreKey({
            dataElementId: dataElement.id,
            categoryOptionComboId: base.categoryOptionComboId,
        });

        return this.store[key] || getEmpty(dataElement, base);
    }
}

function getEmpty(dataElement: DataElement, base: DataValueBase): DataValue {
    switch (dataElement.type) {
        case "BOOLEAN":
            return { ...base, dataElement, type: "BOOLEAN", isMultiple: false, value: undefined };
        case "NUMBER":
            return dataElement.options?.isMultiple
                ? { ...base, dataElement, type: "NUMBER", isMultiple: true, values: [] }
                : { ...base, dataElement, type: "NUMBER", isMultiple: false, value: "" };
        case "TEXT":
            return dataElement.options?.isMultiple
                ? { ...base, dataElement, type: "TEXT", isMultiple: true, values: [] }
                : { ...base, dataElement, type: "TEXT", isMultiple: false, value: "" };
    }
}

function getStoreKey(options: { dataElementId: Id; categoryOptionComboId: Id }): DataValueSelector {
    return [options.dataElementId, options.categoryOptionComboId].join(".");
}
