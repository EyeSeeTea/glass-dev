import { CellRef, Range, SheetRef, ValueRef } from "../entities/Template";
import { Sheet } from "../entities/Sheet";
import { FutureData } from "../entities/Future";

export type ExcelValue = string | number | boolean | Date;

export interface ReadCellOptions {
    formula?: boolean;
}

export abstract class ExcelRepository {
    public abstract loadTemplate(file: File): FutureData<string>;
    public abstract findRelativeCell(id: string, location?: SheetRef, cell?: CellRef): Promise<CellRef | undefined>;
    public abstract readCell(
        id: string,
        cellRef?: CellRef | ValueRef,
        options?: ReadCellOptions
    ): Promise<ExcelValue | undefined>;
    public abstract getCellsInRange(id: string, range: Range): Promise<CellRef[]>;
    public abstract getSheets(id: string): Promise<Sheet[]>;
    public abstract listDefinedNames(id: string): Promise<string[]>;
    public abstract buildRowNumber(row: string): number;
}
