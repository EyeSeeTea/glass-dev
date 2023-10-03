//@ts-ignore
import * as Excel from "excel4node";
import i18n from "@eyeseetea/d2-ui-components/locales";
import _ from "lodash";
import "lodash.product";
import { defaultColorScale } from "./utils/colors";
import { GeneratedTemplate } from "../../../domain/entities/Template";

const maxRow = 1048576;

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

export class SheetBuilder {
    private workbook: any;
    private validations: any;

    private legendSheet: any;
    private validationSheet: any;
    private metadataSheet: any;

    constructor(private builder: SheetBuilderParams) {
        this.workbook = new Excel.Workbook();
        this.validations = new Map();
    }

    public generate() {
        const dataEntrySheetsInfo: Array<{ sheet: any }> = [];

        const dataEntrySheet = this.workbook.addWorksheet("Data Entry");
        dataEntrySheetsInfo.push({ sheet: dataEntrySheet });

        this.legendSheet = this.workbook.addWorksheet("Legend", protectedSheet);
        this.validationSheet = this.workbook.addWorksheet("Validation", protectedSheet);
        this.metadataSheet = this.workbook.addWorksheet("Metadata", protectedSheet);

        this.fillValidationSheet();
        this.fillMetadataSheet();
        this.fillLegendSheet();

        dataEntrySheetsInfo.forEach(({ sheet }) => {
            this.fillDataEntrySheet(sheet);
        });

        return this.workbook;
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

    private getVersion() {
        const { element } = this.builder;
        const templateId = "PROGRAM_GENERATED_v4";
        return getObjectVersion(element) ?? templateId;
    }

    private fillDataEntrySheet(dataEntrySheet: any) {
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
        dataEntrySheet.cell(1, 1).string(`Version: ${this.getVersion()}`).style(baseStyle);

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
