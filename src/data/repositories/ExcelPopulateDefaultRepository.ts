import _ from "lodash";
import { Sheet } from "../../domain/entities/Sheet";
import { ExcelRepository, ExcelValue, ReadCellOptions } from "../../domain/repositories/ExcelRepository";
import XLSX, {
    Cell,
    Cell as ExcelCell,
    FormulaError,
    Workbook as ExcelWorkbook,
    Workbook,
} from "@eyeseetea/xlsx-populate";
import XlsxPopulate from "@eyeseetea/xlsx-populate";
import { CellRef, Range, SheetRef, ValueRef } from "../../domain/entities/Template";
import moment from "moment";
import { Future, FutureData } from "../../domain/entities/Future";
import { Id } from "../../domain/entities/Ref";
import { AMC_PRODUCT_REGISTER_PROGRAM_ID } from "../../domain/usecases/data-entry/amc/ImportAMCProductLevelData";
import { EGASP_PROGRAM_ID } from "./program-rule/ProgramRulesMetadataDefaultRepository";
import {
    AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID,
    AMC_SUBSTANCE_CALCULATED_CONSUMPTION_PROGRAM_ID,
} from "../../domain/usecases/data-entry/amc/ImportAMCSubstanceLevelData";
import { removeCharacters } from "./utils/string";
import i18n from "../../locales";

type RowWithCells = XLSX.Row & { _cells: XLSX.Cell[] };

export const getTemplateId = (programId: Id): string => {
    switch (programId) {
        case AMC_PRODUCT_REGISTER_PROGRAM_ID:
            return "TRACKER_PROGRAM_GENERATED_v3";
        case EGASP_PROGRAM_ID:
        case AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID:
        case AMC_SUBSTANCE_CALCULATED_CONSUMPTION_PROGRAM_ID:
            return "PROGRAM_GENERATED_v4";
        default:
            return "";
    }
};

export class ExcelPopulateDefaultRepository extends ExcelRepository {
    private workbooks: Record<string, ExcelWorkbook> = {};

    /* public loadTemplate(file: Blob, programId: Id): FutureData<string> {
         const templateId = getTemplateId(programId);
         console.log("programId:", programId);
         console.log("Loading template for program ID:", programId, "with template ID:", templateId);
         return Future.fromPromise(this.parseFile(file)).map(workbook => {
             console.log("Template loaded successfully for program ID:", programId);
             const id = templateId;
             this.workbooks[id] = workbook;
             return id;
         });
     }*/

    public loadTemplate(file: Blob, programId: Id): FutureData<string> {
        const templateId = getTemplateId(programId);

        // Wrap parseFile with detailed catch
        const p = this.parseFile(file).catch(async (e: any) => {
            let extra = "";
            try {
                const size = (file as any).size;
                const type = (file as any).type;
                const name = (file as any).name;
                extra = ` [programId=${programId}, templateId=${templateId}, name=${name}, type=${type}, size=${size}]`;
            } catch {
                // If we can't access file properties, we can still log the error without them
            }
            // Log the original error with stack
            console.error("parseFile() failed" + extra, e?.message || e, e?.stack || e);
            // Re-throw preserving original error as cause (TS target >= ES2022)
            throw new Error(`loadTemplate(): failed to parse file${extra}`, { cause: e });
        });

        return Future.fromPromise(p).map(workbook => {
            const id = templateId;
            this.workbooks[id] = workbook;
            return id;
        });
    }

    public loadTemplateFromArrayBuffer(buffer: ArrayBuffer, programId: Id): FutureData<string> {
        const templateId = getTemplateId(programId);
        return Future.fromPromise(this.parseFromArrayBuffer(buffer)).map(workbook => {
            const id = templateId;
            this.workbooks[id] = workbook;
            return id;
        });
    }

    /* public async toBlob(id: string): Promise<Blob> {
         const data = await this.toBuffer(id);
         return new Blob([data], {
             type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
         });
     }*/

