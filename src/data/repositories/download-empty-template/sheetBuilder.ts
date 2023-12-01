//@ts-ignore
import * as Excel from "excel4node";
import i18n from "@eyeseetea/d2-ui-components/locales";
import _ from "lodash";
import "lodash.product";
import { defaultColorScale } from "./utils/colors";
import { GeneratedTemplate } from "../../../domain/entities/Template";
import { Id, NamedRef } from "../../../domain/entities/Ref";
import { getTemplateId } from "../ExcelPopulateDefaultRepository";

const maxRow = 1048576;
// Excel shows all empty rows, limit the maximum number of TEIs
const maxTeiRows = 1024;

const dateFormats: Record<string, string> = {
    DATE: "YYYY-MM-DD",
    TIME: "HH:mm",
    DATETIME: "YYYY-MM-DDTHH:mm",
};

const dateFormatInfo = `\n(${dateFormats["DATE"]})`;

export interface SheetBuilderParams {
    element: any;
    metadata: any;
    elementMetadata: Map<any, any>;
    organisationUnits: {
        id: string;
        displayName: string;
        translations: any;
    }[];
    rawMetadata: any;
    language: string;
    template: GeneratedTemplate;
    settings: Record<string, any>;
    downloadRelationships: boolean;
    splitDataEntryTabsBySection: boolean;
    useCodesForMetadata: boolean;
}
const teiSheetName = "TEI Instances";
function isTrackerProgram(element: any) {
    return element.type === "trackerPrograms";
}

