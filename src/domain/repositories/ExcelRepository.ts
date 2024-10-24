import { CellRef, Range, SheetRef, ValueRef } from "../entities/Template";
import { Sheet } from "../entities/Sheet";
import { FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";

export type ExcelValue = string | number | boolean | Date;

export interface ReadCellOptions {
    formula?: boolean;
}

export abstract class ExcelRepository {
    public abstract loadTemplate(file: Blob, programId: Id): FutureData<string>;
    public abstract loadTemplateFromArrayBuffer(buffer: ArrayBuffer, programId: Id): FutureData<string>;
    public abstract toBlob(id: string): Promise<Blob>;
    public abstract findRelativeCell(id: string, location?: SheetRef, cell?: CellRef): Promise<CellRef | undefined>;
    public abstract writeCell(id: string, cellRef: CellRef, value: ExcelValue): Promise<void>;
    public abstract readCell(
        id: string,
        cellRef?: CellRef | ValueRef,
        options?: ReadCellOptions
    ): Promise<ExcelValue | undefined>;
    public abstract getCellsInRange(id: string, range: Range): Promise<CellRef[]>;
    public abstract getSheets(id: string): Promise<Sheet[]>;
    public abstract listDefinedNames(id: string): Promise<string[]>;
    public abstract buildRowNumber(row: string): number;
    public abstract getSheetRowsCount(id: string, sheetId: string | number): Promise<number | undefined>;
    public abstract toBuffer(id: string): Promise<Buffer>;
}