    public async toBlob(id: string): Promise<Blob> {
        const data = await this.toBuffer(id); // Buffer or Uint8Array

        // Produce a real ArrayBuffer slice with the exact bytes
        const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;

        return new Blob([arrayBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
    }

    public async toBuffer(id: string): Promise<Buffer> {
        const workbook = await this.getWorkbook(id);
        return workbook.outputAsync() as unknown as Buffer;
    }

    /*private async parseFile(file: Blob): Promise<ExcelWorkbook> {
        console.log("Parsing Excel file...");
        return XLSX.fromDataAsync(file);
    }*/

    private async parseWorkbookFromBlob(file: Blob | File): Promise<ExcelWorkbook> {
        console.log("[parseWorkbookFromBlob] Parsing Excel file...");

        // Log the input meta so we can spot native/polyfill mixes
        const meta = {
            ctor: (file as any)?.constructor?.name,
            name: (file as any)?.name,
            type: (file as any)?.type,
            size: (file as any)?.size,
        };
        console.log("[parseWorkbookFromBlob] input meta:", meta);

        try {
            if (!file || typeof (file as any).arrayBuffer !== "function") {
                console.error("[parseWorkbookFromBlob] Input is not a Blob/File with arrayBuffer().");
                throw new Error("Invalid input: expected Blob/File with arrayBuffer()");
            }

            // Convert to bytes first (avoid handing Blob directly to the parser)
            const ab = await file.arrayBuffer();
            const bytes = new Uint8Array(ab);

            // Quick diagnostics
            const head16 = bytes.subarray(0, 16);
            const headHex = Array.from(head16)
                .map(b => b.toString(16).padStart(2, "0"))
                .join(" ");
            const magic = Array.from(bytes.subarray(0, 4))
                .map(b => b.toString(16).padStart(2, "0"))
                .join(" ");
            console.log("[parseWorkbookFromBlob] bytes length:", bytes.byteLength);
            console.log("[parseWorkbookFromBlob] first 16 bytes (hex):", headHex);
            console.log('[parseWorkbookFromBlob] expected XLSX ZIP magic "50 4b 03 04", got:', magic);

            console.log("[parseWorkbookFromBlob] calling XlsxPopulate.fromDataAsync(bytes)...");
            const workbook = await XlsxPopulate.fromDataAsync(bytes);
            console.log("[parseWorkbookFromBlob] workbook loaded OK.");

            // Optional: try to log sheet names
            try {
                // @ts-ignore depends on typing
                const sheetNames = workbook.sheets ? workbook.sheets().map((s: any) => s.name()) : [];
                console.log("[parseWorkbookFromBlob] sheets:", sheetNames);
            } catch {
                console.warn(
                    "[parseWorkbookFromBlob] unable to read sheet names, workbook structure may be unexpected."
                );
            }

            return workbook as unknown as ExcelWorkbook;
        } catch (err: any) {
            console.error("[parseWorkbookFromBlob] FAILED", {
                ...meta,
                message: err?.message ?? err,
                stack: err?.stack ?? err,
            });
            throw err;
        }
    }

    private async parseFile(file: Blob | File): Promise<ExcelWorkbook> {
        return this.parseWorkbookFromBlob(file);
    }

    private async parseFromArrayBuffer(buffer: ArrayBuffer): Promise<ExcelWorkbook> {
        return XLSX.fromDataAsync(buffer);
    }

    public async findRelativeCell(id: string, location?: SheetRef, cellRef?: CellRef): Promise<CellRef | undefined> {
        const workbook = await this.getWorkbook(id);

        if (location?.type === "cell") {
            const destination = workbook.sheet(location.sheet)?.cell(location.ref);
            if (!destination) return undefined;
            return { type: "cell", sheet: destination.sheet().name(), ref: destination.address() };
        } else if (location && cellRef) {
            const cell = workbook.sheet(cellRef.sheet).cell(cellRef.ref);
            const row = location.type === "row" ? location.ref : cell.rowNumber();
            const column = location.type === "column" ? location.ref : cell.columnName();
            const destination = workbook.sheet(location.sheet).cell(row, column);
            return { type: "cell", sheet: destination.sheet().name(), ref: destination.address() };
        }
    }

    public async writeCell(id: string, cellRef: CellRef, value: string | number | boolean): Promise<void> {
        const workbook = await this.getWorkbook(id);
        const mergedCells = this.listMergedCells(workbook, cellRef.sheet);
        const definedNames = await this.listDefinedNames(id);
        const definedName = definedNames.find(name => removeCharacters(name) === removeCharacters(value));

        const cell = workbook.sheet(cellRef.sheet)?.cell(cellRef.ref);
        if (!cell) return;

        const { startCell: destination = cell } = mergedCells.find(range => range.hasCell(cell)) ?? {};

        if (!!value && !isNaN(Number(value))) {
            destination.value(Number(value));
        } else if (String(value).startsWith("=")) {
            destination.formula(String(value));
        } else if (definedName) {
            destination.formula(`=${definedName}`);
        } else {
            destination.value(value);
        }
    }

    public async readCell(
        id: string,
        cellRef?: CellRef | ValueRef,
        options?: ReadCellOptions
    ): Promise<ExcelValue | undefined> {
        if (!cellRef) return undefined;
        if (cellRef.type === "value") return cellRef.id;

        const workbook = await this.getWorkbook(id);
        return this.readCellValue(workbook, cellRef, options?.formula);
    }

    public async getSheets(id: string): Promise<Sheet[]> {
        const workbook = await this.getWorkbook(id);

        return workbook.sheets().map((sheet, index) => {
            return {
                index,
                name: sheet.name(),
                active: sheet.active(),
            };
        });
    }

    private async readCellValue(
        workbook: Workbook,
        cellRef: CellRef,
        formula = false
    ): Promise<ExcelValue | undefined> {
        const mergedCells = this.listMergedCells(workbook, cellRef.sheet);
        const sheet = workbook.sheet(cellRef.sheet);
        const cell = sheet.cell(cellRef.ref);
        const { startCell: destination = cell } = mergedCells.find(range => range.hasCell(cell)) ?? {};

        const getFormulaValue = () => getFormulaWithValidation(workbook, sheet as SheetWithValidations, destination);

        const formulaValue = getFormulaValue();
        const textValue = getValue(destination);
        const value = formula ? formulaValue : textValue ?? formulaValue;

        if (value instanceof FormulaError) return "";

        if (isTimeFormat(destination.style("numberFormat"))) {
            const date = moment(XLSX.numberToDate(value));
            if (date.isValid()) return date.format("HH:mm");
        } else if (isDateFormat(destination.style("numberFormat"))) {
            const date = moment(XLSX.numberToDate(value));
            if (date.isValid()) return XLSX.numberToDate(value);
        }

        return value;
    }

    public async getCellsInRange(id: string, range: Range): Promise<CellRef[]> {
        const workbook = await this.getWorkbook(id);

        const { sheet, columnStart, rowStart, columnEnd, rowEnd } = range;

        const rangeColumnEnd = columnEnd ?? (await this.getSheetFinalColumn(id, range.sheet)) ?? "XFD";
        const rangeRowEnd = rowEnd ?? (await this.getSheetRowsCount(id, range.sheet)) ?? 1048576;

        if (rangeRowEnd < rowStart) return [];

        const rangeCells = workbook.sheet(sheet).range(rowStart, columnStart, rangeRowEnd, rangeColumnEnd);

        return _.flatten(rangeCells.cells()).map(cell => ({
            type: "cell",
            sheet,
            ref: cell.address(),
        }));
    }

    public async getSheetRowsCount(id: string, sheetId: string | number): Promise<number | undefined> {
        const workbook = await this.getWorkbook(id);
        const sheet = workbook.sheet(sheetId);
        if (!sheet) return;

        const lastRowWithValues = _(sheet._rows)
            .compact()
            .dropRightWhile(row =>
                _((row as RowWithCells)._cells)
                    .compact()
                    .every(c => c.value() === undefined)
            )
            .last();

        return lastRowWithValues ? lastRowWithValues.rowNumber() : 0;
    }

    public async getSheetFinalColumn(id: string, sheetId: string | number): Promise<string | undefined> {
        const workbook = await this.getWorkbook(id);
        const sheet = workbook.sheet(sheetId);
        if (!sheet) return;

        const maxColumn = _(sheet._rows)
            .take(1000)
            .compact()
            //@ts-ignore
            .map(row => row.maxUsedColumnNumber())
            .max();

        return this.buildColumnName(maxColumn ?? 0);
    }
    public buildColumnName(column: number | string): string {
        if (typeof column === "string") return column;

        let dividend = column;
        let name = "";
        let modulo = 0;

        while (dividend > 0) {
            modulo = (dividend - 1) % 26;
            name = String.fromCharCode("A".charCodeAt(0) + modulo) + name;
            dividend = Math.floor((dividend - modulo) / 26);
        }

        return name;
    }

    public buildRowNumber(row: string): number {
        const rowNumber = row.match(/\d+/g);
        return rowNumber ? parseInt(rowNumber[0] ?? "0") : 0;
    }

    private listMergedCells(workbook: Workbook, sheet: string | number): MergedCell[] {
        return workbook
            .sheet(sheet)
            ?.merged()
            .map(range => {
                const startCell = range.startCell();
                const hasCell = (cell: ExcelCell) => range.cells()[0]?.includes(cell);

                return { range, startCell, hasCell };
            });
    }

    private async getWorkbook(id: string) {
        const workbook = this.workbooks[id];
        if (!workbook) throw new Error(i18n.t("Template {{id}} not loaded", { id }));

        return workbook;
    }

    public async listDefinedNames(id: string): Promise<string[]> {
        const workbook = await this.getWorkbook(id);
        try {
            return workbook.definedName();
        } catch (error) {
            return [];
        }
    }
}

interface SheetWithValidations extends XLSX.Sheet {
    _dataValidations: Record<string, unknown>;
    dataValidation(address: string): false | { type: string; formula1: string };
}

/* Get formula of associated cell (through data valudation). Basic implementation. No caching */
function getFormulaWithValidation(workbook: XLSX.Workbook, sheet: SheetWithValidations, cell: XLSX.Cell) {
    try {
        return _getFormulaWithValidation(workbook, sheet, cell);
    } catch (err) {
        console.error(err);
        return undefined;
    }
}

function _getFormulaWithValidation(workbook: XLSX.Workbook, sheet: SheetWithValidations, cell: XLSX.Cell) {
    // Formulas some times return the = prefix, which the called does not expect. Force the removal.
    const defaultValue = cell.formula()?.replace(/^=/, "");
    const value = getValue(cell);
    if (defaultValue || !value) return defaultValue;

    // Support only for data validations over ranges
    const addressMatch = _(sheet._dataValidations)
        .keys()
        .find(validationKey => {
            const validations = validationKey.split(" ").map(address => {
                if (address.includes(":")) {
                    const range = sheet.range(address);
                    const rowStart = range.startCell().rowNumber();
                    const columnStart = range.startCell().columnNumber();
                    const rowEnd = range.endCell().rowNumber();
                    const columnEnd = range.endCell().columnNumber();
                    const isCellInRange =
                        cell.columnNumber() >= columnStart &&
                        cell.columnNumber() <= columnEnd &&
                        cell.rowNumber() >= rowStart &&
                        cell.rowNumber() <= rowEnd;

                    return isCellInRange;
                } else {
                    return cell.address() === address;
                }
            });

            return _.some(validations, value => value === true);
        });

    if (!addressMatch) return defaultValue;

    const validation = sheet.dataValidation(addressMatch);
    if (!validation || validation.type !== "list" || !validation.formula1) return defaultValue;

    const [sheetName, rangeAddress] = validation.formula1.replace(/^=/, "").split("!", 2);
    const validationSheet = sheetName ? workbook.sheet(sheetName.replace(/^'/, "").replace(/'$/, "")) : sheet;

    if (!validationSheet || !rangeAddress) return defaultValue;
    const validationRange = validationSheet.range(rangeAddress);

    const formulaByValue = _(validationRange.cells())
        .map(cells => cells[0])
        .map(cell => [getValue(cell), cell.formula()])
        .fromPairs()
        .value();

    return formulaByValue[String(value)] || defaultValue;
}

function getValue(cell: Cell): ExcelValue | undefined {
    const value = cell.value();

    //@ts-ignore This should be improved on xlsx-populate
    if (typeof value === "object" && _.isFunction(value.text)) {
        // @ts-ignore This should be improved on xlsx-populate
        const result = value.text();

        // FIXME: There's an error with RichText.text()
        if (result === "undefined") return undefined;
        return result;
    }

    return value;
}

type MergedCell = {
    range: XLSX.Range;
    startCell: XLSX.Cell;
    hasCell: (cell: ExcelCell) => boolean | undefined;
};

export function isDateFormat(format: string) {
    return (
        format
            .replace(/\[[^\]]*]/g, "")
            .replace(/"[^"]*"/g, "")
            .match(/[ymdhMsb]+/) !== null
    );
}

export function isTimeFormat(format: string) {
    const cleanFormat = format
        .replace(/\[[^\]]*]/g, "")
        .replace(/"[^"]*"/g, "")
        .replace(/[AM]|[PM]/g, "")
        .replace(/\\|\/|\s/g, "");

    const isDate = cleanFormat.match(/[ymdhMsb]+/) !== null;
    const isTime = _.every(cleanFormat, token => ["h", "m", "s", ":"].includes(token));

    return isDate && isTime;
}
