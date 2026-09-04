import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CsvStreamWriter, escapeCsvField, formatCsvRow } from "../csvStreamWriter";

describe("escapeCsvField", () => {
    it("leaves a plain value untouched", () => {
        expect(escapeCsvField("BLOOD")).toBe("BLOOD");
    });

    it("renders numbers without quoting", () => {
        expect(escapeCsvField(0)).toBe("0");
        expect(escapeCsvField(45574.5)).toBe("45574.5");
    });

    it("returns an empty field for null/undefined rather than the literal 'null'/'undefined'", () => {
        expect(escapeCsvField(null)).toBe("");
        expect(escapeCsvField(undefined)).toBe("");
    });

    it("does not quote an already-empty string", () => {
        expect(escapeCsvField("")).toBe("");
    });

    it("quotes a value containing a comma", () => {
        expect(escapeCsvField("Escherichia coli, resistant")).toBe('"Escherichia coli, resistant"');
    });

    it("quotes and doubles embedded quotes (RFC 4180)", () => {
        expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    });

    it("quotes values containing CR or LF so the row is not split on re-import", () => {
        expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
        expect(escapeCsvField("line1\r\nline2")).toBe('"line1\r\nline2"');
    });

    it("quotes a value that is only a quote character", () => {
        expect(escapeCsvField('"')).toBe('""""');
    });
});

describe("formatCsvRow", () => {
    it("joins fields with commas and terminates with CRLF", () => {
        expect(formatCsvRow(["COUNTRY", "YEAR"])).toBe("COUNTRY,YEAR\r\n");
    });

    it("escapes each field independently", () => {
        expect(formatCsvRow(["a,b", 'c"d', null])).toBe('"a,b","c""d",\r\n');
    });

    it("preserves empty trailing fields", () => {
        expect(formatCsvRow(["a", "", ""])).toBe("a,,\r\n");
    });
});

describe("CsvStreamWriter", () => {
    let dir: string;

    beforeEach(async () => {
        dir = await mkdtemp(join(tmpdir(), "csv-stream-writer-"));
    });

    afterEach(async () => {
        await rm(dir, { recursive: true, force: true });
    });

    it("writes to <path>.partial and only promotes to the final path on finalize", async () => {
        const finalPath = join(dir, "export.csv");
        const writer = new CsvStreamWriter(finalPath, ["COUNTRY", "YEAR"]);

        await writer.writeRow(["ESP", 2024]);

        // Before finalize the real path must not exist — a present file means "complete".
        // (The .partial file's existence is asserted in the abort test instead: createWriteStream
        // opens the file lazily, so checking for it mid-write would be a race, not a guarantee.)
        expect(existsSync(finalPath)).toBe(false);

        await writer.finalize();

        expect(existsSync(finalPath)).toBe(true);
        expect(existsSync(`${finalPath}.partial`)).toBe(false);
        expect(readFileSync(finalPath, "utf8")).toBe("COUNTRY,YEAR\r\nESP,2024\r\n");
    });

    it("leaves the .partial file behind on abort and never creates the final path", async () => {
        const finalPath = join(dir, "aborted.csv");
        const writer = new CsvStreamWriter(finalPath, ["COUNTRY"]);
        await writer.writeRow(["ESP"]);

        await writer.abort();

        expect(existsSync(finalPath)).toBe(false);
        expect(existsSync(`${finalPath}.partial`)).toBe(true);
    });

    it("counts written rows without counting the header", async () => {
        const finalPath = join(dir, "counted.csv");
        const writer = new CsvStreamWriter(finalPath, ["COUNTRY"]);

        expect(writer.rowsWritten).toBe(0);
        await writer.writeRow(["ESP"]);
        await writer.writeRow(["FRA"]);
        await writer.finalize();

        expect(writer.rowsWritten).toBe(2);
    });

    it("rejects writes after the stream is closed", async () => {
        const finalPath = join(dir, "closed.csv");
        const writer = new CsvStreamWriter(finalPath, ["COUNTRY"]);
        await writer.finalize();

        await expect(writer.writeRow(["ESP"])).rejects.toThrow(/closed CsvStreamWriter/);
    });

    it("escapes row content on the way to disk", async () => {
        const finalPath = join(dir, "escaped.csv");
        const writer = new CsvStreamWriter(finalPath, ["NAME", "NOTE"]);

        await writer.writeRow(['E. coli, "resistant"', null]);
        await writer.finalize();

        expect(readFileSync(finalPath, "utf8")).toBe('NAME,NOTE\r\n"E. coli, ""resistant""",\r\n');
    });

    it("prepends a UTF-8 BOM only when asked", async () => {
        const withBom = join(dir, "bom.csv");
        const withoutBom = join(dir, "no-bom.csv");

        const a = new CsvStreamWriter(withBom, ["COUNTRY"], { bom: true });
        await a.finalize();
        const b = new CsvStreamWriter(withoutBom, ["COUNTRY"]);
        await b.finalize();

        expect(readFileSync(withBom, "utf8").startsWith("﻿")).toBe(true);
        expect(readFileSync(withoutBom, "utf8").startsWith("﻿")).toBe(false);
    });

    it("discardPartial removes a stray .partial and is a no-op when there is none", async () => {
        const finalPath = join(dir, "stray.csv");
        const writer = new CsvStreamWriter(finalPath, ["COUNTRY"]);
        await writer.abort();
        expect(existsSync(`${finalPath}.partial`)).toBe(true);

        await CsvStreamWriter.discardPartial(finalPath);
        expect(existsSync(`${finalPath}.partial`)).toBe(false);

        // Second call must not throw even though there is nothing left to remove.
        await expect(CsvStreamWriter.discardPartial(finalPath)).resolves.toBeUndefined();
    });

    it("surfaces a write failure instead of promoting a corrupt file", async () => {
        // A directory that does not exist makes createWriteStream emit 'error' asynchronously.
        const finalPath = join(dir, "missing-subdir", "broken.csv");
        const writer = new CsvStreamWriter(finalPath, ["COUNTRY"]);

        // The failure must reach the caller as a rejection (not an unhandled 'error' event that
        // would tear down the whole export process), and no final file may appear.
        await expect(
            (async () => {
                await writer.writeRow(["ESP"]);
                await writer.finalize();
            })()
        ).rejects.toThrow(/ENOENT/);

        expect(existsSync(finalPath)).toBe(false);
    });
});
