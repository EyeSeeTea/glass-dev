import _ from "lodash";
import { Id } from "../../domain/entities/Base";
import { DataValue, Period } from "../../domain/entities/DataValue";
import { DataValueRepository } from "../../domain/repositories/DataValueRepository";
import { D2Api, DataValueSetsDataValue } from "../../types/d2-api";
import { Dhis2DataElement } from "./D2DataElement";

export class DataValueD2Repository implements DataValueRepository {
    constructor(private api: D2Api) {}

    async get(options: { dataSetId: Id; orgUnitId: Id; period: Period }): Promise<DataValue[]> {
        const { dataValues } = await this.api.dataValues
            .getSet({
                dataSet: [options.dataSetId],
                orgUnit: [options.orgUnitId],
                period: [options.period],
            })
            .getData();

        const dataElements = await this.getDataElements(dataValues);

        return _(dataValues)
            .map((dv): DataValue | null => {
                const dataElement = dataElements[dv.dataElement];
                if (!dataElement) {
                    console.error(`Data element not found: ${dv.dataElement}`);
                    return null;
                }

                const selector = {
                    orgUnitId: dv.orgUnit,
                    period: dv.period,
                    categoryOptionComboId: dv.categoryOptionCombo,
                };

                const isMultiple = dataElement.options?.isMultiple;

                switch (dataElement.type) {
                    case "TEXT":
                        return isMultiple
                            ? { type: "TEXT", isMultiple: true, dataElement, values: getValues(dv.value), ...selector }
                            : {
                                  type: "TEXT",
                                  isMultiple: false,
                                  dataElement,
                                  value: dv.value,
                                  ...selector,
                              };
                    case "NUMBER":
                        return isMultiple
                            ? {
                                  type: "NUMBER",
                                  isMultiple: true,
                                  dataElement,
                                  values: getValues(dv.value),
                                  ...selector,
                              }
                            : {
                                  type: "NUMBER",
                                  isMultiple: false,
                                  dataElement,
                                  value: dv.value,
                                  ...selector,
                              };
                    case "BOOLEAN":
                        return {
                            type: "BOOLEAN",
                            isMultiple: false,
                            dataElement,
                            value: dv.value === "true",
                            ...selector,
                        };
                }
            })
            .compact()
            .value();
    }

    private async getDataElements(dataValues: DataValueSetsDataValue[]) {
        const dataElementIds = dataValues.map(dv => dv.dataElement);
        return new Dhis2DataElement(this.api).get(dataElementIds);
    }

    async save(dataValue: DataValue): Promise<void> {
        const valueStr = this.getStrValue(dataValue);
        return this.api.dataValues
            .post({
                ou: dataValue.orgUnitId,
                pe: dataValue.period,
                de: dataValue.dataElement.id,
                value: valueStr,
            })
            .getData();
    }

    private getStrValue(dataValue: DataValue): string {
        switch (dataValue.type) {
            case "BOOLEAN":
                return dataValue.value ? "true" : dataValue.value === false ? "false" : "";
            case "NUMBER":
            case "TEXT":
                return dataValue.isMultiple ? dataValue.values.join("; ") : dataValue.value;
        }
    }
}

function getValues(s: string): string[] {
    return _(s)
        .split(";")
        .map(s => s.trim())
        .compact()
        .value();
}
