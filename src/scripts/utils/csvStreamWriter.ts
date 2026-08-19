import { createWriteStream, WriteStream } from "node:fs";
import { open, rename, unlink } from "node:fs/promises";
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
 * The file only ever appears at `finalPath` after `finalize()` succeeds (fsync, then rename) — so a
 * present, non-`.partial` file is itself proof the export completed. A run that fails or is
 * interrupted leaves the `.partial` file behind (via `abort()` or simply never finalizing), never a
 * silently-truncated file masquerading as complete.
 *
 * Write errors (ENOSPC, EACCES, ...) are captured rather than left to crash the process, and are
 * re-thrown from the next `writeRow()`/`finalize()` call. `finalize()` therefore never promotes a
 * `.partial` file whose writes failed.
 */
export class CsvStreamWriter {
    private stream: WriteStream;
    private readonly partialPath: string;
    private closed = false;
    // A WriteStream emits 'error' asynchronously and at any time — including while no `once()` await
    // is pending (e.g. between two writes that both returned true). With no listener attached, Node
    // treats that as an unhandled 'error' event and tears the process down, which on a long bulk
    // export loses the whole run to a transient ENOSPC/EACCES. We therefore always keep a listener
    // attached, park the first error here, and re-throw it from the next writeRow/finalize/abort so
    // it surfaces as a normal rejection at a point the caller can attribute.
    private streamError: Error | undefined;
    public rowsWritten = 0;

    constructor(private readonly finalPath: string, headers: string[], options: CsvStreamWriterOptions = {}) {
        this.partialPath = `${finalPath}.partial`;
        this.stream = createWriteStream(this.partialPath, { encoding: "utf8" });
        this.stream.on("error", error => {
            this.streamError = this.streamError ?? (error as Error);
        });
        if (options.bom) this.stream.write(UTF8_BOM);
        this.stream.write(formatCsvRow(headers));
    }

    private throwIfStreamFailed(): void {
        if (this.streamError) throw this.streamError;
    }

    public get bytesWritten(): number {
        return this.stream.bytesWritten;
    }

    public async writeRow(values: (string | number | null | undefined)[]): Promise<void> {
        if (this.closed) throw new Error(`Cannot write to a closed CsvStreamWriter (${this.finalPath})`);
        this.throwIfStreamFailed();
        const canContinue = this.stream.write(formatCsvRow(values));
        this.rowsWritten++;
        if (!canContinue) {
            await once(this.stream, "drain");
        }
        this.throwIfStreamFailed();
    }

    /**
     * Flushes and closes the stream, fsyncs the bytes to disk, then renames `.partial` -> the final
     * path. The fsync matters: without it the rename can reach disk before the file contents do, so
     * a crash/power-loss at the wrong moment leaves a full-length file at `finalPath` containing
     * trailing nulls — i.e. exactly the "complete-looking but truncated" artefact the `.partial`
     * scheme exists to prevent. Call only on full success.
     */
    public async finalize(): Promise<void> {
        await this.end();
        this.throwIfStreamFailed();
        const handle = await open(this.partialPath, "r+");
        try {
            await handle.sync();
        } finally {
            await handle.close();
        }
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
        // A stream that has already errored is destroyed and will never emit 'finish', so awaiting
        // it would hang the caller forever rather than surfacing the failure.
        if (this.streamError) return;
        this.stream.end();
        try {
            await once(this.stream, "finish");
        } catch (error) {
            // 'error' raced 'finish'. Record it (if it is not already recorded) and let
            // throwIfStreamFailed report it; abort() intentionally stays quiet.
            this.streamError = this.streamError ?? (error as Error);
        }
    }
}