function getValidSheetName(name: string, maxLength = 31) {
    // Invalid chars: \ / * ? : [ ]
    // Maximum length: 31
    return name.replace(/[\\/*?:[\]]/g, "").slice(0, maxLength);
}

function withSheetNames(objs: NamedRef[], options: any = {}) {
    const { prefix } = options;

    return objs.filter(Boolean).map((obj, idx: number) => {
        const baseSheetName = _([prefix, `(${idx + 1}) ${obj.name}`])
            .compact()
            .join(" ");

        return {
            ...obj,
            sheetName: getValidSheetName(baseSheetName),
        };
    });
}

function getRelationshipTypeKey(relationshipType: any, key: any) {
    return ["relationshipType", relationshipType.id, key].join("-");
}

export class SheetBuilder {
    private workbook: any;
    private validations: any;
    private instancesSheet: any;
    private programStageSheets: any;
    private relationshipsSheets: any;

    private legendSheet: any;
    private validationSheet: any;
    private metadataSheet: any;
    private instancesSheetValuesRow = 0;

    constructor(private builder: SheetBuilderParams) {
        this.workbook = new Excel.Workbook();
        this.validations = new Map();
    }

    public generate(programId: Id) {
        const { builder } = this;
        const { element } = builder;
        const dataEntrySheetsInfo: Array<{ sheet: any }> = [];

        if (isTrackerProgram(element)) {
            const { elementMetadata: metadata } = builder;
            this.instancesSheet = this.workbook.addWorksheet(teiSheetName);
            this.programStageSheets = {};
            this.relationshipsSheets = [];

            // ProgramStage sheets
            const programStages = this.getProgramStages().map(programStageT => metadata.get(programStageT.id));

            withSheetNames(programStages).forEach((programStage: any) => {
                const sheet = this.workbook.addWorksheet(programStage.sheetName);
                this.programStageSheets[programStage.id] = sheet;
            });

            if (builder.downloadRelationships) {
                // RelationshipType sheets
                withSheetNames(builder.metadata.relationshipTypes, { prefix: "Rel" }).forEach(
                    (relationshipType: any) => {
                        const sheet = this.workbook.addWorksheet(relationshipType.sheetName);
                        this.relationshipsSheets.push([relationshipType, sheet]);
                    }
                );
            }
        } else {
            const dataEntrySheet = this.workbook.addWorksheet("Data Entry");
            dataEntrySheetsInfo.push({ sheet: dataEntrySheet });
        }

        this.legendSheet = this.workbook.addWorksheet("Legend", protectedSheet);
        this.validationSheet = this.workbook.addWorksheet("Validation", protectedSheet);
        this.metadataSheet = this.workbook.addWorksheet("Metadata", protectedSheet);

        this.fillValidationSheet();
        this.fillMetadataSheet();
        this.fillLegendSheet();

        if (isTrackerProgram(element)) {
            this.fillInstancesSheet(programId);
            this.fillProgramStageSheets();
            this.fillRelationshipSheets();
        } else {
            dataEntrySheetsInfo.forEach(({ sheet }) => {
                this.fillDataEntrySheet(sheet, programId);
            });
        }

        // Add template version
        this.workbook.definedNameCollection.addDefinedName({
            name: `Version_${this.getVersion(programId)}`, // Restrict to [a-zA-Z0-9_] characters
            refFormula: "Metadata!A1", // Excel needs a formula, reference an always existing cell
        });

        return this.workbook;
    }

    private fillRelationshipSheets() {
        const { element: program } = this.builder;

        _.forEach(this.relationshipsSheets, ([relationshipType, sheet]) => {
            sheet.cell(1, 1).formula(`=_${relationshipType.id}`).style(baseStyle);

            ["from", "to"].forEach((key, idx) => {
                const constraint = relationshipType.constraints[key];
                const columnId = idx + 1;

                const oppositeConstraint = relationshipType.constraints[key === "from" ? "to" : "from"];
                const isFromEvent = oppositeConstraint.type === "eventInProgram";

                switch (constraint.type) {
                    case "tei": {
                        const validation =
                            isFromEvent || constraint.program?.id === program.id
                                ? this.getTeiIdValidation()
                                : this.validations.get(getRelationshipTypeKey(relationshipType, key));
                        const columnName = `${_.startCase(key)} TEI (${constraint.name})`;
                        this.createColumn(sheet, 2, columnId, columnName, null, validation);
                        sheet.column(columnId).setWidth(columnName.length + 10);
                        break;
                    }
                    case "eventInProgram": {
                        const validation = this.validations.get(getRelationshipTypeKey(relationshipType, key));
                        const columnName =
                            `${_.startCase(key)} event in program ${constraint.program.name}` +
                            (constraint.programStage ? ` (${constraint.programStage.name})` : "");
                        this.createColumn(sheet, 2, columnId, columnName, null, validation);
                        sheet.column(columnId).setWidth(columnName.length + 10);
                        break;
                    }
                    default:
                        throw new Error(`Unsupported constraint: ${constraint.type}`);
                }
            });
        });
    }

    private getTeiIdValidation() {
        return `='${teiSheetName}'!$A$${this.instancesSheetValuesRow}:$A$${maxTeiRows}`;
    }

    private fillProgramStageSheets() {
        const { elementMetadata: metadata, element: program, settings } = this.builder;

        const programStages = this.getProgramStages().map(programStageT => metadata.get(programStageT.id));
        const programStageSheets = withSheetNames(programStages);

        _.forEach(this.programStageSheets, (sheet, programStageId) => {
            const programStageT = { id: programStageId };
            const programStage = metadata.get(programStageId);
            const settingsFilter = settings.programStageFilter[programStage.id];

            const rowOffset = 0;
            const sectionRow = rowOffset + 1;
            const itemRow = rowOffset + 2;

            // Freeze and format column titles
            sheet.row(itemRow).freeze();
            sheet.row(sectionRow).setHeight(30);
            sheet.row(itemRow).setHeight(50);

            sheet.cell(sectionRow, 1).formula(`=_${programStageId}`).style(baseStyle);

            // Add column titles
            let columnId = 1;
            let groupId = 0;

            this.createColumn(sheet, itemRow, columnId++, i18n.t("Event id", { lng: this.builder.language }));

            this.createColumn(
                sheet,
                itemRow,
                columnId++,
                i18n.t("TEI Id", { lng: this.builder.language }),
                null,
                this.getTeiIdValidation()
            );

            const { code: attributeCode } = metadata.get(program.categoryCombo?.id);
            const optionsTitle =
                attributeCode !== "default"
                    ? `_${program.categoryCombo.id}`
                    : i18n.t("Options", { lng: this.builder.language });

            this.createColumn(sheet, itemRow, columnId++, optionsTitle, null, this.validations.get("options"));

            this.createColumn(
                sheet,
                itemRow,
                columnId++,
                `${
                    programStage.executionDateLabel
                        ? i18n.t(programStage.executionDateLabel, {
                              lng: this.builder.language,
                          })
                        : i18n.t("Date", { lng: this.builder.language })
                } *` + dateFormatInfo
            );

            // Include attribute look-up from TEI Instances sheet
            _.forEach(settingsFilter?.attributesIncluded, ({ id: attributeId }) => {
                const attribute = metadata.get(attributeId);
                if (!attribute) return;

                this.createColumn(sheet, itemRow, columnId, `_${attribute.id}`);

                const colName = Excel.getExcelAlpha(columnId);
                const lookupFormula = `IFERROR(INDEX('${teiSheetName}'!$A$5:$ZZ$${maxTeiRows},MATCH(INDIRECT("B" & ROW()),'${teiSheetName}'!$A$5:$A$${maxTeiRows},0),MATCH(${colName}$${itemRow},'${teiSheetName}'!$A$5:$ZZ$5,0)),"")`;

                sheet.cell(itemRow + 1, columnId, maxTeiRows, columnId).formula(lookupFormula);

                sheet.addDataValidation({
                    type: "textLength",
                    error: "This cell cannot be changed",
                    sqref: `${colName}${itemRow + 1}:${colName}${maxRow}`,
                    operator: "equal",
                    formulas: [`${lookupFormula.length}`],
                });

                columnId++;
            });

            // Include external data element look-up from Other program stage sheets
            _.forEach(settingsFilter?.externalDataElementsIncluded, ({ id }) => {
                const [programStageId, dataElementId] = id.split(".");
                const programStageSheet = programStageSheets.find(({ id }) => id === programStageId)?.sheetName;
                const dataElement = metadata.get(dataElementId);
                if (!programStageSheet || !dataElement) return;

                this.createColumn(sheet, itemRow, columnId, `_${dataElement.id}`);

                const colName = Excel.getExcelAlpha(columnId);
                const lookupFormula = `IFERROR(INDEX('${programStageSheet}'!$B$2:$ZZ$${maxTeiRows},MATCH(INDIRECT("B" & ROW()),'${programStageSheet}'!$B$2:$B$${maxTeiRows},0),MATCH(${colName}$${itemRow},'${programStageSheet}'!$B$2:$ZZ$2,0)),"")`;

                sheet.cell(itemRow + 1, columnId, maxTeiRows, columnId).formula(lookupFormula);

                sheet.addDataValidation({
                    type: "textLength",
                    error: "This cell cannot be changed",
                    sqref: `${colName}${itemRow + 1}:${colName}${maxRow}`,
                    operator: "equal",
                    formulas: [`${lookupFormula.length}`],
                });

                columnId++;
            });

            if (programStage.programStageSections.length === 0) {
                programStage.programStageSections.push({
                    dataElements: programStage.programStageDataElements.map((e: any) => e.dataElement),
                    id: programStageT.id,
                });
            }

            _.forEach(programStage.programStageSections, programStageSectionT => {
                const programStageSection = programStageSectionT.dataElements
                    ? programStageSectionT
                    : metadata.get(programStageSectionT.id);
                const firstColumnId = columnId;

                _.forEach(programStageSection.dataElements, dataElementT => {
                    const dataElement = metadata.get(dataElementT.id);
                    if (!dataElement) {
                        console.error(`Data element not found ${dataElementT.id}`);
                        return;
                    }

                    const dataElementsExcluded = settingsFilter?.dataElementsExcluded ?? [];
                    const isColumnExcluded = _.some(dataElementsExcluded, dataElementExcluded =>
                        _.isEqual(dataElementExcluded, { id: dataElement.id })
                    );
                    if (isColumnExcluded) return;

                    const { name, description } = this.translate(dataElement);

                    const validation = dataElement.optionSet ? dataElement.optionSet.id : dataElement.valueType;
                    this.createColumn(
                        sheet,
                        itemRow,
                        columnId,
                        `_${dataElement.id}`,
                        groupId,
                        this.validations.get(validation)
                    );
                    sheet.column(columnId).setWidth(name.length / 2.5 + 10);

                    if (dataElement.url !== undefined) {
                        sheet.cell(itemRow, columnId).link(dataElement.url).formula(`=_${dataElement.id}`);
                    }

                    if (description !== undefined) {
                        sheet.cell(itemRow, columnId).comment(description, {
                            height: "100pt",
                            width: "160pt",
                        });
                    }

                    columnId++;
                });

                const noColumnAdded = columnId === firstColumnId;
                if (noColumnAdded) return;

                if (firstColumnId < columnId)
                    sheet
                        .cell(sectionRow, firstColumnId, sectionRow, columnId - 1, true)
                        .formula(`_${programStageSection.id}`)
                        .style(this.groupStyle(groupId));

                groupId++;
            });
        });
    }

    private fillInstancesSheet(programId: Id) {
        const { element: program } = this.builder;
        const { rowOffset = 0 } = this.builder.template;
        const sheet = this.instancesSheet;

        // Add cells for themes
        const sectionRow = rowOffset + 1;
        const itemRow = rowOffset + 2;

        // Hide theme rows by default
        for (let row = 1; row < sectionRow; row++) {
            sheet.row(row).hide();
        }

        // Freeze and format column titles
        sheet.row(itemRow).freeze();
        sheet.row(sectionRow).setHeight(30);
        sheet.row(itemRow).setHeight(50);

        // Add template version
        sheet
            .cell(1, 1)
            .string(`Version: ${this.getVersion(programId)}`)
            .style(baseStyle);

        this.createColumn(sheet, itemRow, 1, i18n.t("TEI id", { lng: this.builder.language }));

        this.createColumn(
            sheet,
            itemRow,
            2,
            i18n.t("Org Unit *", { lng: this.builder.language }),
            null,
            this.validations.get("organisationUnits"),
            i18n.t(
                "This site does not exist in DHIS2, please talk to your administrator to create this site before uploading data",
                { lng: this.builder.language }
            )
        );

        this.createFeatureTypeColumn({ program, sheet, itemRow, columnId: 3 });

        this.createColumn(
            sheet,
            itemRow,
            4,
            `${
                program.enrollmentDateLabel
                    ? i18n.t(program.enrollmentDateLabel, { lng: this.builder.language })
                    : i18n.t("Enrollment Date", { lng: this.builder.language })
            } *` + dateFormatInfo
        );

        this.createColumn(
            sheet,
            itemRow,
            5,
            (program.incidentDateLabel
                ? i18n.t(program.incidentDateLabel, { lng: this.builder.language })
                : i18n.t("Incident Date", { lng: this.builder.language })) + dateFormatInfo
        );

        const programAttributes = program.programTrackedEntityAttributes || [];
        this.instancesSheetValuesRow = itemRow + 1;

        let idx = 0;
        programAttributes.forEach((attribute: any) => {
            const tea = attribute.trackedEntityAttribute;
            if (tea.confidential) return;
            const validationId = tea.optionSet ? tea.optionSet.id : tea.valueType;
            const validation = this.validations.get(validationId);
            this.createColumn(sheet, itemRow, 6 + idx, `_${tea.id}`, 1, validation);
            idx++;
        });
    }
    private createFeatureTypeColumn(options: { program: any; sheet: any; itemRow: number; columnId: number }) {
        const { program, sheet, itemRow, columnId } = options;
        const header = this.getFeatureTypeHeader(program);
        const defaultHeader = i18n.t("No geometry", { lng: this.builder.language });

        this.createColumn(sheet, itemRow, 3, header || defaultHeader);
        if (!header) sheet.column(columnId).hide();
    }
    private getFeatureTypeHeader(program: any): string | undefined {
        const { featureType } = program.trackedEntityType;
        const opts = { lng: this.builder.language };

        switch (featureType) {
            case "POINT":
                return [i18n.t("Point in map", opts), "([LON, LAT])"].join("\n");
            case "POLYGON":
                return [i18n.t("Polygon in map", opts), "([[LON1, LAT1], [LON2, LAT2], ...])"].join("\n");
            default:
                return undefined;
        }
    }

    private getVersion(programId: Id) {
        const { element } = this.builder;
        const defaultVersion = getTemplateId(programId);
        return getObjectVersion(element) ?? defaultVersion;
    }

    private fillLegendSheet() {
        const { elementMetadata: metadata, rawMetadata } = this.builder;
        const legendSheet = this.legendSheet;

        // Freeze and format column titles
        legendSheet.row(2).freeze();
        legendSheet.column(1).setWidth(50);
        legendSheet.column(2).setWidth(50);
        legendSheet.column(3).setWidth(20);
        legendSheet.column(4).setWidth(20);
        legendSheet.column(5).setWidth(40);

        // Add column titles
        legendSheet
            .cell(1, 1, 2, 1, true)
            .string(i18n.t("Name", { lng: this.builder.language }))
            .style(baseStyle);
        legendSheet
            .cell(1, 2, 2, 2, true)
            .string(i18n.t("Description", { lng: this.builder.language }))
            .style(baseStyle);
        legendSheet
            .cell(1, 3, 2, 3, true)
            .string(i18n.t("Value Type", { lng: this.builder.language }))
            .style(baseStyle);
        legendSheet
            .cell(1, 4, 2, 4, true)
            .string(i18n.t("Option Set", { lng: this.builder.language }))
            .style(baseStyle);
        legendSheet
            .cell(1, 5, 2, 5, true)
            .string(i18n.t("Possible Values", { lng: this.builder.language }))
            .style(baseStyle);

        let rowId = 3;
        _.sortBy(rawMetadata["dataElements"], ["name"]).forEach(item => {
            const { name, description } = this.translate(item);
            const optionSet = metadata.get(item.optionSet?.id);
            const { name: optionSetName } = this.translate(optionSet);
            const options = _.slice(optionSet?.options ?? [], 0, 25)
                .map(({ id }: any) => this.translate(metadata.get(id)).name)
                .join(", ");

            legendSheet.cell(rowId, 1).string(name ?? "");
            legendSheet.cell(rowId, 2).string(description ?? "");
            legendSheet.cell(rowId, 3).string(item?.valueType ?? "");
            legendSheet.cell(rowId, 4).string(optionSetName ?? "");
            legendSheet.cell(rowId, 5).string(options ?? "");

            rowId++;
        });
    }

    private fillValidationSheet() {
        const { organisationUnits, element, rawMetadata, elementMetadata } = this.builder;
        const validationSheet = this.validationSheet;

        // Freeze and format column titles
        validationSheet.row(2).freeze();

        // Add column titles
        let rowId = 2;
        let columnId = 1;
        validationSheet.cell(rowId++, columnId).string(i18n.t("Organisation Units", { lng: this.builder.language }));
        _.forEach(organisationUnits, orgUnit => {
            validationSheet.cell(rowId++, columnId).formula(`_${orgUnit.id}`);
        });
        this.validations.set(
            "organisationUnits",
            `=Validation!$${Excel.getExcelAlpha(columnId)}$3:$${Excel.getExcelAlpha(columnId)}$${rowId}`
        );

        rowId = 2;
        columnId++;
        validationSheet.cell(rowId++, columnId).string(i18n.t("Options", { lng: this.builder.language }));
        const dataSetOptionComboId = element.categoryCombo.id;
        elementMetadata.forEach(e => {
            if (e.type === "categoryOptionCombos" && e.categoryCombo.id === dataSetOptionComboId) {
                validationSheet.cell(rowId++, columnId).formula(`_${e.id}`);
            }
        });
        this.validations.set(
            "options",
            `=Validation!$${Excel.getExcelAlpha(columnId)}$3:$${Excel.getExcelAlpha(columnId)}$${rowId}`
        );

        const optionSets = _.toArray(rawMetadata.optionSets);

        _.forEach(optionSets, optionSet => {
            rowId = 2;
            columnId++;

            validationSheet.cell(rowId++, columnId).formula(`_${optionSet.id}`);
            _.forEach(optionSet.options, option => {
                validationSheet.cell(rowId++, columnId).formula(`_${option.id}`);
            });
            this.validations.set(
                optionSet.id,
                `=Validation!$${Excel.getExcelAlpha(columnId)}$3:$${Excel.getExcelAlpha(columnId)}$${rowId}`
            );
        });

        rowId = 2;
        columnId++;
        validationSheet.cell(rowId++, columnId).string(i18n.t("Boolean", { lng: this.builder.language }));
        validationSheet.cell(rowId++, columnId).formula("_true");
        validationSheet.cell(rowId++, columnId).formula("_false");
        this.validations.set(
            "BOOLEAN",
            `=Validation!$${Excel.getExcelAlpha(columnId)}$3:$${Excel.getExcelAlpha(columnId)}$${rowId}`
        );

        rowId = 2;
        columnId++;
        validationSheet.cell(rowId++, columnId).string(i18n.t("True only", { lng: this.builder.language }));
        validationSheet.cell(rowId++, columnId).formula("_true");
        this.validations.set(
            "TRUE_ONLY",
            `=Validation!$${Excel.getExcelAlpha(columnId)}$3:$${Excel.getExcelAlpha(columnId)}$${rowId}`
        );

        // Add program title
        validationSheet.cell(1, 1, 1, columnId, true).formula(`_${element.id}`).style(baseStyle);
    }

    private fillMetadataSheet() {
        const { elementMetadata: metadata, organisationUnits } = this.builder;
        const metadataSheet = this.metadataSheet;

        // Freeze and format column titles
        metadataSheet.row(2).freeze();
        metadataSheet.column(1).setWidth(30);
        metadataSheet.column(2).setWidth(30);
        metadataSheet.column(3).setWidth(70);

        // Add column titles
        metadataSheet
            .cell(1, 1, 2, 1, true)
            .string(i18n.t("Identifier", { lng: this.builder.language }))
            .style(baseStyle);
        metadataSheet
            .cell(1, 2, 2, 2, true)
            .string(i18n.t("Type", { lng: this.builder.language }))
            .style(baseStyle);
        metadataSheet
            .cell(1, 3, 2, 3, true)
            .string(i18n.t("Name", { lng: this.builder.language }))
            .style(baseStyle);
        metadataSheet
            .cell(1, 4, 2, 4, true)
            .string(i18n.t("Value Type", { lng: this.builder.language }))
            .style(baseStyle);
        metadataSheet
            .cell(1, 5, 2, 5, true)
            .string(i18n.t("Option Set", { lng: this.builder.language }))
            .style(baseStyle);
        metadataSheet
            .cell(1, 6, 2, 6, true)
            .string(i18n.t("Possible Values", { lng: this.builder.language }))
            .style(baseStyle);
        metadataSheet
            .cell(1, 7, 2, 7, true)
            .string(i18n.t("Metadata version", { lng: this.builder.language }))
            .style(baseStyle);

        let rowId = 3;
        metadata.forEach(item => {
            const { name } = this.translate(item);
            const optionSet = metadata.get(item.optionSet?.id);
            const { name: optionSetName } = this.translate(optionSet);
            const options = _.slice(optionSet?.options ?? [], 0, 25)
                .map(({ id }: any) => this.translate(metadata.get(id)).name)
                .join(", ");
            const isCompulsory = this.isMetadataItemCompulsory(item);
            const dateFormat = dateFormats[item.valueType];
            const nameCellValue = _.compact([
                name,
                isCompulsory ? " *" : "",
                dateFormat ? `\n(${dateFormat})` : "",
            ]).join("");

            metadataSheet.cell(rowId, 1).string(item.id ?? "");
            metadataSheet.cell(rowId, 2).string(item.type ?? "");
            metadataSheet.cell(rowId, 3).string(nameCellValue);
            metadataSheet.cell(rowId, 4).string(item.valueType ?? "");
            metadataSheet.cell(rowId, 5).string(optionSetName ?? "");
            metadataSheet.cell(rowId, 6).string(options ?? "");
            metadataSheet.cell(rowId, 7).string(`${item.version ?? ""}`);

            if (name !== undefined) {
                this.workbook.definedNameCollection.addDefinedName({
                    refFormula: `'Metadata'!$${Excel.getExcelAlpha(3)}$${rowId}`,
                    name: `_${item.id}`,
                });
            }

            rowId++;
        });

        organisationUnits.forEach(orgUnit => {
            const { name } = this.translate(orgUnit);
            metadataSheet.cell(rowId, 1).string(orgUnit.id !== undefined ? orgUnit.id : "");
            metadataSheet.cell(rowId, 2).string("organisationUnit");
            metadataSheet.cell(rowId, 3).string(name ?? "");

            if (name !== undefined)
                this.workbook.definedNameCollection.addDefinedName({
                    refFormula: `'Metadata'!$${Excel.getExcelAlpha(3)}$${rowId}`,
                    name: `_${orgUnit.id}`,
                });

            rowId++;
        });

        const { relationshipTypes } = this.builder.metadata;

        if (relationshipTypes) {
            relationshipTypes.forEach((relationshipType: any) => {
                metadataSheet.cell(rowId, 1).string(relationshipType.id);
                metadataSheet.cell(rowId, 2).string("relationshipType");
                metadataSheet.cell(rowId, 3).string(relationshipType.name);
                this.workbook.definedNameCollection.addDefinedName({
                    refFormula: `'Metadata'!$${Excel.getExcelAlpha(3)}$${rowId}`,
                    name: `_${relationshipType.id}`,
                });
                rowId++;
            });
        }

        metadataSheet.cell(rowId, 1).string("true");
        metadataSheet.cell(rowId, 2).string("boolean");
        metadataSheet.cell(rowId, 3).string(i18n.t("Yes", { lng: this.builder.language }));
        this.workbook.definedNameCollection.addDefinedName({
            refFormula: `'Metadata'!$${Excel.getExcelAlpha(3)}$${rowId}`,
            name: "_true",
        });
        rowId++;

        metadataSheet.cell(rowId, 1).string("false");
        metadataSheet.cell(rowId, 2).string("boolean");
        metadataSheet.cell(rowId, 3).string(i18n.t("No", { lng: this.builder.language }));
        this.workbook.definedNameCollection.addDefinedName({
            refFormula: `'Metadata'!$${Excel.getExcelAlpha(3)}$${rowId}`,
            name: "_false",
        });
        rowId++;
    }

    private isMetadataItemCompulsory(item: any) {
        const { rawMetadata, element } = this.builder;

        const isProgramStageDataElementCompulsory = _.some(
            rawMetadata.programStageDataElements,
            ({ dataElement, compulsory }) => dataElement?.id === item.id && compulsory
        );

        const isTeiAttributeCompulsory = _.some(
            rawMetadata.programTrackedEntityAttributes,
            ({ trackedEntityAttribute, mandatory }) => trackedEntityAttribute?.id === item.id && mandatory
        );

        const isProgram = element.type === "programs";
        const isCategoryComboForProgram = isProgram && item.type === "categoryCombos";

        return isProgramStageDataElementCompulsory || isTeiAttributeCompulsory || isCategoryComboForProgram;
    }

    private fillDataEntrySheet(dataEntrySheet: any, programId: Id) {
        const { element, elementMetadata: metadata, settings } = this.builder;
        const { rowOffset = 0 } = this.builder.template;

        // Add cells for themes
        const sectionRow = rowOffset + 1;
        const itemRow = rowOffset + 2;

        // Hide theme rows by default
        for (let row = 1; row < sectionRow; row++) {
            dataEntrySheet.row(row).hide();
        }

        // Freeze and format column titles
        dataEntrySheet.row(itemRow).freeze();
        dataEntrySheet.row(sectionRow).setHeight(30);
        dataEntrySheet.row(itemRow).setHeight(50);

        // Add template version
        dataEntrySheet
            .cell(1, 1)
            .string(`Version: ${this.getVersion(programId)}`)
            .style(baseStyle);

        // Add column titles
        let columnId = 1;
        let groupId = 0;

        if (element.type === "programs") {
            this.createColumn(dataEntrySheet, itemRow, columnId++, i18n.t("Event id", { lng: this.builder.language }));
        }

        this.createColumn(
            dataEntrySheet,
            itemRow,
            columnId++,
            i18n.t("Org Unit *", { lng: this.builder.language }),
            null,
            this.validations.get("organisationUnits"),
            "This site does not exist in DHIS2, please talk to your administrator to create this site before uploading data"
        );

        this.createColumn(dataEntrySheet, itemRow, columnId++, i18n.t("Latitude", { lng: this.builder.language }));
        this.createColumn(dataEntrySheet, itemRow, columnId++, i18n.t("Longitude", { lng: this.builder.language }));

        const { code: attributeCode } = metadata.get(element.categoryCombo?.id);
        const optionsTitle =
            attributeCode !== "default"
                ? `_${element.categoryCombo.id}`
                : i18n.t("Options", { lng: this.builder.language });

        this.createColumn(dataEntrySheet, itemRow, columnId++, optionsTitle, null, this.validations.get("options"));

        // Add dataSet or program title
        dataEntrySheet
            .cell(sectionRow, 1, sectionRow, columnId - 1, true)
            .formula(`_${element.id}`)
            .style({ ...baseStyle, font: { size: 16, bold: true } });

        _.forEach(this.getProgramStages(), programStageT => {
            const programStage = metadata.get(programStageT.id);

            this.createColumn(
                dataEntrySheet,
                itemRow,
                columnId++,
                `${
                    programStage.executionDateLabel
                        ? i18n.t(programStage.executionDateLabel, {
                              lng: this.builder.language,
                          })
                        : i18n.t("Date", { lng: this.builder.language })
                } *` + dateFormatInfo
            );

            if (programStage.programStageSections.length === 0) {
                programStage.programStageSections.push({
                    dataElements: programStage.programStageDataElements.map((e: any) => e.dataElement),
                    id: programStageT.id,
                });
            }

            _.forEach(programStage.programStageSections, programStageSectionT => {
                const programStageSection = programStageSectionT.dataElements
                    ? programStageSectionT
                    : metadata.get(programStageSectionT.id);
                const firstColumnId = columnId;

                _.forEach(programStageSection.dataElements, dataElementT => {
                    const dataElement = metadata.get(dataElementT.id);
                    if (!dataElement) {
                        console.error(`Data element not found ${dataElementT.id}`);
                        return;
                    }

                    const filter = settings.programStageFilter[programStage.id];
                    const dataElementsExcluded = filter?.dataElementsExcluded ?? [];
                    const isColumnExcluded = _.some(dataElementsExcluded, dataElementExcluded =>
                        _.isEqual(dataElementExcluded, { id: dataElement.id })
                    );
                    if (isColumnExcluded) return;

                    const { name, description } = this.translate(dataElement);

                    const validation = dataElement.optionSet ? dataElement.optionSet.id : dataElement.valueType;
                    this.createColumn(
                        dataEntrySheet,
                        itemRow,
                        columnId,
                        `_${dataElement.id}`,
                        groupId,
                        dataElement.valueType === "ORGANISATION_UNIT"
                            ? this.validations.get("organisationUnits")
                            : this.validations.get(validation)
                    );
                    dataEntrySheet.column(columnId).setWidth(name.length / 2.5 + 10);

                    if (dataElement.url !== undefined) {
                        dataEntrySheet.cell(itemRow, columnId).link(dataElement.url).formula(`=_${dataElement.id}`);
                    }

                    if (description !== undefined) {
                        dataEntrySheet.cell(itemRow, columnId).comment(description, {
                            height: "100pt",
                            width: "160pt",
                        });
                    }

                    columnId++;
                });

                const noColumnAdded = columnId === firstColumnId;
                if (noColumnAdded) return;

                if (firstColumnId < columnId)
                    dataEntrySheet
                        .cell(sectionRow, firstColumnId, sectionRow, columnId - 1, true)
                        .formula(`_${programStageSection.id}`)
                        .style(this.groupStyle(groupId));

                groupId++;
            });
        });
    }

    // Return only program stages for which the current user has permissions to export/import data.
    private getProgramStages() {
        const { element } = this.builder;

        return _(element.programStages)
            .filter(({ access }) => access?.read && access?.data?.read && access?.data?.write)
            .value();
    }

    private translate(item: any) {
        const { elementMetadata, language } = this.builder;
        const translations = item?.translations?.filter(({ locale }: any) => locale === language) ?? [];

        const { value: formName } = translations.find(({ property }: any) => property === "FORM_NAME") ?? {};
        const { value: regularName } = translations.find(({ property }: any) => property === "NAME") ?? {};
        const { value: shortName } = translations.find(({ property }: any) => property === "SHORT_NAME") ?? {};

        const defaultName = item?.displayName ?? item?.formName ?? item?.name;
        const name = formName ?? regularName ?? shortName ?? defaultName;

        const { value: description = item?.description } =
            translations.find(({ property }: any) => property === "DESCRIPTION") ?? {};

        if (item?.type === "categoryOptionCombos" && name === defaultName) {
            const options = item?.categoryOptions?.map(({ id }: any) => {
                const element = elementMetadata.get(id);
                const { name } = this.translate(element);
                return name;
            });

            return { name: options.join(", "), description };
        } else if (
            this.builder.useCodesForMetadata &&
            item?.code &&
            ["organisationUnits", "dataElements", "options", "categoryOptions"].includes(item?.type)
        ) {
            return { name: item.code, description };
        } else {
            return { name, description };
        }
    }

    private createColumn(
        sheet: any,
        rowId: any,
        columnId: any,
        label: any,
        groupId: any = null,
        validation: any = null,
        validationMessage: any = null,
        defaultLabel = false
    ) {
        sheet.column(columnId).setWidth(20);
        const cell = sheet.cell(rowId, columnId);

        if (!defaultLabel) cell.style(groupId !== null ? this.groupStyle(groupId) : baseStyle);
        else {
            cell.style(groupId !== null ? this.groupStyle(groupId) : baseStyle).style(
                this.transparentFontStyle(groupId)
            );
        }

        if (label.startsWith("_")) cell.formula(label);
        else cell.string(label);

        sheet.addDataValidation({
            type: "custom",
            error: "This cell cannot be changed",
            sqref: `${Excel.getExcelAlpha(columnId)}${rowId}`,
            formulas: [`${Excel.getExcelAlpha(columnId)}${rowId} <> ${label}`],
        });

        if (validation !== null) {
            const ref = `${Excel.getExcelAlpha(columnId)}${rowId + 1}:${Excel.getExcelAlpha(columnId)}${maxRow}`;
            sheet.addDataValidation({
                type: "list",
                allowBlank: true,
                error: validationMessage ?? i18n.t("Invalid choice was chosen", { lng: this.builder.language }),
                errorStyle: "warning",
                showDropDown: true,
                sqref: ref,
                formulas: [validation.toString()],
            });

            sheet.addConditionalFormattingRule(ref, {
                type: "expression", // the conditional formatting type
                priority: 1, // rule priority order (required)
                formula: `ISERROR(MATCH(${Excel.getExcelAlpha(columnId)}${rowId + 1},${validation
                    .toString()
                    .substr(1)},0))`, // formula that returns nonzero or 0
                style: this.workbook.createStyle({
                    font: {
                        bold: true,
                        color: "FF0000",
                    },
                }), // a style object containing styles to apply
            });
        }
    }

    private transparentFontStyle(groupId: number) {
        const palette = defaultColorScale;

        return {
            font: {
                color: palette[groupId % palette.length],
            },
        };
    }

    private groupStyle(groupId: number) {
        const palette = defaultColorScale;
        return {
            ...baseStyle,
            fill: {
                type: "pattern",
                patternType: "solid",
                fgColor: palette[groupId % palette.length],
            },
        };
    }
}

/**
 * Common cell style definition
 * @type {{alignment: {horizontal: string, vertical: string, wrapText: boolean, shrinkToFit: boolean}}}
 */
const baseStyle = {
    alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
        shrinkToFit: true,
    },
    fill: {
        type: "pattern",
        patternType: "solid",
        fgColor: "ffffff",
    },
};

const protectedSheet = {
    sheetProtection: {
        sheet: true,
        formatCells: false,
        formatColumns: false,
        formatRows: false,
        password: "Wiscentd2019!",
    },
};

interface D2ObjectWithAttributes {
    attributeValues?: Array<{ value?: string; attribute?: { code?: string } }>;
}

function getObjectVersion(object: D2ObjectWithAttributes): string | null {
    const attributeValues = object.attributeValues || [];
    const versionAttributeValue = attributeValues.find(
        attributeValue => attributeValue.attribute && attributeValue.attribute.code === "VERSION"
    );
    return versionAttributeValue && versionAttributeValue.value ? versionAttributeValue.value.trim() : null;
}
