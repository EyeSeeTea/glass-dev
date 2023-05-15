import {
    CellRef,
    DataSource,
    DataSourceValue,
    RowDataSource,
    SheetRef,
    Template,
    ValueRef,
    setDataEntrySheet,
} from "../entities/Template";
import { ExcelRepository, ExcelValue } from "../repositories/ExcelRepository";

import { promiseMap } from "../../utils/promises";
import moment from "moment";
import { DataPackage, DataPackageData } from "../entities/data-entry/EGASPData";
export const isDefined = <T>(item: T) => item !== undefined && item !== null;
export function removeCharacters(value: unknown): string {
    return value === undefined ? "" : String(value).replace(/[^a-zA-Z0-9.]/g, "");
}

export class ExcelReader {
    constructor(private excelRepository: ExcelRepository) {}

    public async readTemplate(template: Template): Promise<DataPackage | undefined> {
        const { dataSources = [] } = template;
        const dataSourceValues = await this.getDataSourceValues(template, dataSources);
        const data: DataPackageData[] = [];

        // This should be refactored but need to validate with @tokland about TEIs
        for (const dataSource of dataSourceValues) {
            const row = await this.readByRow(template, dataSource);
            row.map(item => data.push(item));
        }

        const dataEntries = _(data)
            .groupBy(d =>
                [
                    d.dataForm,
                    d.id,
                    d.period,
                    d.orgUnit,
                    d.attribute,
                    d.trackedEntityInstance,
                    d.programStage,
                    d.group,
                ].join("@")
            )
            .map((items, key) => {
                const [dataForm = "", id, period, orgUnit, attribute, trackedEntityInstance, programStage, group] =
                    key.split("@");
                return {
                    group,
                    dataForm,
                    id: id ? String(id) : undefined,
                    orgUnit: String(orgUnit),
                    period: String(period),
                    attribute: attribute ? String(attribute) : undefined,
                    trackedEntityInstance: trackedEntityInstance ? String(trackedEntityInstance) : undefined,
                    programStage: programStage ? String(programStage) : undefined,
                    dataValues: _.flatMap(items, ({ dataValues }) => dataValues),
                    coordinate: items[0]?.coordinate,
                };
            })
            .compact()
            .value();
        return { type: "programs", dataEntries };
    }

    private async getDataSourceValues(template: Template, dataSources: DataSource[]): Promise<DataSourceValue[]> {
        const sheets = await this.excelRepository.getSheets(template.id);

        return _.flatMap(dataSources, dataSource => {
            return setDataEntrySheet(dataSource as RowDataSource, sheets);
        });
    }

    private async readByRow(template: Template, dataSource: RowDataSource): Promise<DataPackageData[]> {
        const cells = await this.excelRepository.getCellsInRange(template.id, dataSource.range);

        const values = await promiseMap(cells, async cell => {
            const value = cell ? await this.readCellValue(template, cell) : undefined;
            const optionId = await this.excelRepository.readCell(template.id, cell, { formula: true });
            if (!isDefined(value)) return undefined;

            const orgUnit = await this.readCellValue(template, dataSource.orgUnit, cell);

            const period = await this.readCellValue(template, dataSource.period, cell);
            if (!period) return undefined;

            const dataElement = await this.readCellValue(template, dataSource.dataElement, cell);
            if (!dataElement) return undefined;

            const dataFormId = await this.readCellValue(template, template.dataFormId, cell);
            if (!dataFormId) return undefined;

            const category = await this.readCellValue(template, dataSource.categoryOption, cell);
            const attribute = await this.readCellValue(template, dataSource.attribute, cell);
            const eventId = await this.readCellValue(template, dataSource.eventId, cell);

            const latitude = await this.readCellValue(template, dataSource.coordinates?.latitude, cell);
            const longitude = await this.readCellValue(template, dataSource.coordinates?.longitude, cell);
            const hasCoordinate = isDefined(latitude) && isDefined(longitude);

            return {
                group: this.excelRepository.buildRowNumber(cell.ref),
                dataForm: this.formatValue(dataFormId),
                id: eventId ? this.formatValue(eventId) : undefined,
                orgUnit: this.formatValue(orgUnit),
                period: this.formatValue(period),
                attribute: attribute ? this.formatValue(attribute) : undefined,
                coordinate: hasCoordinate
                    ? {
                          latitude: parseInt(this.formatValue(latitude)),
                          longitude: parseInt(this.formatValue(longitude)),
                      }
                    : undefined,
                dataValues: [
                    {
                        dataElement: this.formatValue(dataElement),
                        category: category ? this.formatValue(category) : undefined,
                        value: this.formatValue(value),
                        optionId: optionId ? removeCharacters(optionId) : undefined,
                    },
                ],
            };
        });

        return _.compact(values);
    }

    private async readCellValue(template: Template, ref?: SheetRef | ValueRef, relative?: CellRef) {
        if (!ref) return undefined;
        if (ref.type === "value") return ref.id;

        const cell = await this.excelRepository.findRelativeCell(template.id, ref, relative);
        if (cell) {
            const value = await this.excelRepository.readCell(template.id, cell);
            const formula = await this.excelRepository.readCell(template.id, cell, {
                formula: true,
            });

            const definedNames = await this.excelRepository.listDefinedNames(template.id);
            if (typeof formula === "string" && definedNames.includes(formula.replace(/^=/, ""))) {
                return removeCharacters(formula);
            }

            return value;
        }
    }

    private formatValue(value: ExcelValue | undefined): string {
        if (value instanceof Date) {
            return moment(value).format("YYYY-MM-DD[T]HH:mm");
        }

        return String(value ?? "");
    }
}
