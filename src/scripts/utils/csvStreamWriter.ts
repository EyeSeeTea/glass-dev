import { createWriteStream, WriteStream } from "node:fs";
import { rename, unlink } from "node:fs/promises";
import { once } from "node:events";

// RFC 4180-style escaping: quote any field containing a comma, quote, CR or LF; double any embedded
// quote. Empty/nullish values become an empty (unquoted) field, never the literal "null"/"undefined".
export function escapeCsvField(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return "";
    const text = String(value);
    if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

export function formatCsvRow(values: (string | number | null | undefined)[]): string {
    return values.map(escapeCsvField).join(",") + "\r\n";
}

const UTF8_BOM = "﻿";

export interface CsvStreamWriterOptions {
    /** Prepend a UTF-8 BOM (Excel-friendliness). Off by default — harmless either way on re-import. */
    bom?: boolean;
}

/**
 * Streams CSV rows to `<finalPath>.partial`, tracking row/byte counts and respecting backpressure.
 * The file only ever appears at `finalPath` after `finalize()` succeeds (fsync + rename) — so a
 * present, non-`.partial` file is itself proof the export completed. A run that fails or is
 * interrupted leaves the `.partial` file behind (via `abort()` or simply never finalizing), never a
 * silently-truncated file masquerading as complete.
 */
export class CsvStreamWriter {
    private stream: WriteStream;
    private readonly partialPath: string;
    private closed = false;
    public rowsWritten = 0;

    constructor(private readonly finalPath: string, headers: string[], options: CsvStreamWriterOptions = {}) {
        this.partialPath = `${finalPath}.partial`;
        this.stream = createWriteStream(this.partialPath, { encoding: "utf8" });
        if (options.bom) this.stream.write(UTF8_BOM);
        this.stream.write(formatCsvRow(headers));
    }

    public get bytesWritten(): number {
        return this.stream.bytesWritten;
    }

    public async writeRow(values: (string | number | null | undefined)[]): Promise<void> {
        if (this.closed) throw new Error(`Cannot write to a closed CsvStreamWriter (${this.finalPath})`);
        const canContinue = this.stream.write(formatCsvRow(values));
        this.rowsWritten++;
        if (!canContinue) {
            await once(this.stream, "drain");
        }
    }

    /** Flushes and closes the stream, then renames `.partial` -> the final path. Call only on full success. */
    public async finalize(): Promise<void> {
        await this.end();
        await rename(this.partialPath, this.finalPath);
    }

    /** Flushes and closes the stream, deliberately leaving the `.partial` file as evidence of a failed/incomplete run. */
    public async abort(): Promise<void> {
        await this.end();
    }

    /** Removes a stray `.partial` file left by a previous failed run (used by resume before retrying a unit). */
    public static async discardPartial(finalPath: string): Promise<void> {
        try {
            await unlink(`${finalPath}.partial`);
        } catch {
            // nothing to discard
        }
    }

    private async end(): Promise<void> {
        if (this.closed) return;
        this.closed = true;
        this.stream.end();
        await once(this.stream, "finish");
    }
}
